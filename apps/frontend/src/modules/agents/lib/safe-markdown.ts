/**
 * Subconjunto markdown → HTML escapado (sem deps). Sempre passar por sanitizeRichHtml.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdown(escaped: string): string {
  let out = escaped;
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/uploads\/[^)\s]+)\)/g,
    '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>',
  );
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
  return out;
}

/** Converte markdown limitado em HTML; sanitize depois. */
export function markdownToSafeHtml(source: string): string {
  const normalized = source.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const blocks = normalized.split(/\n{2,}/);
  const htmlParts: string[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.every((l) => /^[-*] /.test(l))) {
      const items = lines
        .map((l) => `<li>${inlineMarkdown(escapeHtml(l.slice(2)))}</li>`)
        .join("");
      htmlParts.push(`<ul>${items}</ul>`);
      continue;
    }
    if (lines.every((l) => /^\d+\. /.test(l))) {
      const items = lines
        .map((l) => {
          const text = l.replace(/^\d+\. /, "");
          return `<li>${inlineMarkdown(escapeHtml(text))}</li>`;
        })
        .join("");
      htmlParts.push(`<ol>${items}</ol>`);
      continue;
    }
    const first = lines[0] ?? "";
    if (first.startsWith("### ")) {
      htmlParts.push(
        `<h3>${inlineMarkdown(escapeHtml(first.slice(4)))}</h3>`,
      );
      continue;
    }
    if (first.startsWith("## ")) {
      htmlParts.push(
        `<h2>${inlineMarkdown(escapeHtml(first.slice(3)))}</h2>`,
      );
      continue;
    }
    if (first.startsWith("# ")) {
      htmlParts.push(
        `<h1>${inlineMarkdown(escapeHtml(first.slice(2)))}</h1>`,
      );
      continue;
    }
    if (first.startsWith("> ")) {
      const quote = lines
        .map((l) => l.replace(/^>\s?/, ""))
        .join("\n");
      htmlParts.push(
        `<blockquote>${inlineMarkdown(escapeHtml(quote)).replace(/\n/g, "<br>")}</blockquote>`,
      );
      continue;
    }
    if (first.startsWith("```")) {
      const code = lines.slice(1).join("\n").replace(/```$/, "");
      htmlParts.push(`<pre><code>${escapeHtml(code)}</code></pre>`);
      continue;
    }
    htmlParts.push(
      `<p>${inlineMarkdown(escapeHtml(block)).replace(/\n/g, "<br>")}</p>`,
    );
  }

  return htmlParts.join("");
}
