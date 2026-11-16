export type ClientStatus = "lead" | "proposta" | "ativo" | "churn" | "vip";
export type ClientOrigem = "instagram" | "indicacao" | "trafego" | "outro";
export type ClientPlano = "free" | "pro" | "premium";

export type ClientModules = {
  financeiro?: boolean;
  agentes?: boolean;
  comercial?: boolean;
};

export type ClientRecord = {
  id: string;
  matchKey: string;
  status: ClientStatus;
  nomeFantasia: string;
  cnpjCpf: string | null;
  tags: string[];
  origem: ClientOrigem | null;
  plano: ClientPlano | null;
  mrr: number;
  responsavel: string | null;
  whatsapp: string | null;
  email: string | null;
  produtoContratado: string | null;
  dorPrincipal: string | null;
  objetivoSaas: string | null;
  modulos: ClientModules;
  dashboardLink: string | null;
  externalId: string | null;
  notasRelatorio: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertClientInput = {
  nomeFantasia: string;
  cnpjCpf?: string | null;
  status?: ClientStatus;
  tags?: string[];
  origem?: ClientOrigem | null;
  plano?: ClientPlano | null;
  mrr?: number;
  responsavel?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  produtoContratado?: string | null;
  dorPrincipal?: string | null;
  objetivoSaas?: string | null;
  modulos?: ClientModules;
  dashboardLink?: string | null;
  externalId?: string | null;
  relatorioNota?: string | null;
};
