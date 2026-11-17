"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsAgent, AgentsTask } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage } from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";

const PINS_KEY = "agents.chat.pins";

function readPins(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function writePins(ids: string[]) {
  window.localStorage.setItem(PINS_KEY, JSON.stringify(ids.slice(0, 40)));
}

/**
 * Chat surface: private tasks are conversation threads (V1). Pins are local.
 * Dedicated realtime chat / Slack connectors remain out of scope.
 */
export function ChatsPanel() {
  const base = useAgentsBasePath();
  const router = useRouter();
  const [tasks, setTasks] = useState<AgentsTask[]>([]);
  const [agents, setAgents] = useState<AgentsAgent[]>([]);
  const [pins, setPins] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [agentId, setAgentId] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [taskRows, agentRows] = await Promise.all([
        agentsApiService.listTasks(),
        agentsApiService.listAgents(),
      ]);
      setTasks(taskRows.filter((t) => t.visibility === "private"));
      setAgents(agentRows);
      setPins(readPins());
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!agentId && agents[0]) setAgentId(agents[0].id);
  }, [agents, agentId]);

  function agentName(id: string | null): string {
    if (!id) return "Unassigned";
    return agents.find((a) => a.id === id)?.name ?? "Agent";
  }

  function togglePin(taskId: string) {
    setPins((prev) => {
      const next = prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [taskId, ...prev];
      writePins(next);
      return next;
    });
  }

  async function startChat() {
    if (!agentId || !title.trim()) return;
    setCreating(true);
    setError("");
    try {
      const task = await agentsApiService.createTask({
        title: title.trim(),
        visibility: "private",
        assigneeAgentId: agentId,
        status: "in_progress",
        priority: "medium",
      });
      setTitle("");
      router.push(`${base}/tasks/${task.id}`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setCreating(false);
    }
  }

  const ordered = useMemo(() => {
    const pinSet = new Set(pins);
    const pinned = tasks.filter((t) => pinSet.has(t.id));
    const rest = tasks.filter((t) => !pinSet.has(t.id));
    return [...pinned, ...rest];
  }, [tasks, pins]);

  return (
    <div>
      <PageHeader
        title="Chat"
        description="Private task threads with agents. Pin locally; hand off by opening the task."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="mb-4 space-y-2 rounded-lg border border-border p-3">
        <p className="agents-section-label">New conversation</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="rounded-md border bg-background p-2 text-sm sm:w-48"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Thread title"
            className="flex-1"
            maxLength={255}
          />
          <Button
            size="sm"
            disabled={creating || !agentId || !title.trim()}
            onClick={() => void startChat()}
          >
            Start
          </Button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No private conversations yet. Start one above.
        </p>
      ) : (
        ordered.map((task) => {
          const pinned = pins.includes(task.id);
          return (
            <div key={task.id} className="agents-row">
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={pinned ? "Unpin" : "Pin"}
                onClick={() => togglePin(task.id)}
              >
                <Pin
                  className={`h-4 w-4 ${pinned ? "fill-current text-foreground" : ""}`}
                />
              </button>
              <Link
                href={`${base}/tasks/${task.id}`}
                className="min-w-0 flex-1"
              >
                <p className="truncate text-sm font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {agentName(task.assigneeAgentId)}
                </p>
              </Link>
              <StatusChip kind="task" status={task.status} />
            </div>
          );
        })
      )}
    </div>
  );
}
