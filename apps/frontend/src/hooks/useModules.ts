"use client";
// =============================================================================
// src/hooks/useModules.ts
// =============================================================================
// Hook que expõe módulos ativos (com feature flags) e plano do tenant logado.
// Alimenta a Sidebar e o ModuleGuard.
// =============================================================================

import { useState, useEffect } from "react";
import { discoverActiveModules, discoverPlano, clearModulesCache } from "@/services/tenant.service";
import type { Module, PlanoInfo } from "@/types/api";

interface UseModulesResult {
  modules: Module[];
  plano: PlanoInfo | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useModules(): UseModulesResult {
  const [modules, setModules] = useState<Module[]>([]);
  const [plano, setPlano] = useState<PlanoInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchModules() {
      setIsLoading(true);
      setError(null);

      try {
        const [activeModules, planoInfo] = await Promise.all([
          discoverActiveModules(),
          discoverPlano(),
        ]);
        if (isMounted) {
          setModules(activeModules);
          setPlano(planoInfo);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Erro ao carregar módulos.");
          setModules([]);
          setPlano(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchModules();
    return () => { isMounted = false; };
  }, [refreshKey]);

  function refresh() {
    clearModulesCache();
    setRefreshKey((prev) => prev + 1);
  }

  return { modules, plano, isLoading, error, refresh };
}
