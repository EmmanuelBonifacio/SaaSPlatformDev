import type { PaperclipIssue } from "./paperclip.types";

export const PRIVATE_TASK_PREFIX = "__SAAS_CHAT_PRIVATE__:";

export function filterVisibleTasks(
  issues: PaperclipIssue[],
  owners: Array<{ issueId: string; ownerUserId: string }>,
  userId: string,
) {
  const ownerByIssue = new Map(owners.map((row) => [row.issueId, row.ownerUserId]));
  return issues
    .filter((issue) => {
      if (issue.title.startsWith(PRIVATE_TASK_PREFIX)) return false;
      const owner = ownerByIssue.get(issue.id);
      return owner === undefined || owner === userId;
    })
    .map((issue) => ({
      id: issue.id,
      identifier: issue.identifier ?? null,
      title: issue.title,
      status: issue.status,
      priority: issue.priority ?? null,
      assigneeAgentId: issue.assigneeAgentId ?? null,
      updatedAt: issue.updatedAt ?? null,
    }));
}
