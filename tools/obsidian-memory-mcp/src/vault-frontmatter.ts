const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export function parseFrontmatterStatus(content: string): string | null {
  const match = FRONTMATTER_PATTERN.exec(content);
  if (!match) return null;

  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    if (key !== "status") continue;
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "")
      .toLowerCase();
    return value || null;
  }

  return null;
}

export function isApprovedNote(content: string): boolean {
  return parseFrontmatterStatus(content) === "approved";
}
