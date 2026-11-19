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
import { ConnectorOauthStoreForm } from "./ConnectorOauthStoreForm";

export function ConnectorsPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [rows, setRows] = useState<AgentsConnector[]>([]);
  const [gateways, setGateways] = useState<AgentsConnector[]>([]);
  const [creating, setCreating] = useState(false);
  const [storeForId, setStoreForId] = useState<string | null>(null);
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
          ? `Autorize em ${result.authorizeUrl} e depois armazene os tokens (criptografados no tenant).`
          : "OAuth pendente. Defina gatewayUrl/host, autorize externamente e depois armazene os tokens.",
      );
      setStoreForId(connector.id);
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusyId(null);
    }
  }

  async function storeTokens(
    connector: AgentsConnector,
    tokens: { accessToken: string; refreshToken: string | null },
  ) {
    setBusyId(connector.id);
    setError("");
    try {
      await agentsApiService.completeConnectorOauth(connector.id, {
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      setStoreForId(null);
      setOauthHint("Tokens criptografados e armazenados para este conector do tenant.");
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusyId(null);
    }
  }

  async function oauthRefresh(connector: AgentsConnector) {
    setBusyId(connector.id);
    setError("");
    try {
      await agentsApiService.refreshConnectorOauth(connector.id, {});
      setOauthHint("Refresh do token concluído (ciphertext atualizado).");
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusyId(null);
    }
  }

  async function oauthDesconectar(connector: AgentsConnector) {
    setBusyId(connector.id);
    setError("");
    try {
      await agentsApiService.disconnectConnectorOauth(connector.id);
      setStoreForId(null);
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusyId(null);
    }
  }

  const storeTarget = gateways.find((g) => g.id === storeForId) ?? null;

  return (
    <div>
      <PageHeader
        title="Conectores / gateways MCP"
        description="BYO MCP OAuth: tokens criptografados em repouso por tenant. Apenas refs de env para credenciais do app — nunca registre tokens em log."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            {isAdmin ? (
              <Button
                size="sm"
                onClick={() => setCreating((value) => !value)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo conector
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

      {storeTarget && isAdmin ? (
        <ConnectorOauthStoreForm
          connectorName={storeTarget.name}
          busy={busyId === storeTarget.id}
          onStore={(tokens) => storeTokens(storeTarget, tokens)}
          onCancel={() => setStoreForId(null)}
        />
      ) : null}

      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <h3 className="mb-2 text-sm font-semibold">Gateways MCP</h3>
          {gateways.length === 0 ? (
            <p className="mb-4 text-sm text-muted-foreground">
              Nenhum conector MCP ainda. Crie kind=mcp com gatewayUrl + refs de env
              do client OAuth.
            </p>
          ) : (
            gateways.map((connector) => (
              <div key={`gw-${connector.id}`} className="agents-row">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {connector.name}
                  </p>
                  <p className="agents-mono">
                    oauth {connector.oauthStatus || "disconnected"}
                    {connector.oauthToken?.hasAccessToken
                      ? " · token armazenado"
                      : " · sem token"}
                    {connector.oauthToken?.hasRefreshToken
                      ? " · renovável"
                      : ""}
                    {connector.config.gatewayUrl || connector.config.host
                      ? ` · ${connector.config.gatewayUrl || connector.config.host}`
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
                      Iniciar OAuth
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === connector.id}
                      onClick={() => setStoreForId(connector.id)}
                    >
                      Armazenar tokens
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        busyId === connector.id ||
                        !connector.oauthToken?.hasRefreshToken
                      }
                      onClick={() => void oauthRefresh(connector)}
                    >
                      Atualizar token
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === connector.id}
                      onClick={() => void oauthDesconectar(connector)}
                    >
                      Desconectar
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}

          <h3 className="mb-2 mt-6 text-sm font-semibold">Todos os conectores</h3>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum conector ainda.</p>
          ) : (
            rows.map((connector) => (
              <div key={connector.id} className="agents-row">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {connector.name}
                  </p>
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
                    {connector.status === "enabled" ? "Desativar" : "Ativar"}
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
