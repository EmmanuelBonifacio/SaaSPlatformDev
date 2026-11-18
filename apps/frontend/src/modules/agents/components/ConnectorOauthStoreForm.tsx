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
        Store OAuth tokens for <span className="font-medium">{connectorName}</span>
        . Sent once over HTTPS; encrypted at rest. Never shown again.
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
        <Label htmlFor="mcp-refresh-token">Refresh token (optional)</Label>
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
          {busy ? "Saving..." : "Encrypt & store"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
