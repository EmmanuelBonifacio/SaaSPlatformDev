import { withTenantSchema } from "../../core/database/prisma";
import { AgentsModuleError } from "./agents.errors";
import type { CreateCommentDto } from "./agents.schema";
import type { ApprovalRecord, CommentRecord, RunRecord } from "./agents.types";
import {
  insertReceiptAttachment,
  listAttachmentsForComments,
} from "./agents.repository.comment-attachments";
import {
  AGENT_COLS,
  mapAgent,
  writeActivity,
  type AgentRow,
} from "./agents.repository.shared";

type CommentRow = {
  id: string;
  taskId: string;
  body: string;
  authorType: CommentRecord["authorType"];
  authorUserId: string | null;
  authorAgentId: string | null;
  clientRequestId: string | null;
  createdAt: Date;
};

type ApprovalRow = {
  id: string;
  type: string;
  status: ApprovalRecord["status"];
  payload: Record<string, unknown>;
  relatedTaskId: string | null;
  relatedRunId: string | null;
  requestedByUserId: string | null;
  decidedByUserId: string | null;
  decisionNote: string | null;
  decidedAt: Date | null;
  createdAt: Date;
};

function mapComment(
  row: CommentRow,
  attachments: CommentRecord["attachments"] = [],
): CommentRecord {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    attachments,
  };
}

async function withAttachments(
  schemaName: string,
  comments: CommentRow[],
): Promise<CommentRecord[]> {
  const byComment = await listAttachmentsForComments(
    schemaName,
    comments.map((c) => c.id),
  );
  return comments.map((row) => mapComment(row, byComment.get(row.id) ?? []));
}

function mapApproval(row: ApprovalRow): ApprovalRecord {
  return {
    ...row,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listComments(
  schemaName: string,
  taskId: string,
): Promise<CommentRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<CommentRow[]>`
      SELECT id, task_id AS "taskId", body,
        author_type AS "authorType",
        author_user_id AS "authorUserId",
        author_agent_id AS "authorAgentId",
        client_request_id AS "clientRequestId",
        created_at AS "createdAt"
      FROM agent_task_comments
      WHERE task_id = ${taskId}::uuid
      ORDER BY created_at ASC
      LIMIT 200
    `,
  );
  return withAttachments(schemaName, rows);
}

export async function createComment(
  schemaName: string,
  userId: string,
  taskId: string,
  input: CreateCommentDto,
): Promise<CommentRecord> {
  const comment = await withTenantSchema(schemaName, async (tx) => {
    const tasks = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM agent_tasks WHERE id = ${taskId}::uuid LIMIT 1
    `;
    if (!tasks[0]) {
      throw new AgentsModuleError(404, "Tarefa não encontrada.");
    }
    if (input.clientRequestId) {
      const existing = await tx.$queryRaw<CommentRow[]>`
        SELECT id, task_id AS "taskId", body,
          author_type AS "authorType",
          author_user_id AS "authorUserId",
          author_agent_id AS "authorAgentId",
          client_request_id AS "clientRequestId",
          created_at AS "createdAt"
        FROM agent_task_comments
        WHERE task_id = ${taskId}::uuid
          AND client_request_id = ${input.clientRequestId}::uuid
        LIMIT 1
      `;
      if (existing[0]) return existing[0];
    }
    const rows = await tx.$queryRaw<CommentRow[]>`
      INSERT INTO agent_task_comments (
        task_id, body, author_type, author_user_id, client_request_id
      ) VALUES (
        ${taskId}::uuid, ${input.body}, 'user', ${userId},
        ${input.clientRequestId ?? null}::uuid
      )
      RETURNING id, task_id AS "taskId", body,
        author_type AS "authorType",
        author_user_id AS "authorUserId",
        author_agent_id AS "authorAgentId",
        client_request_id AS "clientRequestId",
        created_at AS "createdAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "comment_created",
      entityType: "task",
      entityId: taskId,
    });
    return rows[0];
  });

  if (input.receipt) {
    const existing = await listAttachmentsForComments(schemaName, [comment.id]);
    const hasReceipt = (existing.get(comment.id) ?? []).some(
      (a) => a.kind === "receipt",
    );
    if (!hasReceipt) {
      await insertReceiptAttachment(schemaName, comment.id, {
        amountCents: input.receipt.amountCents,
        currency: input.receipt.currency,
        note: input.receipt.note,
      });
    }
  }

  const [withAtt] = await withAttachments(schemaName, [comment]);
  return withAtt;
}

