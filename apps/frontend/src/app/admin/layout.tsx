"use client";
// =============================================================================
// src/app/admin/layout.tsx
// =============================================================================
// Auth guard do painel superadmin.
// Espelha o tenant layout: SSR/primeiro paint = spinner estável; login sem
// guard; hard nav para /admin/login; NÃO valida exp do JWT no client (skew
// de relógio causava login ↔ admin em loop — validade fica no 401 do backend).
// =============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, LogOut, Shield } from "lucide-react";
import { ADMIN_TOKEN_KEY } from "@/services/api";
import { decodeJwt } from "@/lib/utils";
import { adminLogout } from "@/services/auth.service";
import type { JwtPayload } from "@/types/api";

const NAV_ITEMS = [
  { href: "/admin", label: "Visão Geral", icon: LayoutDashboard, exact: true },
  { href: "/admin/tenants", label: "Tenants", icon: Building2, exact: false },
];

type AuthState = "checking" | "ok" | "denied" | "redirect";

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function isAdminLoginPath(pathname: string): boolean {
  return pathname === "/admin/login" || pathname === "/admin/login/";
}

function redirectToAdminLogin(): void {
  window.location.replace("/admin/login");
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const isLoginPage = isAdminLoginPath(pathname);
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isLoginPage) {
      setAuthState("ok");
      return;
    }

    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      if (!token) {
        setAuthState("redirect");
        redirectToAdminLogin();
        return;
      }

      const payload = decodeJwt<JwtPayload>(token);
      if (payload?.role !== "superadmin") {
        setAuthState("denied");
        return;
      }

      setAuthState("ok");
    } catch {
      setAuthState("redirect");
      redirectToAdminLogin();
    }
  }, [isLoginPage, pathname]);

  function handleLogout() {
    adminLogout();
    window.location.replace("/admin/login");
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!mounted || authState === "checking" || authState === "redirect") {
    return <Spinner />;
  }

  if (authState === "denied") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <Shield className="h-12 w-12 text-destructive" />
        <p className="font-semibold text-lg">Acesso Negado</p>
        <p className="text-sm text-muted-foreground">
          Você precisa de permissão de superadmin para acessar esta área.
        </p>
        <Link href="/admin/login" className="text-sm text-primary underline">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="flex w-12 md:w-56 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex h-14 items-center justify-center md:justify-start gap-2 border-b border-sidebar-border px-2 md:px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold shrink-0">
            S
          </div>
          <span className="font-semibold text-sidebar-foreground hidden md:block">
            Admin Panel
          </span>
        </div>

        <nav className="flex-1 space-y-1 p-1.5 md:p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center justify-center md:justify-start gap-0 md:gap-2.5 rounded-lg px-2 md:px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-1.5 md:p-3">
          <button
            onClick={handleLogout}
            title="Sair"
            className="flex w-full items-center justify-center md:justify-start gap-0 md:gap-2.5 rounded-lg px-2 md:px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-3 md:p-6 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
