import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  collectMarkdownNotes,
  MAX_NOTE_BYTES,
  vaultRoot,
} from "./vault-files.js";
import { isApprovedNote } from "./vault-frontmatter.js";

const MAX_SEARCH_TERMS = 8;
const MAX_RESULTS = 10;
const MAX_SNIPPET_CHARS = 1_200;

function queryTerms(query: string): string[] {
  const terms = query
    .normalize("NFKC")
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 1);
  return [...new Set(terms)].slice(0, MAX_SEARCH_TERMS);
}

function countOccurrences(content: string, term: string): number {
  let count = 0;
  let offset = 0;
  while (count < 20) {
    const matchIndex = content.indexOf(term, offset);
    if (matchIndex === -1) break;
    count += 1;
    offset = matchIndex + term.length;
  }
  return count;
}

function extractTitle(content: string, relativePath: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || path.basename(relativePath, ".md");
}

function makeSnippet(content: string, terms: string[]): string {
  const normalizedContent = content.replace(/\r\n/g, "\n");
  const lowerContent = normalizedContent.toLocaleLowerCase();
  const firstMatch = terms
    .map((term) => lowerContent.indexOf(term))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];

  if (firstMatch === undefined) {
    return normalizedContent.slice(0, MAX_SNIPPET_CHARS);
  }

  const start = Math.max(0, firstMatch - 250);
  const end = Math.min(
    normalizedContent.length,
    start + MAX_SNIPPET_CHARS,
  );
  return normalizedContent.slice(start, end);
}

export async function searchNotes(
  query: string,
  requestedLimit: number,
): Promise<Array<{ path: string; title: string; excerpt: string }>> {
  const terms = queryTerms(query);
  if (terms.length === 0) {
    throw new Error("A busca precisa conter ao menos um termo com 2 caracteres.");
  }

  const notePaths: string[] = [];
  await collectMarkdownNotes(vaultRoot, notePaths);

  const matches: Array<{
    path: string;
    title: string;
    excerpt: string;
    score: number;
  }> = [];

  for (const absolutePath of notePaths) {
    const metadata = await stat(absolutePath);
    if (metadata.size > MAX_NOTE_BYTES) continue;

    const content = await readFile(absolutePath, "utf8");
    if (!isApprovedNote(content)) continue;

    const relativePath = path
      .relative(vaultRoot, absolutePath)
      .split(path.sep)
      .join("/");
    const title = extractTitle(content, relativePath);
    const normalizedContent = content.toLocaleLowerCase();
    const normalizedTitle = title.toLocaleLowerCase();
    const score = terms.reduce(
      (total, term) =>
        total +
        (normalizedTitle.includes(term) ? 5 : 0) +
        countOccurrences(normalizedContent, term),
      0,
    );

    if (score > 0) {
      matches.push({
        path: relativePath,
        title,
        excerpt: makeSnippet(content, terms),
        score,
      });
    }
  }

  return matches
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, requestedLimit)
    .map(({ path: notePath, title, excerpt }) => ({
      path: notePath,
      title,
      excerpt,
    }));
}
