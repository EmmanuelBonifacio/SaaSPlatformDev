"use client";
// =============================================================================
// src/modules/admin/ModuleToggle.tsx
// =============================================================================
// Gerenciamento de módulos por tenant no painel admin.
// Suporta: ativar/desativar, visibilidade, badges e trial.
// =============================================================================

import { useState } from "react";
import { LayoutGrid, Loader2, Eye, EyeOff, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toggleTenantModule, updateTenantModuleFlags, activateTenantModuleTrial } from "@/services/admin.service";
import type { TenantModule } from "@/types/api";

const MODULE_LABELS: Record<string, { label: string; color: string }> = {
  finia:     { label: "FinIA Assistente", color: "text-purple-600" },
  paperclip: { label: "Agentes de IA",    color: "text-indigo-600" },
  memory:    { label: "Memória",          color: "text-cyan-600" },
};

interface ModuleToggleProps {
  tenantId: string;
  modules: TenantModule[];
  onToggled: () => void;
}

export function ModuleToggle({ tenantId, modules, onToggled }: ModuleToggleProps) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  async function withLoading(key: string, fn: () => Promise<unknown>) {
    setLoadingKey(key);
    try {
      await fn();
      onToggled();
    } catch (err) {
      console.error("Erro na operação de módulo:", err);
    } finally {
      setLoadingKey(null);
    }
  }

  async function handleToggleEnabled(mod: TenantModule) {
    await withLoading(`enabled-${mod.moduleId}`, () =>
      toggleTenantModule(tenantId, mod.module.name, !mod.isActive),
    );
  }

  async function handleToggleVisivel(mod: TenantModule) {
    await withLoading(`visivel-${mod.moduleId}`, () =>
      updateTenantModuleFlags(tenantId, mod.module.name, { visivel: !mod.visivel }),
    );
  }

  async function handleActivateTrial(mod: TenantModule) {
    await withLoading(`trial-${mod.moduleId}`, () =>
      activateTenantModuleTrial(tenantId, mod.module.name, 14),
    );
  }

  if (!modules?.length) {
    return (
      <p className="text-sm text-muted-foreground italic px-1">
        Nenhum módulo vinculado a este tenant.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {modules.map((mod) => {
        const meta = MODULE_LABELS[mod.module?.name ?? ""] ?? {
          label: mod.module?.name ?? mod.moduleId,
          color: "text-foreground",
        };
        const isLoadingEnabled = loadingKey === `enabled-${mod.moduleId}`;
        const isLoadingVisivel = loadingKey === `visivel-${mod.moduleId}`;
        const isLoadingTrial   = loadingKey === `trial-${mod.moduleId}`;

        return (
          <div
            key={mod.moduleId}
            className={`flex flex-wrap items-center gap-2 rounded-lg border p-2 text-sm transition-colors ${
              mod.isActive ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"
            }`}
          >
            {/* Nome */}
            <LayoutGrid className={`h-3.5 w-3.5 shrink-0 ${meta.color}`} />
            <span className={`flex-1 min-w-0 font-medium ${!mod.isActive ? "text-muted-foreground" : ""}`}>
              {meta.label}
            </span>

            {/* Badges de estado */}
            <Badge variant={mod.isActive ? "success" : "muted"} className="text-xs">
              {mod.isActive ? "Ativo" : "Inativo"}
            </Badge>
            {mod.visivel === false && (
              <Badge variant="muted" className="text-xs">invisível</Badge>
            )}
            {mod.emBreve && (
              <Badge variant="muted" className="text-xs bg-yellow-50 text-yellow-700">em breve</Badge>
            )}
            {mod.beta && (
              <Badge variant="muted" className="text-xs bg-blue-50 text-blue-700">beta</Badge>
            )}
            {mod.trialRestanteDias !== null && mod.trialRestanteDias !== undefined && (
              <Badge variant="muted" className={`text-xs ${mod.trialRestanteDias <= 3 ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700"}`}>
                {mod.trialRestanteDias}d trial
              </Badge>
            )}

            {/* Ações */}
            {/* Toggle ativo/inativo */}
            <Button
              size="icon-sm"
              variant={mod.isActive ? "destructive" : "outline"}
              onClick={() => handleToggleEnabled(mod)}
              disabled={isLoadingEnabled}
              title={mod.isActive ? "Desativar" : "Ativar"}
            >
              {isLoadingEnabled ? <Loader2 className="h-3 w-3 animate-spin" /> : mod.isActive ? "✕" : "✓"}
            </Button>

            {/* Toggle visível/invisível */}
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => handleToggleVisivel(mod)}
              disabled={isLoadingVisivel}
              title={mod.visivel === false ? "Tornar visível" : "Ocultar"}
            >
              {isLoadingVisivel ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : mod.visivel === false ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </Button>

            {/* Ativar trial de 14 dias */}
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => handleActivateTrial(mod)}
              disabled={isLoadingTrial}
              title="Ativar trial de 14 dias"
            >
              {isLoadingTrial ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
