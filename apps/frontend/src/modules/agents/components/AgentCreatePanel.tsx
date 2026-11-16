"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agentsApiService } from "@/services/agents.service";
import { useAuth } from "@/hooks/useAuth";
import type { CreateAgentInput } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage } from "../lib/agents-ui";
import { AgentForm } from "./AgentForm";

export function AgentCreatePanel() {
  const base = useAgentsBasePath();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function create(input: CreateAgentInput) {
    setSaving(true);
    setError("");
    try {
      const agent = await agentsApiService.createAgent(input);
      router.push(`${base}/${agent.id}`);
    } catch (reason) {
      setError(errorMessage(reason));
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Apenas administradores podem criar agentes.
        </p>
        <Link href={`${base}/list`} className="text-sm text-primary hover:underline">
          Voltar à lista
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href={`${base}/list`} className="text-sm text-muted-foreground hover:underline">
        ← Agentes
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Novo agente</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div
              role="alert"
              className="mb-3 rounded-md border border-destructive/40 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}
          <AgentForm mode="create" submitting={saving} onSubmit={create} />
        </CardContent>
      </Card>
    </div>
  );
}
