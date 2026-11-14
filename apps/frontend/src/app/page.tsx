// =============================================================================
// src/app/page.tsx
// =============================================================================
// Landing pública na raiz "/". Painel superadmin: /admin. Tenants: /<slug>/login
// =============================================================================

import type { Metadata } from "next";
import { SaasPlatformLanding } from "@/components/landing/saas-platform-landing";

export const metadata: Metadata = {
  title: "SaaSPlatform — FinIA, Agentes e Memória",
  description:
    "Plataforma SaaS multi-tenant com FinIA, agentes de IA (Paperclip) e memória isolada por tenant.",
};

export default function RootPage() {
  return <SaasPlatformLanding />;
}
