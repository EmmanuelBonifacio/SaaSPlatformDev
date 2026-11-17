// =============================================================================
// src/services/api.ts
// =============================================================================
// O QUE FAZ:
//   Cria e configura a instância global do Axios — o cliente HTTP que toda
//   a aplicação usa para se comunicar com o Backend Node.js/Fastify.
//
// POR QUE AXIOS E NÃO FETCH NATIVO?
//   O Axios oferece vantagens importantes para este projeto:
//   1. Interceptadores (interceptors): lógica centralizada para adicionar
//      o JWT em TODA requisição sem repetir código em cada service.
//   2. Tratamento de erro automático: qualquer status >= 400 lança exceção.
//   3. JSON automático: serializa/desserializa JSON sem necessidade de
//      `.json()` manual como no fetch.
//   4. Cancelamento: facilita cancelar requisições em andamento.
//
// FLUXO DE CADA REQUISIÇÃO:
//   1. Service chama `api.get('/estoque/produtos')`
//   2. Interceptador 'request' adiciona: `Authorization: Bearer <token>`
//   3. Axios envia a requisição para o Backend
//   4. Se 200-299: interceptador 'response' retorna os dados
//   5. Se 401: interceptador tenta refresh do token ou redireciona para login
//   6. Se outro erro: lança ApiError para o componente tratar
//
// ONDE O TOKEN É ARMAZENADO?
//   Em localStorage com a chave '@saas/token'. Alternativa mais segura
//   em produção: cookie httpOnly (imune a XSS), mas requer configuração
//   de servidor. Para este estudo, localStorage é mais simples e didático.
// =============================================================================

import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import type { ApiError } from "@/types/api";
import { decodeJwt } from "@/lib/utils";
import type { JwtPayload } from "@/types/api";

// Chave usada para armazenar o JWT no localStorage do browser.
// Prefixo '@saas/' evita colisão com outras libs que possam usar 'token'.
export const TOKEN_KEY = "@saas/token";
export const REFRESH_TOKEN_KEY = "@saas/refresh-token";
export const TENANT_SLUG_KEY = "@saas/tenant-slug";
export const ADMIN_TOKEN_KEY = "@saas/admin-token";
/** Marca no sessionStorage: layout/interceptor acabou de forçar reauth. */
export const AUTH_REAUTH_KEY = "@saas/auth-reauth";

// =============================================================================
// CRIAÇÃO DA INSTÂNCIA AXIOS
// =============================================================================
// `baseURL` é a URL raiz do Backend — todas as chamadas partem daqui.
// Ex: apiInstance.get('/estoque/produtos') → GET /backend/estoque/produtos
// =============================================================================
const apiInstance: AxiosInstance = axios.create({
  // Preferir `/backend` (rewrite do Next) para o browser falar com a mesma
  // origem — funciona em localhost e em port-forward/preview remoto.
  // NUNCA use http://127.0.0.1:3000 aqui: o browser do preview não alcança a VM.
  baseURL: (process.env.NEXT_PUBLIC_API_URL || "/backend").replace(/\/$/, ""),

  // Timeout de 15 segundos: se o Backend não responder, lança erro.
  // Evita que a aplicação "trave" esperando infinitamente.
  timeout: 15_000,

  // Necessário para que cookies e o header Authorization sejam enviados
  // em requisições cross-origin (exigido pelo credentials: true no backend).
  withCredentials: true,

  headers: {
    "Content-Type": "application/json",
    // O Accept diz ao servidor que esperamos JSON de volta:
    Accept: "application/json",
  },
});

