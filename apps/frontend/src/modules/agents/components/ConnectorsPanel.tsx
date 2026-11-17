"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsConnector } from "@/types/agents.types";
import { CONNECTOR_KIND_HINTS } from "../lib/connectors";
import { errorMessage } from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";
import { ConnectorCreateForm } from "./ConnectorCreateForm";

export function ConnectorsPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [rows, setRows] = useState<AgentsConnector[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await agentsApiService.listConnectors({ limit: 50 }));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggle(connector: AgentsConnector) {
    setBusyId(connector.id);
    setError("");
    try {
      await agentsApiService.updateConnector(connector.id, {
        status: connector.status === "enabled" ? "disabled" : "enabled",
      });
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Connectors"
        description="List and configure tenant connectors. Secrets stay in env refs — never in source or plaintext payloads."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            {isAdmin ? (
              <Button
                size="sm"
                onClick={() => setCreating((value) => !value)}
              >
                <Plus className="mr-2 h-4 w-4" />
                New connector
              </Button>
            ) : null}
          </>
        }
      />

      {error ? (
        <div role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {creating && isAdmin ? (
        <ConnectorCreateForm
          onCreated={() => {
            setCreating(false);
            void refresh();
          }}
          onCancel={() => setCreating(false)}
          onError={setError}
        />
      ) : null}

      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No connectors yet. Fleet kinds mirror Traccar/Fleetbase/Fleetms host
          patterns; credentials belong in secret_ref env names.
        </p>
      ) : (
        rows.map((connector) => (
          <div key={connector.id} className="agents-row">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{connector.name}</p>
              <p className="agents-mono">
                {CONNECTOR_KIND_HINTS[connector.kind].label}
                {connector.config.host ? ` · ${connector.config.host}` : ""}
                {connector.secretRef ? ` · ref ${connector.secretRef}` : ""}
              </p>
            </div>
            <StatusChip kind="generic" status={connector.status} />
            {isAdmin ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === connector.id}
                onClick={() => void toggle(connector)}
              >
                {connector.status === "enabled" ? "Disable" : "Enable"}
              </Button>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
