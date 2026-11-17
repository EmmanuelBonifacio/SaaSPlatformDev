"use client";

import { useCallback, useEffect, useState } from "react";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsTool } from "@/types/agents.types";
import { AGENT_TOOL_KEYS, errorMessage } from "../../lib/agents-ui";

type Props = { agentId: string; canEdit: boolean };

export function AgentToolsPanel({ agentId, canEdit }: Props) {
  const [rows, setRows] = useState<AgentsTool[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setRows(await agentsApiService.listTools(agentId));
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(toolKey: string, enabled: boolean) {
    if (!canEdit) return;
    setSaving(toolKey);
    setError("");
    try {
      await agentsApiService.upsertTool(agentId, { toolKey, enabled });
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(null);
    }
  }

  const byKey = new Map(rows.map((row) => [row.toolKey, row]));

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Enable tools the agent may use. External harnesses still need SP-31+ wiring.
      </p>
      {error ? (
        <div role="alert" className="text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <ul className="space-y-2">
        {AGENT_TOOL_KEYS.map((toolKey) => {
          const enabled = Boolean(byKey.get(toolKey)?.enabled);
          return (
            <li key={toolKey} className="agents-row">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{toolKey}</p>
                <p className="agents-mono">{enabled ? "enabled" : "off"}</p>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  disabled={saving === toolKey}
                  onClick={() => void toggle(toolKey, !enabled)}
                  className="rounded-md border px-3 py-1 text-xs"
                >
                  {enabled ? "Disable" : "Enable"}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
