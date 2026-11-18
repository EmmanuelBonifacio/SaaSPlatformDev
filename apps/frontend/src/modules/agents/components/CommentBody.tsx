"use client";

import { sanitizeRichHtml } from "@/lib/sanitize";
import type { AgentsCommentAttachment } from "@/types/agents.types";
import { markdownToSafeHtml } from "../lib/safe-markdown";

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export function CommentBody({
  body,
  attachments = [],
}: {
  body: string;
  attachments?: AgentsCommentAttachment[];
}) {
  const html = sanitizeRichHtml(markdownToSafeHtml(body));

  return (
    <div className="space-y-2">
      <div
        className="prose prose-sm dark:prose-invert max-w-none break-words [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {attachments.length > 0 && (
        <ul className="space-y-2 border-t pt-2">
          {attachments.map((att) => (
            <li key={att.id} className="text-xs">
              {att.kind === "image" && att.urlPath ? (
                // eslint-disable-next-line @next/next/no-img-element -- tenant upload path
                <img
                  src={att.urlPath}
                  alt={att.filename}
                  className="max-h-48 max-w-full rounded-md border object-contain"
                />
              ) : null}
              {att.kind === "file" && att.urlPath ? (
                <a
                  href={att.urlPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {att.filename}
                  {att.sizeBytes != null
                    ? ` (${Math.ceil(att.sizeBytes / 1024)} KB)`
                    : ""}
                </a>
              ) : null}
              {att.kind === "receipt" && att.amountCents != null && att.currency ? (
                <div className="rounded-md border bg-background/60 px-2 py-1">
                  <p className="font-medium">
                    Receipt · {formatMoney(att.amountCents, att.currency)}
                  </p>
                  {att.note ? (
                    <p className="text-muted-foreground">{att.note}</p>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
