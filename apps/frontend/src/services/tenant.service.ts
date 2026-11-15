// =============================================================================
// src/services/tenant.service.ts
// =============================================================================
// Descobre módulos ativos do tenant e plano contratado.
// Estratégia com fallback:
//   1. GET /api/tenant/modules  → endpoint novo com feature flags
//   2. GET /modules/status      → endpoint legado (fallback se o novo falhar)
// =============================================================================

import api from "./api";
import type { Module, Tenant, TenantModulesResponse, PlanoInfo } from "@/types/api";

const ACTIVE_MODULES_KEY = "@saas/active-modules-v2";
const MODULES_CACHE_TTL = 5 * 60 * 1000;

// Lista completa de módulos conhecidos
const ALL_MODULES: Module[] = [
  { id: "finia", name: "finia", displayName: "FinIA Assistente", description: "Assistente financeiro pessoal inteligente via WhatsApp com IA" },
  { id: "agents", name: "agents", displayName: "Agentes de IA", description: "Agentes nativos do SaaS (/agents)" },
];

interface CachedModules {
  modules: Module[];
  plano: PlanoInfo | null;
  cachedAt: number;
}

// =============================================================================
// FUNÇÃO: discoverActiveModules
// =============================================================================
export async function discoverActiveModules(): Promise<Module[]> {
  const cached = getModulesFromCache();
  if (cached) return cached.modules;

  // Tentativa 1: endpoint novo com feature flags
  try {
    const response = await api.get<TenantModulesResponse>("/api/tenant/modules");
    const modules: Module[] = response.data.modules.map((m) => ({
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
    saveModulesToCache({ modules, plano: response.data.plano, cachedAt: Date.now() });
    return modules;
  } catch {
    // Tentativa 2: endpoint legado
  }

  try {
    const response = await api.get<{ modules: string[] }>("/modules/status");
    const activeNames = response.data.modules ?? [];
    const modules = ALL_MODULES.filter((m) => activeNames.includes(m.name));
    saveModulesToCache({ modules, plano: null, cachedAt: Date.now() });
    return modules;
  } catch {
    return [];
  }
}

// =============================================================================
// FUNÇÃO: discoverPlano
// =============================================================================
export async function discoverPlano(): Promise<PlanoInfo | null> {
  const cached = getModulesFromCache();
  if (cached) return cached.plano;
  await discoverActiveModules();
  return getModulesFromCache()?.plano ?? null;
}

// =============================================================================
// FUNÇÃO: getTenantInfoFromAdmin
// =============================================================================
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

// =============================================================================
// FUNÇÃO: clearModulesCache
// =============================================================================
export function clearModulesCache(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(ACTIVE_MODULES_KEY);
    localStorage.removeItem("@saas/active-modules");
  }
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

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
