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

type AuthState = "checking" | "ok" | "redirect";

function resolveAuthState(slug: string | undefined, isLoginPage: boolean): AuthState {
  if (!slug || isLoginPage) return "ok";
  if (typeof window === "undefined") return "checking";

  const savedSlug = localStorage.getItem(TENANT_SLUG_KEY);
  if (savedSlug && savedSlug !== slug) {
    localStorage.removeItem(TOKEN_KEY);
    clearModulesCache();
  }
  localStorage.setItem(TENANT_SLUG_KEY, slug);

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || isJwtExpired(token)) return "redirect";
  return "ok";
}

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
  const isLoginPage = !!slug && (
    pathname === `${base}/login` ||
    pathname.endsWith("/login")
  );

  // Resolve auth no primeiro paint do cliente para evitar spinner eterno
  // enquanto o useEffect ainda não rodou.
  const [authState, setAuthState] = useState<AuthState>(() =>
    resolveAuthState(slug, isLoginPage),
  );

  useEffect(() => {
    const nextState = resolveAuthState(slug, isLoginPage);
    setAuthState(nextState);
    if (nextState === "redirect" && slug) {
      router.replace(`/${slug}/login`);
    }
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
