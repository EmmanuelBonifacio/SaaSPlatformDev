"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgentsOpError } from "../../lib/agents-op-error";

export function AgentsLoadingState({ label = "Carregando…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-32 flex-col items-center justify-center gap-2 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle className="h-6 w-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function AgentsEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; href?: string };
}) {
  return (
    <div className="flex min-h-32 flex-col items-start justify-center gap-2 rounded-md border border-dashed px-4 py-6">
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action?.onClick ? (
        <Button type="button" size="sm" variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
      {action?.href ? (
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function AgentsErrorAlert({
  error,
  onDismiss,
}: {
  error: string | AgentsOpError;
  onDismiss?: () => void;
}) {
  const message = typeof error === "string" ? error : error.message;
  const code = typeof error === "string" ? undefined : error.code;
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-3 flex items-start justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      <div>
        {code ? (
          <p className="mb-0.5 text-xs uppercase tracking-wide opacity-80">
            {code.replaceAll("_", " ")}
          </p>
        ) : null}
        <p>{message}</p>
      </div>
      {onDismiss ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="shrink-0 text-destructive"
          onClick={onDismiss}
        >
          Fechar
        </Button>
      ) : null}
    </div>
  );
}

export function AgentsSuccessAlert({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-3 flex items-start justify-between gap-3 rounded-md border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200"
    >
      <p>{message}</p>
      {onDismiss ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="shrink-0"
          onClick={onDismiss}
        >
          Fechar
        </Button>
      ) : null}
    </div>
  );
}
