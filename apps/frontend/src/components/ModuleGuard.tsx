"use client";
// =============================================================================
// src/components/ModuleGuard.tsx
// =============================================================================
// Proteção de rotas por módulo. Envolva o layout de cada módulo com este
// componente para mostrar a tela de upgrade quando o tenant não tem acesso.
//
// Uso:
//   <ModuleGuard moduleSlug="fleet">
//     {children}
//   </ModuleGuard>
// =============================================================================

import { Lock, Clock, Zap } from "lucide-react";
import { useModules } from "@/hooks/useModules";

interface ModuleGuardProps {
  moduleSlug: string;
  children: React.ReactNode;
}

export function ModuleGuard({ moduleSlug, children }: ModuleGuardProps) {
  const { modules, isLoading } = useModules();

  // Enquanto carrega: renderiza children otimisticamente (evita flash de "bloqueado")
  // O cache de 5 minutos faz isso resolver em < 1ms na maioria das navegações.
  if (isLoading) return <>{children}</>;

  const mod = modules.find((m) => m.name === moduleSlug);

  // Módulo não existe na lista do tenant = fora do plano
  if (!mod) {
    return <UpgradeScreen reason="not_in_plan" />;
  }

  // Trial expirou
  if (mod.trialExpirado) {
    return <UpgradeScreen reason="trial_expired" />;
  }

  // Módulo desativado pelo admin
  if (mod.visivel === false) {
    return <DisabledScreen />;
  }

  return <>{children}</>;
}

// ─── Telas de bloqueio ────────────────────────────────────────────────────────

function UpgradeScreen({ reason }: { reason: "not_in_plan" | "trial_expired" }) {
  const isExpired = reason === "trial_expired";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
        <Lock className="w-8 h-8 text-blue-600" />
      </div>

      <div className="max-w-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isExpired ? "Período de teste encerrado" : "Módulo não disponível"}
        </h2>
        <p className="text-gray-500 text-sm">
          {isExpired
            ? "Seu período de avaliação gratuita chegou ao fim. Faça upgrade para continuar usando este módulo."
            : "Este módulo não está incluído no seu plano atual. Faça upgrade para ter acesso."}
        </p>
      </div>

      <a
        href="mailto:contato@seudominio.com?subject=Upgrade de plano"
        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        <Zap className="w-4 h-4" />
        Falar sobre upgrade
      </a>
    </div>
  );
}

function DisabledScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
        <Clock className="w-8 h-8 text-gray-400" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-700">Módulo desativado</h2>
        <p className="text-gray-400 mt-1 text-sm">Entre em contato com o suporte da sua empresa.</p>
      </div>
    </div>
  );
}