// =============================================================================
// INTERCEPTADOR DE REQUISIÇÃO (Request Interceptor)
// =============================================================================
// O QUE FAZ:
//   Antes de CADA requisição sair do browser, este interceptador:
//   1. Se o body for FormData, REMOVE Content-Type para o browser definir
//      multipart/form-data com boundary (o default application/json da
//      instância quebrava uploads no Fastify → 400 "Nenhum arquivo enviado").
//   2. Lê o JWT do localStorage
//   3. Se encontrar, adiciona ao header Authorization
//   4. Passa a requisição adiante
//
// POR QUE AQUI E NÃO EM CADA CHAMADA?
//   DRY (Don't Repeat Yourself). Se você tivesse 50 chamadas de API e
//   precisasse mudar onde o token é guardado, teria 50 lugares para alterar.
//   Aqui, muda em 1 lugar e todos os services se beneficiam.
// =============================================================================
apiInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      const headers = config.headers;
      if (headers && typeof headers === "object") {
        if (
          "delete" in headers &&
          typeof (headers as { delete: (name: string) => void }).delete ===
            "function"
        ) {
          (headers as { delete: (name: string) => void }).delete(
            "Content-Type",
          );
        } else {
          for (const key of Object.keys(headers as Record<string, unknown>)) {
            if (key.toLowerCase() === "content-type") {
              delete (headers as Record<string, unknown>)[key];
            }
          }
        }
      }
    }
    if (typeof window !== "undefined") {
      // Rotas do painel admin usam o token de superadmin (ADMIN_TOKEN_KEY).
      // Todas as outras rotas usam o token de tenant (TOKEN_KEY).
      // Isso evita que o login de superadmin sobrescreva o JWT do tenant.
      const isAdminRoute = config.url?.startsWith("/admin");
      const tokenKey = isAdminRoute ? ADMIN_TOKEN_KEY : TOKEN_KEY;
      const token = localStorage.getItem(tokenKey);
      if (token) {
        if (!isAdminRoute) {
          const payload = decodeJwt<JwtPayload>(token);
          if (payload?.tenantId) {
            config.headers["X-Tenant-Id"] = payload.tenantId;
          }
        }
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// =============================================================================
// INTERCEPTADOR DE RESPOSTA (Response Interceptor)
// =============================================================================
// O QUE FAZ:
//   Após CADA resposta chegar do Backend, este interceptador:
//   - Sucesso (2xx): passa os dados adiante sem modificação
//   - Erro 401: remove o token inválido e redireciona para login
//   - Outros erros: formata e relança a exceção de forma padronizada
//
// POR QUE TRATAR 401 AQUI?
//   401 (Unauthorized) significa que o JWT expirou ou é inválido.
//   O comportamento correto é limpar o token e mandar o usuário fazer login.
//   Sem este tratamento, o usuário ficaria em um loop de 401s sem saber o que fazer.
// =============================================================================
let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshTenantSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const slug = localStorage.getItem(TENANT_SLUG_KEY);
  if (!refreshToken || !slug) return false;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        // Instância sem interceptors — evita loop 401 → refresh → 401.
        const { data } = await axios.post<{
          access_token: string;
          refresh_token: string;
        }>(
          `${apiInstance.defaults.baseURL}/auth/refresh`,
          { refresh_token: refreshToken, slug },
          {
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            timeout: 15_000,
            withCredentials: true,
          },
        );
        localStorage.setItem(TOKEN_KEY, data.access_token);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

function forceTenantReauth(): void {
  const slug = localStorage.getItem(TENANT_SLUG_KEY);
  const onLogin =
    typeof window !== "undefined" && /\/login\/?(\?|$)/.test(window.location.pathname);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  try {
    sessionStorage.setItem(AUTH_REAUTH_KEY, String(Date.now()));
  } catch {
    // ignore
  }
  // Já na tela de login: não recarregar (evita loop com ?reauth=1).
  if (onLogin) return;
  const loginPath = slug ? `/${slug}/login?reauth=1` : "/";
  window.location.replace(loginPath);
}

apiInstance.interceptors.response.use(
  (response) => response,

  async (error: AxiosError<ApiError>) => {
    const status = error.response?.status;
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const url = original?.url ?? "";

    if (status === 401 && typeof window !== "undefined") {
      const isAuthEndpoint =
        url === "/auth/login" ||
        url === "/auth/logout" ||
        url === "/auth/refresh" ||
        url === "/admin/login";

      if (!isAuthEndpoint) {
        const isAdminRoute = url.startsWith("/admin");

        if (isAdminRoute) {
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          window.location.replace("/admin/login");
        } else if (original && !original._retry) {
          original._retry = true;
          const refreshed = await tryRefreshTenantSession();
          if (refreshed) {
            const token = localStorage.getItem(TOKEN_KEY);
            if (token) {
              original.headers = original.headers ?? {};
              original.headers.Authorization = `Bearer ${token}`;
              const payload = decodeJwt<JwtPayload>(token);
              if (payload?.tenantId) {
                original.headers["X-Tenant-Id"] = payload.tenantId;
              }
            }
            return apiInstance.request(original);
          }
          forceTenantReauth();
        } else {
          forceTenantReauth();
        }
      }
    }

    const errorMessage =
      error.response?.data?.message ??
      error.message ??
      "Erro de comunicação com o servidor. Tente novamente.";

    return Promise.reject(new Error(errorMessage));
  },
);

export default apiInstance;
