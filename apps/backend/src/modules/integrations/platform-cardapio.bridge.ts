// =============================================================================
// Ponte SaaS Platform → Platform Cardápio
// =============================================================================
// Quando o módulo `cardapio` (ou alias `vendas`) é ativado para um tenant,
// dispara provisionamento no serviço Platform Cardápio via webhook HMAC.
// Falhas NÃO bloqueiam o toggle no admin (best-effort + log).
// =============================================================================

import { createHmac } from "crypto";
import { prisma } from "../../core/database/prisma";
import { env } from "../../config/env";

type ProvisionBody = {
  saasTenantId: string;
  saasSlug: string;
  name: string;
  ownerEmail: string;
  ownerName: string;
  saasUserId: string;
  planCode?: string;
};

function signBody(raw: string, secret: string): string {
  return createHmac("sha256", secret).update(raw).digest("hex");
}

export async function provisionPlatformCardapioIfConfigured(
  tenantId: string,
  moduleName: string,
  enabled: boolean,
): Promise<void> {
  if (!enabled) return;
  if (moduleName !== "cardapio" && moduleName !== "vendas") return;

  const baseUrl = env.PLATFORM_CARDAPIO_API_URL;
  const secret = env.PLATFORM_CARDAPIO_WEBHOOK_SECRET;
  if (!baseUrl || !secret) {
    return;
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return;

  // Owner: primeiro admin_user não é do tenant; usamos CRM ou placeholders seguros
  const crm = await prisma.tenantCrm.findUnique({ where: { tenantId } });
  const ownerEmail = crm?.email || `owner+${tenant.slug}@platformcardapio.local`;
  const ownerName = crm?.nome || tenant.name;

  const body: ProvisionBody = {
    saasTenantId: tenant.id,
    saasSlug: tenant.slug,
    name: tenant.name,
    ownerEmail,
    ownerName,
    saasUserId: `saas-owner-${tenant.id}`,
    planCode: "iniciante",
  };

  const raw = JSON.stringify(body);
  const signature = `sha256=${signBody(raw, secret)}`;
  const url = `${baseUrl.replace(/\/$/, "")}/api/integrations/saas-platform/webhooks/provision`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-saas-signature": signature,
      },
      body: raw,
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(
        `[platform-cardapio] provision failed ${res.status}: ${text.slice(0, 300)}`,
      );
    }
  } catch (err) {
    console.error("[platform-cardapio] provision error", err);
  }
}
