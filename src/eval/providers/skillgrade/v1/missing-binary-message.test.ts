/**
 * Tests for the shared "skillgrade binary missing" formatter (issue #173).
 *
 * The formatter is the single source of truth for the multi-option fix
 * message; both scaffold.ts (ENOENT path) and index.ts::applicable()
 * (version-probe failure) render through it. Asserting the full shape
 * here means the downstream tests only need to verify the headline +
 * plumbing, not the body.
 */

import { describe, expect, it } from "bun:test";
import {
  formatSkillgradeMissingMessage,
  SKILLGRADE_DOCS_URL,
} from "./missing-binary-message";

describe("formatSkillgradeMissingMessage", () => {
  it("starts with the caller-provided headline on its own line", () => {
    const msg = formatSkillgradeMissingMessage({
      headline: "skillgrade not installed",
      skillPath: "/tmp/skill",
      rerunArgs: "--runtime init",
    });
    // Headline is the first line — important for CLI regexes that
    // anchor on the short form (`/skillgrade.*not installed/i`).
    expect(msg.split("\n")[0]).toBe("skillgrade not installed");
  });

  it("lists all three fix options with copy-paste commands", () => {
    const msg = formatSkillgradeMissingMessage({
      headline: "skillgrade not installed or unreachable",
      skillPath: "/x",
      rerunArgs: "--runtime",
    });
    // Option 1 — reinstall (bundled path).
    expect(msg).toContain("Reinstall agent-skill-manager");
    expect(msg).toContain("npm install -g agent-skill-manager");
    // Option 2 — manual install (the primary fallback from #173).
    expect(msg).toContain("Install skillgrade manually");
    expect(msg).toContain("npm install -g skillgrade");
    // Option 3 — env-var override for local dev builds / custom deploys.
    expect(msg).toContain("ASM_SKILLGRADE_BIN");
    expect(msg).toContain("export ASM_SKILLGRADE_BIN=");
  });

  it("includes the canonical docs link", () => {
    const msg = formatSkillgradeMissingMessage({
      headline: "h",
      skillPath: "/x",
      rerunArgs: "--runtime",
    });
    expect(msg).toContain(`Docs: ${SKILLGRADE_DOCS_URL}`);
    expect(SKILLGRADE_DOCS_URL).toContain(
      "docs/skillgrade-integration.md#troubleshooting",
    );
  });

  it("reuses the skill path in the re-run hint so copy-paste works verbatim", () => {
    const msg = formatSkillgradeMissingMessage({
      headline: "h",
      skillPath: "/home/user/my-skill",
      rerunArgs: "--runtime init",
    });
    expect(msg).toContain("asm eval /home/user/my-skill --runtime init");
  });

  it("supports the applicable() re-run args (no `init` subcommand)", () => {
    const msg = formatSkillgradeMissingMessage({
      headline: "h",
      skillPath: "/s",
      rerunArgs: "--runtime",
    });
    expect(msg).toContain("asm eval /s --runtime");
    // Guard: no accidental `init` leakage into the applicable() path.
    // We check the hint segment specifically — `--runtime init` as a
    // literal must not appear anywhere in the rendered message.
    expect(msg).not.toContain("--runtime init");
  });

  it("renders the headline, fix options, docs, and re-run hint in order", () => {
    const msg = formatSkillgradeMissingMessage({
      headline: "H",
      skillPath: "/s",
      rerunArgs: "--runtime",
    });
    // Use indexOf to assert ordering without pinning exact whitespace —
    // the formatter owns layout, the tests own intent.
    const headlineAt = msg.indexOf("H");
    const optionsAt = msg.indexOf("Fix options:");
    const docsAt = msg.indexOf("Docs:");
    const rerunAt = msg.indexOf("Then re-run:");
    expect(headlineAt).toBeLessThan(optionsAt);
    expect(optionsAt).toBeLessThan(docsAt);
    expect(docsAt).toBeLessThan(rerunAt);
  });
});
