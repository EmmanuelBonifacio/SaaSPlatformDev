"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsAgent, AgentsSkill } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage } from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";
import { SkillDetailCard } from "./SkillDetailCard";
import { SkillCreateForm } from "./SkillCreateForm";

export function SkillsPanel() {
  const base = useAgentsBasePath();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [skills, setSkills] = useState<AgentsSkill[]>([]);
  const [agents, setAgents] = useState<AgentsAgent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [skillRows, agentRows] = await Promise.all([
        agentsApiService.listSkills({ limit: 50 }),
        agentsApiService.listAgents(),
      ]);
      setSkills(skillRows);
      setAgents(agentRows);
      if (selectedId && !skillRows.some((row) => row.id === selectedId)) {
        setSelectedId(skillRows[0]?.id ?? null);
      } else if (!selectedId && skillRows[0]) {
        setSelectedId(skillRows[0].id);
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = skills.find((skill) => skill.id === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        title="Skills"
        description="Catálogo de skills do tenant — armazenar, listar e vincular a agentes."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`${base}/skills/studio`}>Studio</Link>
            </Button>
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
                Nova skill
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
        <SkillCreateForm
          onCreated={(skill) => {
            setCreating(false);
            setSelectedId(skill.id);
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
      ) : skills.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma skill ainda. {isAdmin ? "Crie uma para vincular a agentes." : ""}
        </p>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="min-w-0 flex-1">
            {skills.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => setSelectedId(skill.id)}
                className="agents-row w-full text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{skill.name}</p>
                  <p className="agents-mono">{skill.slug}</p>
                </div>
                <StatusChip kind="generic" status={skill.status} />
              </button>
            ))}
          </div>
          {selected ? (
            <SkillDetailCard
              skill={selected}
              agents={agents}
              isAdmin={isAdmin}
              onChanged={() => void refresh()}
              onError={setError}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
