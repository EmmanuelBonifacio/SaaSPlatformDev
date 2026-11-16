"use client";
// src/app/admin/login/page.tsx
// Página de login para o administrador do sistema.
// Chama POST /admin/login com email + senha reais (bcrypt no backend).

import { useState, useEffect } from "react";
import { Shield, Eye, EyeOff } from "lucide-react";
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
import { adminLogin } from "@/services/auth.service";
import { ADMIN_TOKEN_KEY } from "@/services/api";
import { decodeJwt } from "@/lib/utils";
import type { JwtPayload } from "@/types/api";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("admin@sistema.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sem auto-redirect por exp do JWT no mount: skew de relógio + guard do
  // layout geravam loop login↔/admin. Sessão inválida cai no 401 do backend.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) return;
    const payload = decodeJwt<JwtPayload>(token);
    if (payload?.role === "superadmin") {
      window.location.replace("/admin");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Preencha o e-mail.");
      return;
    }
    if (!password.trim()) {
      setError("Preencha a senha.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const payload = await adminLogin({ email: email.trim(), password });

      if (payload.role !== "superadmin") {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setError("Acesso negado: credenciais sem permissão de administrador.");
        return;
      }

      window.location.replace("/admin");
      return;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Falha ao autenticar. Verifique suas credenciais.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Painel Administrativo</CardTitle>
          <CardDescription>
            Acesso exclusivo para administradores do sistema
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-mail */}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@sistema.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
              <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Autenticando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
