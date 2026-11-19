/**
 * Adapter Cursor via CLI local (fail-closed se binário indisponível).
 * Spawn sem shell; binários allowlisted; secrets só via env refs.
 */

import { spawn } from "node:child_process";
import { accessSync, constants as fsConstants } from "node:fs";
import path from "node:path";
import {
  buildRunPrompt,
  resolveSecretValue,
  type AdapterContext,
  type AgentAdapter,
  type AdapterResult,
  type HeartbeatFn,
} from "./agents.adapters.shared";

const CURSOR_BINARIES = ["agent", "cursor"] as const;
const CLI_TIMEOUT_MS = 60_000;

function whichBinary(name: string): string | null {
  const pathEnv = process.env.PATH ?? "";
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, name);
    try {
      accessSync(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // continue
    }
  }
  return null;
}

function resolveCursorBinary(): string | null {
  for (const name of CURSOR_BINARIES) {
    const found = whichBinary(name);
    if (found) return found;
  }
  return null;
}

function safeCwd(workingDirectory: string | undefined): string {
  if (!workingDirectory?.trim()) return process.cwd();
  const resolved = path.resolve(workingDirectory.trim());
  if (!resolved.startsWith(process.cwd())) return process.cwd();
  return resolved;
}

function buildChildEnv(ctx: AdapterContext): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    LANG: process.env.LANG,
    NODE_ENV: process.env.NODE_ENV,
  };
  for (const ref of ctx.secretRefs) {
    const stored = ref.storedValue?.trim();
    if (stored) {
      env[ref.envRef] = stored;
      continue;
    }
    const fromEnv = process.env[ref.envRef];
    if (fromEnv) env[ref.envRef] = fromEnv;
  }
  const cursorKey = resolveSecretValue(ctx.secretRefs, [
    "CURSOR_API_KEY",
    "CURSOR_AGENT_KEY",
  ]);
  if (cursorKey) env.CURSOR_API_KEY = cursorKey;
  return env;
}

function runCli(
  binary: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(binary, args, {
      cwd,
      env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, CLI_TIMEOUT_MS);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > 20_000) stdout = stdout.slice(0, 20_000);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 8_000) stderr = stderr.slice(0, 8_000);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: stderr || "spawn_error", timedOut });
    });
  });
}

function fail(
  summary: string,
  errorMessage: string,
  ctx: AdapterContext,
): AdapterResult {
  return {
    ok: false,
    summary,
    errorMessage: errorMessage.slice(0, 200),
    commentBody: ctx.taskId
      ? `[run ${ctx.runId.slice(0, 8)}] ${summary}`
      : undefined,
  };
}

export const cursorCliAdapter: AgentAdapter = {
  type: "cursor",
  async execute(ctx, heartbeat) {
    return runCursor(ctx, heartbeat);
  },
};

async function runCursor(
  ctx: AdapterContext,
  heartbeat: HeartbeatFn,
): Promise<AdapterResult> {
  await heartbeat("resolving_cli");
  const binary = resolveCursorBinary();
  if (!binary) {
    return fail(
      "Cursor CLI indisponível neste host (binários agent/cursor não encontrados).",
      "CursorCliUnavailable",
      ctx,
    );
  }

  await heartbeat("spawning_cursor");
  const prompt = buildRunPrompt(ctx);
  const cwd = safeCwd(ctx.harness.workingDirectory);
  const env = buildChildEnv(ctx);
  const baseName = path.basename(binary);
  const args =
    baseName === "cursor"
      ? ["agent", "-p", "--print", prompt.slice(0, 12_000)]
      : ["-p", "--print", prompt.slice(0, 12_000)];

  const result = await runCli(binary, args, cwd, env);
  if (result.timedOut) {
    return fail("Cursor CLI excedeu o timeout.", "CursorCliTimeout", ctx);
  }
  if ((result.code ?? 1) !== 0) {
    return fail(
      `Cursor CLI saiu com código ${result.code ?? -1}.`,
      (result.stderr || "CursorCliExit").slice(0, 200),
      ctx,
    );
  }
  await heartbeat("cursor_ok");
  const text = (result.stdout || "Cursor concluiu sem stdout.").trim();
  const summary = `Cursor CLI: ${text.slice(0, 500)}`;
  return {
    ok: true,
    summary,
    spendCents: 5,
    inputTokens: 0,
    outputTokens: 0,
    provider: "cursor_cli",
    commentBody: ctx.taskId
      ? `[run ${ctx.runId.slice(0, 8)}] ${summary}`
      : undefined,
  };
}
