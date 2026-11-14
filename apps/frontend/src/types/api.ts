// =============================================================================
// src/types/api.ts — tipos compartilhados das respostas da API
// =============================================================================

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: "admin" | "user" | "superadmin";
  name?: string;
  iat?: number;
  exp?: number;
}

export interface MeResponse {
  mensagem: string;
  tenant: {
    id: string;
    slug: string;
    schemaName: string;
  };
  usuario: {
    id: string;
    role: string;
  };
}

export interface DevTokenResponse {
  token: string;
  instruções: string;
}

export interface Module {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  icone?: string;
  visivel?: boolean;
  emBreve?: boolean;
  beta?: boolean;
  trialRestanteDias?: number | null;
  trialExpirado?: boolean;
}

export interface TenantModuleInfo extends Module {
  moduleId: string;
  ativo: boolean;
  visivel: boolean;
  emBreve: boolean;
  beta: boolean;
  trialRestanteDias: number | null;
  trialExpirado: boolean;
  bloqueadoMotivo: string | null;
}

export interface PlanoInfo {
  nome: string;
  expiraEm: string | null;
  emTrial: boolean;
}

export interface TenantModulesResponse {
  modules: TenantModuleInfo[];
  plano: PlanoInfo | null;
}

export interface TenantModule {
  id: string;
  moduleId: string;
  isActive: boolean;
  module: Module;
  visivel?: boolean;
  emBreve?: boolean;
  beta?: boolean;
  trialRestanteDias?: number | null;
  trialExpirado?: boolean;
  bloqueadoMotivo?: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  schemaName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  modules: TenantModule[];
}

export interface RequestLog {
  id: string;
  module: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  createdAt: string;
}

export interface TenantUser {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantUserInput {
  email: string;
  name: string;
  password: string;
  role: "admin" | "user";
}

export interface UpdateTenantUserInput {
  name?: string;
  role?: "admin" | "user";
  isActive?: boolean;
}

export interface ResetPasswordInput {
  newPassword: string;
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  activeModulesCount: number;
}

export interface TenantListResponse {
  data: TenantSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SystemStats {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  totalUsers?: number;
  totalModuleActivations: number;
  moduleUsage: {
    moduleName: string;
    displayName: string;
    activeCount: number;
  }[];
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  moduleNames?: string[];
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  detalhe?: unknown;
}
