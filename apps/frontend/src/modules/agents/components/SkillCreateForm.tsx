"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsSkill } from "@/types/agents.types";
import { errorMessage } from "../lib/agents-ui";

type Props = {
  onCreated: (skill: AgentsSkill) => void;
  onCancel: () => void;
  onError: (message: string) => void;
};

export function SkillCreateForm({ onCreated, onCancel, onError }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const skill = await agentsApiService.createSkill({
        name: name.trim(),
        description: description.trim() || null,
        instructions: instructions.trim(),
      });
      onCreated(skill);
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
      <div className="space-y-1">
        <Label htmlFor="skill-name">Nome</Label>
        <Input
          id="skill-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={160}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="skill-desc">Descrição</Label>
        <Input
          id="skill-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="skill-instructions">Instruções</Label>
        <textarea
          id="skill-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          maxLength={20000}
          rows={4}
          className="w-full rounded-md border bg-background p-2 text-sm"
        />
      </div>
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
