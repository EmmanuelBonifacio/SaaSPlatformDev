"use client";
// =============================================================================
// src/app/[slug]/layout.tsx
// =============================================================================
// O QUE FAZ:
//   Layout de tenant. Aplica proteção de rota (auth guard) e envolve o conteúdo
//   com o AppLayout (Sidebar + Navbar). Roda para todas as rotas /<slug>/*.
//
//   FLUXO:
//     1. Lê o slug da URL ({ params.slug })
//     2. Salva o slug no localStorage para que os serviços de API o usem
//     3. Verifica se há token JWT válido
//     4. Se não houver, redireciona para /<slug>/login
//     5. Se houver, renderiza AppLayout com children
// =============================================================================

import { useEffect, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { AppLayout } from "@/components/shared/AppLayout";
import { TOKEN_KEY, TENANT_SLUG_KEY } from "@/services/api";
import { isJwtExpired } from "@/lib/utils";
import { clearModulesCache } from "@/services/tenant.service";

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams<{ slug: string | string[] }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  // usePathname() pode ser null no primeiro tick em alguns fluxos do App Router
  const pathname = usePathname() ?? "";
  const base = slug ? `/${slug}` : "";

  // Rota de login não precisa de proteção — o usuário ainda não tem token
  const isLoginPage = !!slug && pathname === `${base}/login`;

  // Estado de verificação de auth: null = checando, true = ok, false = sem auth
  const [authState, setAuthState] = useState<"checking" | "ok" | "redirect">(
    "checking",
  );

  useEffect(() => {
    // Rota de login não requer verificação de token
    if (!slug || isLoginPage) {
      setAuthState("ok");
      return;
    }

    // Persiste o slug atual para que os interceptors do Axios o utilizem.
    // Se o slug mudou (usuário navegou para outro tenant), limpa o token
    // anterior para evitar que dados de um tenant vazem para outro.
    if (typeof window !== "undefined") {
      const savedSlug = localStorage.getItem(TENANT_SLUG_KEY);
      if (savedSlug && savedSlug !== slug) {
        localStorage.removeItem(TOKEN_KEY);
        clearModulesCache();
      }
      localStorage.setItem(TENANT_SLUG_KEY, slug);
    }

    // Verifica se existe token válido
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

    if (!token || isJwtExpired(token)) {
      // Sem token ou expirado: redireciona para login do tenant
      setAuthState("redirect");
      router.replace(`/${slug}/login`);
      return;
    }

    setAuthState("ok");
    // isLoginPage está nas deps porque o layout é compartilhado entre /login e
    // /dashboard. Quando o usuário faz login e a rota muda de /login → /dashboard,
    // isLoginPage muda de true → false. Sem ele aqui, o effect não re-executa
    // e authState fica em "checking" para sempre (spinner infinito).
  }, [slug, router, isLoginPage]);

  if (slug == null || slug === "") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Na página de login renderiza os filhos diretamente sem verificar token
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (authState === "checking" || authState === "redirect") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Auth OK: renderiza o shell da aplicação
  return <AppLayout tenantSlug={slug}>{children}</AppLayout>;
}
