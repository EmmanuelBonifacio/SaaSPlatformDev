import type { ClientOrigem, ClientPlano, ClientStatus } from "@/types/clients.types";

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  lead: "Lead",
  proposta: "Proposta",
  ativo: "Ativo",
  churn: "Churn",
  vip: "VIP",
};

export const CLIENT_ORIGEM_LABEL: Record<ClientOrigem, string> = {
  instagram: "Instagram",
  indicacao: "Indicação",
  trafego: "Tráfego",
  outro: "Outro",
};

export const CLIENT_PLANO_LABEL: Record<ClientPlano, string> = {
  free: "Free",
  pro: "Pro",
  premium: "Premium",
};

export function formatClientMoney(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
