"use client";
// =============================================================================
// src/hooks/useModules.ts
// =============================================================================
// Hook que expõe módulos ativos (com feature flags) e plano do tenant logado.
// Usa TanStack Query para compartilhar UMA única request entre AppLayout,
// Dashboard, ModuleGuard, etc. — evita o spam de GET /api/tenant/modules.
// =============================================================================

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearModulesCache,
  discoverModulesAndPlano,
} from "@/services/tenant.service";
import type { Module, PlanoInfo } from "@/types/api";

export const TENANT_MODULES_QUERY_KEY = ["tenant-modules"] as const;

interface UseModulesResult {
  modules: Module[];
  plano: PlanoInfo | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useModules(): UseModulesResult {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: TENANT_MODULES_QUERY_KEY,
    queryFn: () => discoverModulesAndPlano(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  function refresh() {
    clearModulesCache();
    void queryClient.invalidateQueries({ queryKey: TENANT_MODULES_QUERY_KEY });
  }

  return {
    modules: query.data?.modules ?? [],
    plano: query.data?.plano ?? null,
    // Só o carregamento inicial — refetch em background não deve ligar skeletons
    // (isso parecia "loop de carregamento" no dashboard).
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
  };
}
