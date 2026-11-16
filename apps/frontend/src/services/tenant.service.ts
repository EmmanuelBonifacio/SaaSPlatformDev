// =============================================================================
// src/services/tenant.service.ts
// =============================================================================
// Descobre módulos ativos do tenant e plano contratado.
// Estratégia com fallback:
//   1. GET /api/tenant/modules  → endpoint novo com feature flags
//   2. GET /modules/status      → endpoint legado (fallback se o novo falhar)
//
// Deduplicação: um único in-flight Promise evita rajadas quando AppLayout,
// Dashboard e ModuleGuard montam juntos (e Strict Mode remonta em dev).
// =============================================================================

import api from "./api";
import type { Module, Tenant, TenantModulesResponse, PlanoInfo } from "@/types/api";

const ACTIVE_MODULES_KEY = "@saas/active-modules-v2";
const MODULES_CACHE_TTL = 5 * 60 * 1000;

const ALL_MODULES: Module[] = [
  {
    id: "finia",
    name: "finia",
    displayName: "FinIA Assistente",
    description: "Assistente financeiro pessoal inteligente via WhatsApp com IA",
  },
  {
    id: "agents",
    name: "agents",
    displayName: "Agentes de IA",
    description: "Agentes nativos do SaaS (/agents)",
  },
];

export interface ModulesDiscovery {
  modules: Module[];
  plano: PlanoInfo | null;
}

interface CachedModules extends ModulesDiscovery {
  cachedAt: number;
}

let discoveryInFlight: Promise<ModulesDiscovery> | null = null;

function mapTenantModulesResponse(data: TenantModulesResponse): ModulesDiscovery {
  const modules: Module[] = data.modules.map((m) => ({
    id: m.moduleId,
    name: m.name,
    displayName: m.displayName,
    description: m.description ?? undefined,
    icone: m.icone ?? undefined,
    visivel: m.visivel,
    emBreve: m.emBreve,
    beta: m.beta,
    trialRestanteDias: m.trialRestanteDias,
    trialExpirado: m.trialExpirado,
  }));
  return { modules, plano: data.plano };
}

async function fetchModulesFromApi(): Promise<ModulesDiscovery> {
  try {
    const response = await api.get<TenantModulesResponse>("/api/tenant/modules");
    return mapTenantModulesResponse(response.data);
  } catch {
    // fallback legado
  }

  try {
    const response = await api.get<{ modules: string[] }>("/modules/status");
    const activeNames = response.data.modules ?? [];
    const modules = ALL_MODULES.filter((m) => activeNames.includes(m.name));
    return { modules, plano: null };
  } catch {
    return { modules: [], plano: null };
  }
}

/**
 * Fonte única de verdade para módulos + plano.
 * Usa cache localStorage e dedupe in-flight (Strict Mode / multi-hook).
 */
export async function discoverModulesAndPlano(
  options?: { force?: boolean },
): Promise<ModulesDiscovery> {
  if (!options?.force) {
    const cached = getModulesFromCache();
    if (cached) {
      return { modules: cached.modules, plano: cached.plano };
    }
    if (discoveryInFlight) return discoveryInFlight;
  }

  discoveryInFlight = (async () => {
    try {
      const result = await fetchModulesFromApi();
      saveModulesToCache({ ...result, cachedAt: Date.now() });
      return result;
    } finally {
      discoveryInFlight = null;
    }
  })();

  return discoveryInFlight;
}

export async function discoverActiveModules(): Promise<Module[]> {
  const { modules } = await discoverModulesAndPlano();
  return modules;
}

export async function discoverPlano(): Promise<PlanoInfo | null> {
  const { plano } = await discoverModulesAndPlano();
  return plano;
}

export async function getTenantInfoFromAdmin(
  tenantId: string,
): Promise<Tenant | null> {
  try {
    const response = await api.get<Tenant>(`/admin/tenants/${tenantId}`);
    return response.data;
  } catch {
    return null;
  }
}

export function clearModulesCache(): void {
  discoveryInFlight = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(ACTIVE_MODULES_KEY);
    localStorage.removeItem("@saas/active-modules");
  }
}

function getModulesFromCache(): CachedModules | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_MODULES_KEY);
    if (!raw) return null;
    const cached: CachedModules = JSON.parse(raw);
    if (Date.now() - cached.cachedAt > MODULES_CACHE_TTL) {
      localStorage.removeItem(ACTIVE_MODULES_KEY);
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function saveModulesToCache(data: CachedModules): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_MODULES_KEY, JSON.stringify(data));
}
