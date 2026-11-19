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
          Superfície alinhada à navegação Paperclip. A API SaaS nativa para este domínio
          ainda não está disponível — sem DDL inventado neste PR.
        </p>
      </div>
    </div>
  );
}
