"use client";

/** Honest placeholders for Paperclip surfaces without native V1 API. */
export function TaskDeferredSections() {
  return (
    <section className="grid gap-3 sm:grid-cols-2">
      <DeferredCard
        title="Plans"
        body="Deep planning / plan revisions are not in /agents V1. Status transitions and comments cover the operator loop for now."
      />
      <DeferredCard
        title="Artifacts"
        body="Task artifacts / docs attachments are not persisted in the native schema yet. Use comments for short notes."
      />
    </section>
  );
}

function DeferredCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-3 py-4">
      <p className="agents-section-label mb-1">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
