"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsSkill, AgentsSkillVersion } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage } from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";

export function SkillStudioPanel() {
  const base = useAgentsBasePath();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [skills, setSkills] = useState<AgentsSkill[]>([]);
  const [skillId, setSkillId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [changelog, setChangelog] = useState("");
  const [versions, setVersions] = useState<AgentsSkillVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refreshSkills = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await agentsApiService.listSkills({ limit: 50 });
      setSkills(rows);
      setSkillId((current) => current || rows[0]?.id || "");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSkills();
  }, [refreshSkills]);

  useEffect(() => {
    if (!skillId) {
      setInstructions("");
      setVersions([]);
      return;
    }
    const skill = skills.find((s) => s.id === skillId);
    setInstructions(skill?.instructions ?? "");
    let active = true;
    void (async () => {
      try {
        const rows = await agentsApiService.listSkillVersions(skillId);
        if (active) setVersions(rows);
      } catch (reason) {
        if (active) setError(errorMessage(reason));
      }
    })();
    return () => {
      active = false;
    };
  }, [skillId, skills]);

  async function publish() {
    if (!skillId || !isAdmin) return;
    setSaving(true);
    setError("");
    try {
      const result = await agentsApiService.publishSkillVersion(skillId, {
        instructions,
        changelog: changelog.trim() || null,
      });
      setSkills((prev) =>
        prev.map((s) => (s.id === skillId ? result.skill : s)),
      );
      setChangelog("");
      setVersions(await agentsApiService.listSkillVersions(skillId));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function restore(versionId: string) {
    if (!skillId || !isAdmin) return;
    setSaving(true);
    setError("");
    try {
      const skill = await agentsApiService.restoreSkillVersion(
        skillId,
        versionId,
      );
      setSkills((prev) => prev.map((s) => (s.id === skillId ? skill : s)));
      setInstructions(skill.instructions);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Studio de Skills"
        description="Edite instruções, publique versões e restaure o histórico. Sem segredos no texto da skill."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`${base}/skills`}>Catálogo</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refreshSkills()}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </>
        }
      />

      {error ? (
        <div role="alert" className="text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : skills.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma skill ainda. Crie uma no{" "}
          <Link href={`${base}/skills`} className="text-primary hover:underline">
            catálogo
          </Link>
          .
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)_16rem]">
          <div className="space-y-2">
            {skills.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => setSkillId(skill.id)}
                className={`w-full rounded-md border p-3 text-left text-sm ${
                  skillId === skill.id ? "border-foreground" : "border-border"
                }`}
              >
                <span className="font-medium">{skill.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {skill.slug}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={!isAdmin}
              rows={16}
              maxLength={20000}
              className="w-full rounded-md border bg-background p-3 font-mono text-sm"
            />
            <input
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              disabled={!isAdmin}
              placeholder="Changelog (opcional)"
              maxLength={1000}
              className="w-full rounded-md border bg-background p-2 text-sm"
            />
            {isAdmin ? (
              <Button
                type="button"
                disabled={saving || !skillId}
                onClick={() => void publish()}
              >
                {saving ? "Publicando..." : "Publicar versão"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Admin para publicar.</p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Versões</h3>
            {versions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma versão ainda.</p>
            ) : (
              versions.map((v) => (
                <div key={v.id} className="rounded-md border border-border p-2 text-xs">
                  <p className="font-medium">v{v.version}</p>
                  <p className="text-muted-foreground">
                    {new Date(v.createdAt).toLocaleString()}
                  </p>
                  {v.changelog ? (
                    <p className="mt-1 text-muted-foreground">{v.changelog}</p>
                  ) : null}
                  {isAdmin ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      disabled={saving}
                      onClick={() => void restore(v.id)}
                    >
                      Restaurar
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
