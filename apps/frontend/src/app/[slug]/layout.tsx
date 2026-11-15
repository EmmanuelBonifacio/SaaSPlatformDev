"use client";
// =============================================================================
// src/app/[slug]/layout.tsx
// =============================================================================
// Layout de tenant com auth guard. SSR e o primeiro paint do cliente DEVEM
// renderizar o mesmo markup (spinner) para evitar hydration mismatch — a
// leitura de localStorage só ocorre depois do mount, no useEffect.
//
// Redirects usam window.location.replace (hard nav) para evitar ping-pong
// soft-nav com a página de login.
//
// NÃO validamos exp do JWT aqui: relógio do browser desalinhado causa
// login → dashboard → "expirado" → login em loop. A validade real fica
// com o backend (401) + refresh em api.ts.
// =============================================================================

import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { AppLayout } from "@/components/shared/AppLayout";
import {
  TOKEN_KEY,
  TENANT_SLUG_KEY,
  AUTH_REAUTH_KEY,
  REFRESH_TOKEN_KEY,
} from "@/services/api";
import { clearModulesCache } from "@/services/tenant.service";

type AuthState = "checking" | "ok" | "redirect";

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function syncTenantSlug(slug: string): void {
  const savedSlug = localStorage.getItem(TENANT_SLUG_KEY);
  if (savedSlug && savedSlug !== slug) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    clearModulesCache();
  }
  localStorage.setItem(TENANT_SLUG_KEY, slug);
}

function isTenantLoginPath(pathname: string, slug: string): boolean {
  if (!slug) return false;
  return (
    pathname === `/${slug}/login` ||
    pathname === `/${slug}/login/` ||
    /\/login\/?$/.test(pathname)
  );
}

function redirectToLogin(slug: string, pathname: string): void {
  try {
    sessionStorage.setItem(AUTH_REAUTH_KEY, String(Date.now()));
  } catch {
    // sessionStorage pode falhar em iframes restritos — o hard nav ainda corre.
  }
  const next =
    pathname && !/\/login\/?$/.test(pathname)
      ? `?reauth=1&next=${encodeURIComponent(pathname)}`
      : "?reauth=1";
  window.location.replace(`/${slug}/login${next}`);
}

function hasClientSession(): boolean {
  return Boolean(
    localStorage.getItem(TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY),
  );
}

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ slug: string | string[] }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const pathname = usePathname() ?? "";
  const isLoginPage = isTenantLoginPath(pathname, slug ?? "");

  // Sempre "checking" no SSR e no 1º paint — localStorage só após mount.
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!slug || isLoginPage) {
      setAuthState("ok");
      return;
    }

    try {
      syncTenantSlug(slug);
      if (!hasClientSession()) {
        setAuthState("redirect");
        redirectToLogin(slug, pathname);
        return;
      }
      setAuthState("ok");
    } catch {
      setAuthState("redirect");
      redirectToLogin(slug, pathname);
    }
  }, [slug, isLoginPage, pathname]);

  if (slug == null || slug === "") {
    return <Spinner />;
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Enquanto não montou, mantém o mesmo spinner do SSR (hydration-safe).
  if (!mounted || authState === "checking" || authState === "redirect") {
    return <Spinner />;
  }

  return <AppLayout tenantSlug={slug}>{children}</AppLayout>;
}
