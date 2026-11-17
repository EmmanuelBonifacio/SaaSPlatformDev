"use client";

import { PageHeader } from "./PageHeader";

type Props = {
  title: string;
  description: string;
};

export function WorkPlaceholder({ title, description }: Props) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Surface aligned to Paperclip nav. Native SaaS API for this domain is
          not available yet — no invented DDL in this PR.
        </p>
      </div>
    </div>
  );
}
