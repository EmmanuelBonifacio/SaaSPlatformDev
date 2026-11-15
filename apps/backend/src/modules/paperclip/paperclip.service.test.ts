import { describe, expect, it } from "vitest";
import {
  createConversationSchema,
  sendMessageSchema,
} from "./paperclip.schema";
import {
  filterVisibleTasks,
  PRIVATE_TASK_PREFIX,
} from "./paperclip.presentation";

const task = (id: string, title: string) => ({
  id,
  title,
  status: "todo",
  description: null,
});

describe("paperclip tenant and user boundaries", () => {
  it("hides another user's conversation and unfinished private tasks", () => {
    const visible = filterVisibleTasks(
      [
        task("shared", "Tarefa do tenant"),
        task("mine", "Minha conversa"),
        task("other", "Conversa privada"),
        task("orphan", `${PRIVATE_TASK_PREFIX}pending`),
      ],
      [
        { issueId: "mine", ownerUserId: "user-a" },
        { issueId: "other", ownerUserId: "user-b" },
      ],
      "user-a",
    );

    expect(visible.map((item) => item.id)).toEqual(["shared", "mine"]);
  });

  it("rejects malformed or oversized chat messages", () => {
    const validRequestId = "fe0a7f68-c677-4a43-8409-41e13bc471bb";
    expect(
      createConversationSchema.safeParse({
        agentId: "agent-1",
        clientRequestId: validRequestId,
        message: "Olá",
      }).success,
    ).toBe(true);
    expect(
      sendMessageSchema.safeParse({
        clientRequestId: validRequestId,
        message: "a".repeat(4001),
      }).success,
    ).toBe(false);
    expect(
      sendMessageSchema.safeParse({
        clientRequestId: "not-a-uuid",
        message: "Olá",
      }).success,
    ).toBe(false);
  });
});
