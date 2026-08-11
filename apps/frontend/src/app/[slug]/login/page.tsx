"use client";
// =============================================================================
// src/app/[slug]/login/page.tsx
// =============================================================================
// O QUE FAZ:
//   Página de login do tenant. Exibe formulário com e-mail e senha.
//   Ao autenticar com sucesso, redireciona para /<slug>/dashboard.
//   Usa POST /auth/login com { slug, email, password }.
// =============================================================================

import type { Metadata } from "next";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { LogIn, Eye, EyeOff, Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { login, checkTenant } from "@/services/auth.service";
import { TOKEN_KEY, TENANT_SLUG_KEY } from "@/services/api";
import { isJwtExpired } from "@/lib/utils";

type TenantState = "checking" | "found" | "not-found";

export default function LoginPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [tenantState, setTenantState] = useState<TenantState>("checking");
  const [tenantName, setTenantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Valida se o tenant existe antes de renderizar o formulário
  useEffect(() => {
    if (!slug) return;
    checkTenant(slug).then((tenant) => {
      if (tenant) {
        setTenantName(tenant.name);
        setTenantState("found");
      } else {
        setTenantState("not-found");
      }
    });
  }, [slug]);

  // Se já estiver autenticado, vai direto para dashboard
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !isJwtExpired(token)) {
      router.replace(`/${slug}/dashboard`);
    }
  }, [slug, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Preencha e-mail e senha.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Salva slug no localStorage ANTES, pois o serviço de login pode precisar
      localStorage.setItem(TENANT_SLUG_KEY, slug);

      await login({ email, password }, slug);
      router.push(`/${slug}/dashboard`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Falha ao fazer login. Verifique suas credenciais.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const wrapperClass =
    "flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4";

  // ── Verificando existência do tenant ──────────────────────────────────────
  if (tenantState === "checking") {
    return (
      <div className={wrapperClass}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // ── Tenant não encontrado ─────────────────────────────────────────────────
  if (tenantState === "not-found") {
    return (
      <div className={wrapperClass}>
        <Card className="w-full max-w-sm shadow-lg text-center">
          <CardHeader className="space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
              <Building2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">Empresa não encontrada</CardTitle>
            <CardDescription>
              O endereço{" "}
              <span className="font-mono font-medium text-foreground">
                {slug}
              </span>{" "}
              não corresponde a nenhuma empresa cadastrada ou está inativa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao início
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Formulário de login ───────────────────────────────────────────────────
  return (
    <div className={wrapperClass}>
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-bold">
            {tenantName.charAt(0).toUpperCase()}
          </div>
          <CardTitle className="text-2xl">Entrar</CardTitle>
          <CardDescription className="text-sm font-medium">
            {tenantName}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                hasError={!!error}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  hasError={!!error}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              <LogIn className="mr-2 h-4 w-4" />
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
