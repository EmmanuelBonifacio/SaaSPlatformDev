import { memoryService } from "./memory.service";
import type { MemoryCategory } from "./memory.types";

const MAX_CAPTURE_CONTENT = 800;
const MAX_TITLE = 120;

export type AuthenticatedAgentMemoryResult = {
  memoryContext: string | null;
  memoryCaptureCreated: boolean;
};

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function buildConversationCandidate(message: string): {
  title: string;
  content: string;
  category: MemoryCategory;
} {
  const content = compactWhitespace(message).slice(0, MAX_CAPTURE_CONTENT);
  const title =
    content.length <= MAX_TITLE
      ? content || "Preferência da conversa"
      : `${content.slice(0, MAX_TITLE - 1)}…`;
  return {
    title,
    content: content || "Contexto capturado da conversa autenticada.",
    category: "context",
  };
}

/**
 * Captura opt-in (rascunho) e recupera memórias aprovadas no SaaS.
 * Nunca encaminha o contexto para runtimes externos (Paperclip remoto, WhatsApp).
 */
export async function wireAuthenticatedAgentMemory(input: {
  schemaName: string;
  userId: string;
  message: string;
  sourceReference: string;
}): Promise<AuthenticatedAgentMemoryResult> {
  const candidate = buildConversationCandidate(input.message);
  let memoryCaptureCreated = false;

  try {
    const capture = await memoryService.suggestFromConversation(
      input.schemaName,
      { userId: input.userId },
      {
        ...candidate,
        sourceReference: input.sourceReference.slice(0, 240),
      },
    );
    memoryCaptureCreated = capture.created;
  } catch {
    memoryCaptureCreated = false;
  }

  let memoryContext: string | null = null;
  try {
    const recovered = await memoryService.searchForAgent(
      input.schemaName,
      input.userId,
      candidate.title.slice(0, 160),
    );
    memoryContext = recovered || null;
  } catch {
    memoryContext = null;
  }

  return { memoryContext, memoryCaptureCreated };
}
