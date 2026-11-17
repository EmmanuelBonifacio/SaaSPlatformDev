"use client";

import Link from "next/link";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { PageHeader } from "./board/PageHeader";

type Props = {
  title: string;
  summary: string;
};

/** Honest placeholder for Paperclip surfaces without native API yet. */
export function GovernancePlaceholder({ title, summary }: Props) {
  const base = useAgentsBasePath();
  return (
    <div>
      <PageHeader title={title} description={summary} />
      <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        <p>
          Nav parity with Paperclip. Native persistence / endpoints for this
          domain are not in V1 — no invented DDL, no DROP of{" "}
          <code className="agents-mono">paperclip_*</code>.
        </p>
        <Link
          href={`${base}/settings`}
          className="mt-3 inline-block text-primary hover:underline"
        >
          Module settings
        </Link>
      </div>
    </div>
  );
}
