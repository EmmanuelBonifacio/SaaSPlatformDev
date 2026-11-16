export const CLIENT_STATUSES = [
  "lead",
  "proposta",
  "ativo",
  "churn",
  "vip",
] as const;

export const CLIENT_ORIGENS = [
  "instagram",
  "indicacao",
  "trafego",
  "outro",
] as const;

export const CLIENT_PLANOS = ["free", "pro", "premium"] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];
export type ClientOrigem = (typeof CLIENT_ORIGENS)[number];
export type ClientPlano = (typeof CLIENT_PLANOS)[number];

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
  createdAt: Date;
  updatedAt: Date;
};

export type ClientActor = { userId: string };
