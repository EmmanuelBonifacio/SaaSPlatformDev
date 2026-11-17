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
  const [gateways, setGateways] = useState<AgentsConnector[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [oauthHint, setOauthHint] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [all, mcp] = await Promise.all([
        agentsApiService.listConnectors({ limit: 50 }),
        agentsApiService.listMcpGateways(),
      ]);
      setRows(all);
      setGateways(mcp);
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

  async function oauthStart(connector: AgentsConnector) {
    setBusyId(connector.id);
    setError("");
    setOauthHint("");
    try {
      const result = await agentsApiService.startConnectorOauth(connector.id);
      setOauthHint(
        result.authorizeUrl
          ? `Authorize at ${result.authorizeUrl} (complete OAuth externally; tokens stay in env — mark complete when done).`
          : "OAuth pending. Set gatewayUrl/host on the MCP connector, then complete after external auth.",
      );
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusyId(null);
    }
  }

  async function oauthComplete(connector: AgentsConnector, success: boolean) {
    setBusyId(connector.id);
    setError("");
    try {
      await agentsApiService.completeConnectorOauth(connector.id, { success });
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusyId(null);
    }
  }

  async function oauthDisconnect(connector: AgentsConnector) {
    setBusyId(connector.id);
    setError("");
    try {
      await agentsApiService.disconnectConnectorOauth(connector.id);
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
        title="Connectors / MCP gateways"
        description="Configure connectors. MCP OAuth stores client env refs only — never tokens."
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
      {oauthHint ? (
        <p className="mb-3 text-sm text-muted-foreground">{oauthHint}</p>
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
      ) : (
        <>
          <h3 className="mb-2 text-sm font-semibold">MCP gateways</h3>
          {gateways.length === 0 ? (
            <p className="mb-4 text-sm text-muted-foreground">
              No MCP connectors yet. Create kind=mcp with gatewayUrl + oauth client env refs.
            </p>
          ) : (
            gateways.map((connector) => (
              <div key={`gw-${connector.id}`} className="agents-row">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{connector.name}</p>
                  <p className="agents-mono">
                    oauth {connector.oauthStatus || "disconnected"}
                    {connector.config.gatewayUrl || connector.config.host
                      ? ` · ${connector.config.gatewayUrl || connector.config.host}`
                      : ""}
                    {connector.oauthClientIdRef
                      ? ` · client ${connector.oauthClientIdRef}`
                      : ""}
                  </p>
                </div>
                <StatusChip
                  kind="generic"
                  status={connector.oauthStatus || "disconnected"}
                />
                {isAdmin ? (
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === connector.id}
                      onClick={() => void oauthStart(connector)}
                    >
                      Start OAuth
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === connector.id}
                      onClick={() => void oauthComplete(connector, true)}
                    >
                      Mark connected
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === connector.id}
                      onClick={() => void oauthDisconnect(connector)}
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}

          <h3 className="mb-2 mt-6 text-sm font-semibold">All connectors</h3>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No connectors yet.</p>
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
        </>
      )}
    </div>
  );
}
