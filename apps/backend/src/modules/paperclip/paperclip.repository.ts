import { randomUUID } from "crypto";
import { withTenantSchema } from "../../core/database/prisma";
import type { PaperclipConversation } from "./paperclip.types";

interface ConversationRow {
  id: string;
  ownerUserId: string;
  clientRequestId: string;
  agentId: string;
  issueId: string | null;
  title: string;
  initialMessage: string;
  state: PaperclipConversation["state"];
  createdAt: Date;
}

interface CompanyRow {
  companyId: string | null;
}

interface ConversationOwnerRow {
  issueId: string;
  ownerUserId: string;
}

function mapConversation(row: ConversationRow): PaperclipConversation {
  return {
    ...row,
    ownerUserId: row.ownerUserId,
    clientRequestId: row.clientRequestId,
    agentId: row.agentId,
    issueId: row.issueId,
    initialMessage: row.initialMessage,
    createdAt: row.createdAt,
  };
}

export async function ensurePaperclipCompany(
  schemaName: string,
  tenantId: string,
  tenantName: string,
  listCompanies: () => Promise<Array<{ id: string; description?: string | null }>>,
  createCompany: (name: string, marker: string) => Promise<{ id: string }>,
): Promise<string> {
  return withTenantSchema(schemaName, async (tx) => {
    await tx.$executeRaw`
      INSERT INTO paperclip_settings (singleton_id)
      VALUES (1)
      ON CONFLICT (singleton_id) DO NOTHING
    `;
    const [row] = await tx.$queryRaw<CompanyRow[]>`
      SELECT company_id AS "companyId"
      FROM paperclip_settings
      WHERE singleton_id = 1
      FOR UPDATE
    `;
    if (row?.companyId) return row.companyId;

    const marker = `saas-tenant:${tenantId}`;
    const matches = (await listCompanies()).filter(
      (company) => company.description === marker,
    );
    if (matches.length > 1) {
      throw new Error("Há mais de uma empresa Paperclip vinculada a este tenant.");
    }
    const company = matches[0] ?? (await createCompany(tenantName, marker));
    await tx.$executeRaw`
      UPDATE paperclip_settings
      SET company_id = ${company.id}, updated_at = NOW()
      WHERE singleton_id = 1
    `;
    return company.id;
  });
}

export async function createOrGetConversation(
  schemaName: string,
  ownerUserId: string,
  clientRequestId: string,
  agentId: string,
  title: string,
  initialMessage: string,
  createIssue: (conversationId: string) => Promise<{ id: string }>,
): Promise<PaperclipConversation> {
  return withTenantSchema(schemaName, async (tx) => {
    await tx.$executeRaw`
      INSERT INTO paperclip_settings (singleton_id)
      VALUES (1)
      ON CONFLICT (singleton_id) DO NOTHING
    `;
    await tx.$queryRaw`
      SELECT singleton_id
      FROM paperclip_settings
      WHERE singleton_id = 1
      FOR UPDATE
    `;
    const [existing] = await tx.$queryRaw<ConversationRow[]>`
      SELECT id, owner_user_id AS "ownerUserId",
        client_request_id AS "clientRequestId", agent_id AS "agentId",
        issue_id AS "issueId", title, initial_message AS "initialMessage",
        state, created_at AS "createdAt"
      FROM paperclip_conversations
      WHERE owner_user_id = ${ownerUserId}
        AND client_request_id = ${clientRequestId}
      FOR UPDATE
    `;
    if (existing) return mapConversation(existing);

    const id = randomUUID();
    await tx.$executeRaw`
      INSERT INTO paperclip_conversations (
        id, owner_user_id, client_request_id, agent_id, issue_id,
        title, initial_message, state
      )
      VALUES (
        ${id}::uuid, ${ownerUserId}, ${clientRequestId}::uuid, ${agentId},
        NULL, ${title}, ${initialMessage}, 'creating'
      )
    `;

    const issue = await createIssue(id);
    await tx.$executeRaw`
      UPDATE paperclip_conversations
      SET issue_id = ${issue.id}, state = 'pending', updated_at = NOW()
      WHERE id = ${id}::uuid
    `;
    const [created] = await tx.$queryRaw<ConversationRow[]>`
      SELECT id, owner_user_id AS "ownerUserId",
        client_request_id AS "clientRequestId", agent_id AS "agentId",
        issue_id AS "issueId", title, initial_message AS "initialMessage",
        state, created_at AS "createdAt"
      FROM paperclip_conversations
      WHERE id = ${id}::uuid
    `;
    return mapConversation(created);
  });
}

export async function listConversations(
  schemaName: string,
  ownerUserId: string,
): Promise<PaperclipConversation[]> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<ConversationRow[]>`
      SELECT id, owner_user_id AS "ownerUserId",
        client_request_id AS "clientRequestId", agent_id AS "agentId",
        issue_id AS "issueId", title, initial_message AS "initialMessage",
        state, created_at AS "createdAt"
      FROM paperclip_conversations
      WHERE owner_user_id = ${ownerUserId}
        AND state != 'failed'
      ORDER BY created_at DESC
      LIMIT 100
    `,
  );
  return rows.map(mapConversation);
}

export async function getConversation(
  schemaName: string,
  conversationId: string,
  ownerUserId: string,
): Promise<PaperclipConversation | null> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<ConversationRow[]>`
      SELECT id, owner_user_id AS "ownerUserId",
        client_request_id AS "clientRequestId", agent_id AS "agentId",
        issue_id AS "issueId", title, initial_message AS "initialMessage",
        state, created_at AS "createdAt"
      FROM paperclip_conversations
      WHERE id = ${conversationId}::uuid
        AND owner_user_id = ${ownerUserId}
      LIMIT 1
    `,
  );
  return rows[0] ? mapConversation(rows[0]) : null;
}

export async function setConversationActive(
  schemaName: string,
  conversationId: string,
  ownerUserId: string,
): Promise<void> {
  await withTenantSchema(schemaName, (tx) =>
    tx.$executeRaw`
      UPDATE paperclip_conversations
      SET state = 'active', initial_message = '', updated_at = NOW()
      WHERE id = ${conversationId}::uuid
        AND owner_user_id = ${ownerUserId}
        AND issue_id IS NOT NULL
    `,
  );
}

export async function listConversationOwners(
  schemaName: string,
): Promise<ConversationOwnerRow[]> {
  return withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<ConversationOwnerRow[]>`
      SELECT issue_id AS "issueId", owner_user_id AS "ownerUserId"
      FROM paperclip_conversations
      WHERE issue_id IS NOT NULL
        AND state IN ('pending', 'active')
    `,
  );
}
