"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  connectorName: string;
  busy: boolean;
  onStore: (tokens: {
    accessToken: string;
    refreshToken: string | null;
  }) => Promise<void>;
  onCancel: () => void;
};

export function ConnectorOauthStoreForm({
  connectorName,
  busy,
  onStore,
  onCancel,
}: Props) {
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken.trim()) return;
    await onStore({
      accessToken: accessToken.trim(),
      refreshToken: refreshToken.trim() || null,
    });
    setAccessToken("");
    setRefreshToken("");
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="mb-4 space-y-3 rounded-lg border border-border p-3"
    >
      <p className="text-sm text-muted-foreground">
        Armazenar tokens OAuth de <span className="font-medium">{connectorName}</span>
        . Enviados uma vez via HTTPS; criptografados em repouso. Nunca exibidos de novo.
      </p>
      <div className="space-y-1">
        <Label htmlFor="mcp-access-token">Access token</Label>
        <Input
          id="mcp-access-token"
          type="password"
          autoComplete="off"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="mcp-refresh-token">Refresh token (opcional)</Label>
        <Input
          id="mcp-refresh-token"
          type="password"
          autoComplete="off"
          value={refreshToken}
          onChange={(e) => setRefreshToken(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy || !accessToken.trim()}>
          {busy ? "Salvando..." : "Criptografar e armazenar"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