export async function createRun(
  schemaName: string,
  userId: string,
  agentId: string,
  taskId: string | null,
): Promise<{ run: RunRecord; approval: ApprovalRecord | null }> {
  return withTenantSchema(schemaName, async (tx) => {
    const agents = await tx.$queryRaw<AgentRow[]>`
      SELECT ${AGENT_COLS} FROM agents WHERE id = ${agentId}::uuid LIMIT 1
    `;
    if (!agents[0]) {
      throw new AgentsModuleError(404, "Agente não encontrado.");
    }
    const agent = mapAgent(agents[0]);
    if (taskId) {
      const tasks = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM agent_tasks WHERE id = ${taskId}::uuid LIMIT 1
      `;
      if (!tasks[0]) {
        throw new AgentsModuleError(404, "Tarefa não encontrada.");
      }
    }
    const adapterType = agent.adapterType || "stub";
    const runRows = await tx.$queryRaw<
      Array<{
        id: string;
        agentId: string;
        taskId: string | null;
        status: RunRecord["status"];
        adapterType: string;
        requestedByUserId: string;
        errorMessage: string | null;
        summary: string | null;
        heartbeatAt: Date | null;
        startedAt: Date | null;
        finishedAt: Date | null;
        createdAt: Date;
      }>
    >`
      INSERT INTO agent_runs (
        agent_id, task_id, status, adapter_type, requested_by_user_id
      )
      VALUES (
        ${agentId}::uuid, ${taskId}::uuid, 'queued', ${adapterType}, ${userId}
      )
      RETURNING id, agent_id AS "agentId", task_id AS "taskId", status,
        adapter_type AS "adapterType",
        requested_by_user_id AS "requestedByUserId",
        error_message AS "errorMessage",
        summary,
        heartbeat_at AS "heartbeatAt",
        started_at AS "startedAt", finished_at AS "finishedAt",
        created_at AS "createdAt"
    `;
    const run: RunRecord = {
      ...runRows[0],
      adapterType: runRows[0].adapterType || adapterType,
      summary: runRows[0].summary ?? null,
      heartbeatAt: runRows[0].heartbeatAt?.toISOString() ?? null,
      startedAt: runRows[0].startedAt?.toISOString() ?? null,
      finishedAt: runRows[0].finishedAt?.toISOString() ?? null,
      createdAt: runRows[0].createdAt.toISOString(),
    };
    let approval: ApprovalRecord | null = null;
    if (agent.permissions.requireRunApproval) {
      const approvalRows = await tx.$queryRaw<ApprovalRow[]>`
        INSERT INTO agent_approvals (
          type, status, payload, related_task_id, related_run_id, requested_by_user_id
        ) VALUES (
          'agent_run', 'pending',
          ${JSON.stringify({ agentId, taskId })}::jsonb,
          ${taskId}::uuid, ${run.id}::uuid, ${userId}
        )
        RETURNING id, type, status, payload,
          related_task_id AS "relatedTaskId",
          related_run_id AS "relatedRunId",
          requested_by_user_id AS "requestedByUserId",
          decided_by_user_id AS "decidedByUserId",
          decision_note AS "decisionNote",
          decided_at AS "decidedAt",
          created_at AS "createdAt"
      `;
      approval = mapApproval(approvalRows[0]);
    }
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "run_requested",
      entityType: "run",
      entityId: run.id,
      agentId,
      runId: run.id,
    });
    return { run, approval };
  });
}

export async function listApprovals(
  schemaName: string,
  limit: number,
  offset: number,
  status?: ApprovalRecord["status"],
): Promise<ApprovalRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) => {
    if (status) {
      return tx.$queryRaw<ApprovalRow[]>`
        SELECT id, type, status, payload,
          related_task_id AS "relatedTaskId",
          related_run_id AS "relatedRunId",
          requested_by_user_id AS "requestedByUserId",
          decided_by_user_id AS "decidedByUserId",
          decision_note AS "decisionNote",
          decided_at AS "decidedAt",
          created_at AS "createdAt"
        FROM agent_approvals
        WHERE status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }
    return tx.$queryRaw<ApprovalRow[]>`
      SELECT id, type, status, payload,
        related_task_id AS "relatedTaskId",
        related_run_id AS "relatedRunId",
        requested_by_user_id AS "requestedByUserId",
        decided_by_user_id AS "decidedByUserId",
        decision_note AS "decisionNote",
        decided_at AS "decidedAt",
        created_at AS "createdAt"
      FROM agent_approvals
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  });
  return rows.map(mapApproval);
}

export async function decideApproval(
  schemaName: string,
  userId: string,
  approvalId: string,
  decision: "approved" | "rejected",
  decisionNote: string | null,
): Promise<{
  approval: ApprovalRecord;
  runIdToEnqueue: string | null;
}> {
  return withTenantSchema(schemaName, async (tx) => {
    const rows = await tx.$queryRaw<ApprovalRow[]>`
      UPDATE agent_approvals SET
        status = ${decision},
        decided_by_user_id = ${userId},
        decision_note = ${decisionNote},
        decided_at = NOW(),
        updated_at = NOW()
      WHERE id = ${approvalId}::uuid AND status = 'pending'
      RETURNING id, type, status, payload,
        related_task_id AS "relatedTaskId",
        related_run_id AS "relatedRunId",
        requested_by_user_id AS "requestedByUserId",
        decided_by_user_id AS "decidedByUserId",
        decision_note AS "decisionNote",
        decided_at AS "decidedAt",
        created_at AS "createdAt"
    `;
    if (!rows[0]) {
      throw new AgentsModuleError(404, "Aprovação pendente não encontrada.");
    }
    if (rows[0].relatedRunId && decision === "rejected") {
      await tx.$executeRaw`
        UPDATE agent_runs
        SET status = 'cancelled', finished_at = NOW(), updated_at = NOW(),
            error_message = 'Execução rejeitada na aprovação.'
        WHERE id = ${rows[0].relatedRunId}::uuid AND status = 'queued'
      `;
    }
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: `approval_${decision}`,
      entityType: "approval",
      entityId: rows[0].id,
      runId: rows[0].relatedRunId,
    });
    return {
      approval: mapApproval(rows[0]),
      runIdToEnqueue:
        decision === "approved" ? rows[0].relatedRunId : null,
    };
  });
}
