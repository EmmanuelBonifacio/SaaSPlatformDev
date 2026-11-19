"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agentsApiService } from "@/services/agents.service";
import type { ConnectorKind } from "@/types/agents.types";
import {
  CONNECTOR_KIND_HINTS,
  CONNECTOR_KINDS,
} from "../lib/connectors";
import { errorMessage } from "../lib/agents-ui";

type Props = {
  onCreated: () => void;
  onCancel: () => void;
  onError: (message: string) => void;
};

export function ConnectorCreateForm({ onCreated, onCancel, onError }: Props) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ConnectorKind>("webhook");
  const [host, setHost] = useState("");
  const [path, setPath] = useState("");
  const [secretRef, setSecretRef] = useState("");
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [oauthClientIdRef, setOauthClientIdRef] = useState("");
  const [oauthClientSecretRef, setOauthClientSecretRef] = useState("");
  const [saving, setSaving] = useState(false);

  function onKindChange(next: ConnectorKind) {
    setKind(next);
    const hint = CONNECTOR_KIND_HINTS[next].hostHint;
    if (hint && !host) setHost(hint);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await agentsApiService.createConnector({
        name: name.trim(),
        kind,
        config: {
          host: host.trim() || undefined,
          path: path.trim() || undefined,
          gatewayUrl: gatewayUrl.trim() || undefined,
        },
        secretRef: secretRef.trim() || null,
        oauthClientIdRef: oauthClientIdRef.trim() || null,
        oauthClientSecretRef: oauthClientSecretRef.trim() || null,
        status: "disabled",
      });
      onCreated();
    } catch (reason) {
      onError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-4 space-y-3 rounded-lg border border-border p-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="conn-name">Nome</Label>
          <Input
            id="conn-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={160}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="conn-kind">Tipo</Label>
          <select
            id="conn-kind"
            value={kind}
            onChange={(e) => onKindChange(e.target.value as ConnectorKind)}
            className="w-full rounded-md border bg-background p-2 text-sm"
          >
            {CONNECTOR_KINDS.map((value) => (
              <option key={value} value={value}>
                {CONNECTOR_KIND_HINTS[value].label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="conn-host">Host (não secreto)</Label>
          <Input
            id="conn-host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            maxLength={500}
            placeholder={CONNECTOR_KIND_HINTS[kind].hostHint}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="conn-path">Path</Label>
          <Input
            id="conn-path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            maxLength={200}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="conn-secret-ref">Ref de segredo (somente nome da env)</Label>
        <Input
          id="conn-secret-ref"
          value={secretRef}
          onChange={(e) => setSecretRef(e.target.value.toUpperCase())}
          maxLength={128}
          placeholder="TRACCAR_PASSWORD"
          pattern="^[A-Z][A-Z0-9_]*$"
        />
        <p className="text-xs text-muted-foreground">
          Nunca cole senhas/tokens aqui — apenas o nome da variável de ambiente.
        </p>
      </div>
      {kind === "mcp" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="conn-gateway">URL do gateway</Label>
            <Input
              id="conn-gateway"
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              maxLength={500}
              placeholder="https://mcp.example.com"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="conn-oauth-client">Env do OAuth client id</Label>
            <Input
              id="conn-oauth-client"
              value={oauthClientIdRef}
              onChange={(e) => setOauthClientIdRef(e.target.value.toUpperCase())}
              maxLength={128}
              placeholder="MCP_CLIENT_ID"
              pattern="^[A-Z][A-Z0-9_]*$"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="conn-oauth-secret">Env do OAuth client secret</Label>
            <Input
              id="conn-oauth-secret"
              value={oauthClientSecretRef}
              onChange={(e) =>
                setOauthClientSecretRef(e.target.value.toUpperCase())
              }
              maxLength={128}
              placeholder="MCP_CLIENT_SECRET"
              pattern="^[A-Z][A-Z0-9_]*$"
            />
          </div>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving || !name.trim()}>
          Criar
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
