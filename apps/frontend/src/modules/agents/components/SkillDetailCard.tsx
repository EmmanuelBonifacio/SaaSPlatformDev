"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import type {
  AgentsAgent,
  AgentsSkill,
  AgentsSkillAttachment,
} from "@/types/agents.types";
import { errorMessage } from "../lib/agents-ui";
import { StatusChip } from "./board/StatusChip";

type Props = {
  skill: AgentsSkill;
  agents: AgentsAgent[];
  isAdmin: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
};

export function SkillDetailCard({
  skill,
  agents,
  isAdmin,
  onChanged,
  onError,
}: Props) {
  const [attachments, setAttachments] = useState<AgentsSkillAttachment[]>([]);
  const [agentId, setAgentId] = useState("");
  const [busy, setBusy] = useState(false);

  const loadAttachments = useCallback(async () => {
    try {
      setAttachments(await agentsApiService.listSkillAttachments(skill.id));
    } catch (reason) {
      onError(errorMessage(reason));
    }
  }, [skill.id, onError]);

  useEffect(() => {
    void loadAttachments();
  }, [loadAttachments]);

  async function toggleStatus() {
    setBusy(true);
    try {
      await agentsApiService.updateSkill(skill.id, {
        status: skill.status === "active" ? "disabled" : "active",
      });
      onChanged();
    } catch (reason) {
      onError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function attach() {
    if (!agentId) return;
    setBusy(true);
    try {
      await agentsApiService.attachSkill(skill.id, agentId);
      setAgentId("");
      await loadAttachments();
      onChanged();
    } catch (reason) {
      onError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function detach(targetAgentId: string) {
    setBusy(true);
    try {
      await agentsApiService.detachSkill(skill.id, targetAgentId);
      await loadAttachments();
      onChanged();
    } catch (reason) {
      onError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="w-full space-y-3 rounded-lg border border-border p-3 lg:w-80 lg:shrink-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{skill.name}</p>
          <p className="agents-mono">{skill.slug}</p>
        </div>
        <StatusChip kind="generic" status={skill.status} />
      </div>
      {skill.description ? (
        <p className="text-sm text-muted-foreground">{skill.description}</p>
      ) : null}
      {skill.instructions ? (
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-xs">
          {skill.instructions}
        </pre>
      ) : null}

      {isAdmin ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void toggleStatus()}
        >
          {skill.status === "active" ? "Disable" : "Enable"}
        </Button>
      ) : null}

      <div className="space-y-2">
        <p className="agents-section-label">Attached agents</p>
        {attachments.length === 0 ? (
          <p className="text-xs text-muted-foreground">None yet.</p>
        ) : (
          attachments.map((row) => {
            const agent = agents.find((item) => item.id === row.agentId);
            return (
              <div key={row.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-sm">
                  {agent?.name ?? row.agentId.slice(0, 8)}
                </span>
                {isAdmin ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void detach(row.agentId)}
                  >
                    Detach
                  </Button>
                ) : null}
              </div>
            );
          })
        )}
        {isAdmin ? (
          <div className="flex gap-2">
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="min-w-0 flex-1 rounded-md border bg-background p-2 text-sm"
            >
              <option value="">Attach agent…</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={!agentId || busy}
              onClick={() => void attach()}
            >
              Attach
            </Button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
