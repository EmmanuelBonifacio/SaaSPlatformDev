import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isApprovedNote,
  parseFrontmatterStatus,
} from "./vault-frontmatter.js";

describe("vault frontmatter status", () => {
  it("reads approved status from YAML frontmatter", () => {
    const content = `---
type: fact
status: approved
---

# Nota
`;
    assert.equal(parseFrontmatterStatus(content), "approved");
    assert.equal(isApprovedNote(content), true);
  });

  it("rejects draft notes and notes without status", () => {
    assert.equal(
      isApprovedNote(`---
status: draft
---

# Rascunho
`),
      false,
    );
    assert.equal(isApprovedNote("# Sem frontmatter"), false);
  });
});
