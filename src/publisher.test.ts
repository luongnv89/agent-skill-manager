import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  parseSkillMetadata,
  generateManifest,
  mapVerdict,
  formatPublishMachine,
  formatFallbackInstructions,
} from "./publisher";
import type { GenerateManifestOptions } from "./publisher";
import type { PublishResult } from "./utils/types";
import type { SecurityAuditReport } from "./utils/types";

// ─── Helpers ───────────────────────────────────────────────────────────────

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "publisher-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

function makeSkillMd(fields: Record<string, string>): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    lines.push(`${key}: ${value}`);
  }
  lines.push("---");
  lines.push("");
  lines.push("# Test Skill");
  return lines.join("\n");
}

function makeDummySecurityReport(): SecurityAuditReport {
  return {
    scannedAt: "2026-01-01T00:00:00.000Z",
    skillName: "test-skill",
    skillPath: "/tmp/test",
    source: null,
    codeScans: [],
    permissions: [],
    totalFiles: 1,
    totalLines: 10,
    verdict: "safe",
    verdictReason: "No issues found",
  };
}

function makeDummyPublishResult(
  overrides: Partial<PublishResult> = {},
): PublishResult {
  return {
    success: true,
    manifest: {
      name: "test-skill",
      author: "testuser",
      description: "A test skill",
      repository: "https://github.com/testuser/test-skill",
      commit: "a".repeat(40),
      security_verdict: "pass",
      published_at: "2026-01-01T00:00:00.000Z",
    },
    prUrl: "https://github.com/luongnv89/asm-registry/pull/1",
    error: null,
    securityVerdict: "pass",
    securityReport: makeDummySecurityReport(),
    ...overrides,
  };
}

// ─── parseSkillMetadata ─────────────────────────────────────────────────────

describe("parseSkillMetadata", () => {
  test("parses valid SKILL.md", async () => {
    await writeFile(
      join(tempDir, "SKILL.md"),
      makeSkillMd({
        name: "my-skill",
        description: "A useful skill for testing",
        version: "1.2.3",
        license: "MIT",
        creator: "testuser",
      }),
    );

    const meta = await parseSkillMetadata(tempDir);
    expect(meta.name).toBe("my-skill");
    expect(meta.description).toBe("A useful skill for testing");
    expect(meta.version).toBe("1.2.3");
    expect(meta.license).toBe("MIT");
    expect(meta.creator).toBe("testuser");
    expect(meta.tags).toEqual([]);
  });

  test("throws when SKILL.md is missing", async () => {
    await expect(parseSkillMetadata(tempDir)).rejects.toThrow("No SKILL.md");
  });

  test("throws when name is missing", async () => {
    await writeFile(
      join(tempDir, "SKILL.md"),
      makeSkillMd({ description: "no name" }),
    );
    await expect(parseSkillMetadata(tempDir)).rejects.toThrow(
      "missing required field: name",
    );
  });

  test("throws when description is missing", async () => {
    await writeFile(join(tempDir, "SKILL.md"), makeSkillMd({ name: "test" }));
    await expect(parseSkillMetadata(tempDir)).rejects.toThrow(
      "missing required field: description",
    );
  });

  test("defaults version to 0.0.0 when missing", async () => {
    await writeFile(
      join(tempDir, "SKILL.md"),
      makeSkillMd({ name: "test", description: "test skill" }),
    );
    const meta = await parseSkillMetadata(tempDir);
    expect(meta.version).toBe("0.0.0");
  });

  test("defaults license to MIT when missing", async () => {
    await writeFile(
      join(tempDir, "SKILL.md"),
      makeSkillMd({ name: "test", description: "test skill" }),
    );
    const meta = await parseSkillMetadata(tempDir);
    expect(meta.license).toBe("MIT");
  });

  test("parses metadata.version from nested metadata block", async () => {
    const content = [
      "---",
      "name: nested-version",
      "description: test",
      "metadata:",
      "  version: 2.0.0",
      "---",
    ].join("\n");
    await writeFile(join(tempDir, "SKILL.md"), content);
    const meta = await parseSkillMetadata(tempDir);
    expect(meta.version).toBe("2.0.0");
  });
});

// ─── mapVerdict ─────────────────────────────────────────────────────────────

describe("mapVerdict", () => {
  test("maps safe to pass", () => {
    expect(mapVerdict("safe")).toBe("pass");
  });

  test("maps caution to pass", () => {
    expect(mapVerdict("caution")).toBe("pass");
  });

  test("maps warning to warning", () => {
    expect(mapVerdict("warning")).toBe("warning");
  });

  test("maps dangerous to dangerous", () => {
    expect(mapVerdict("dangerous")).toBe("dangerous");
  });
});

// ─── generateManifest ───────────────────────────────────────────────────────

describe("generateManifest", () => {
  const baseOpts: GenerateManifestOptions = {
    metadata: {
      name: "my-skill",
      description: "A skill for testing",
      version: "1.0.0",
      license: "MIT",
      creator: "testuser",
      tags: ["testing", "automation"],
    },
    author: "testuser",
    commit: "a".repeat(40),
    repository: "https://github.com/testuser/my-skill",
    securityVerdict: "pass",
  };

  test("generates valid manifest with all fields", () => {
    const manifest = generateManifest(baseOpts);

    expect(manifest.name).toBe("my-skill");
    expect(manifest.author).toBe("testuser");
    expect(manifest.description).toBe("A skill for testing");
    expect(manifest.repository).toBe("https://github.com/testuser/my-skill");
    expect(manifest.commit).toBe("a".repeat(40));
    expect(manifest.security_verdict).toBe("pass");
    expect(manifest.published_at).toBeTruthy();
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.license).toBe("MIT");
    expect(manifest.tags).toEqual(["testing", "automation"]);
  });

  test("omits version when 0.0.0", () => {
    const opts = {
      ...baseOpts,
      metadata: { ...baseOpts.metadata, version: "0.0.0" },
    };
    const manifest = generateManifest(opts);
    expect(manifest.version).toBeUndefined();
  });

  test("omits tags when empty", () => {
    const opts = {
      ...baseOpts,
      metadata: { ...baseOpts.metadata, tags: [] },
    };
    const manifest = generateManifest(opts);
    expect(manifest.tags).toBeUndefined();
  });

  test("truncates tags to max 10", () => {
    const opts = {
      ...baseOpts,
      metadata: {
        ...baseOpts.metadata,
        tags: Array.from({ length: 15 }, (_, i) => `tag${i}`),
      },
    };
    const manifest = generateManifest(opts);
    expect(manifest.tags!.length).toBe(10);
  });

  test("published_at is valid ISO 8601", () => {
    const manifest = generateManifest(baseOpts);
    const date = new Date(manifest.published_at);
    expect(date.toISOString()).toBe(manifest.published_at);
  });
});

// ─── formatPublishMachine ───────────────────────────────────────────────────

describe("formatPublishMachine", () => {
  test("outputs v1 envelope on success", () => {
    const result = makeDummyPublishResult();
    const output = formatPublishMachine(result);
    const parsed = JSON.parse(output);

    expect(parsed.version).toBe(1);
    expect(parsed.type).toBe("publish");
    expect(parsed.success).toBe(true);
    expect(parsed.manifest).toBeTruthy();
    expect(parsed.pr_url).toBe(
      "https://github.com/luongnv89/asm-registry/pull/1",
    );
    expect(parsed.error).toBeNull();
    expect(parsed.security_verdict).toBe("pass");
    expect(parsed.fallback).toBe(false);
    expect(parsed.fallback_reason).toBeNull();
  });

  test("outputs v1 envelope on failure", () => {
    const result = makeDummyPublishResult({
      success: false,
      error: "Security audit verdict: dangerous",
      prUrl: null,
      securityVerdict: "dangerous",
    });
    const output = formatPublishMachine(result);
    const parsed = JSON.parse(output);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain("dangerous");
    expect(parsed.pr_url).toBeNull();
  });

  test("includes fallback info when gh unavailable", () => {
    const result = makeDummyPublishResult({
      prUrl: null,
      fallback: true,
      fallbackReason: "gh CLI not found",
    });
    const output = formatPublishMachine(result);
    const parsed = JSON.parse(output);

    expect(parsed.fallback).toBe(true);
    expect(parsed.fallback_reason).toBe("gh CLI not found");
  });
});

// ─── formatFallbackInstructions ─────────────────────────────────────────────

describe("formatFallbackInstructions", () => {
  test("returns empty string when no manifest", () => {
    const result = makeDummyPublishResult({ manifest: null });
    expect(formatFallbackInstructions(result)).toBe("");
  });

  test("includes manual steps", () => {
    const result = makeDummyPublishResult({
      fallback: true,
      fallbackReason: "gh CLI not found",
    });
    const output = formatFallbackInstructions(result);

    expect(output).toContain("Fork");
    expect(output).toContain("Create branch");
    expect(output).toContain("Open a PR");
    expect(output).toContain("asm doctor");
    expect(output).toContain("test-skill");
    expect(output).toContain("testuser");
  });

  test("includes the generated manifest JSON", () => {
    const result = makeDummyPublishResult({
      fallback: true,
      fallbackReason: "gh CLI not authenticated",
    });
    const output = formatFallbackInstructions(result);
    expect(output).toContain('"name": "test-skill"');
    expect(output).toContain('"author": "testuser"');
  });
});

// ─── parseArgs integration ──────────────────────────────────────────────────

describe("parseArgs publish flags", () => {
  // Import parseArgs to verify flag parsing
  const { parseArgs } = require("./cli");
  const parse = (...args: string[]) => parseArgs(["bun", "script.ts", ...args]);

  test("parses publish command", () => {
    const result = parse("publish");
    expect(result.command).toBe("publish");
  });

  test("parses publish with path", () => {
    const result = parse("publish", "./my-skill");
    expect(result.command).toBe("publish");
    expect(result.subcommand).toBe("./my-skill");
  });

  test("parses --dry-run flag", () => {
    const result = parse("publish", "--dry-run");
    expect(result.flags.dryRun).toBe(true);
  });

  test("parses --machine flag", () => {
    const result = parse("publish", "--machine");
    expect(result.flags.machine).toBe(true);
  });

  test("parses --force flag", () => {
    const result = parse("publish", "--force");
    expect(result.flags.force).toBe(true);
  });

  test("parses --yes flag", () => {
    const result = parse("publish", "-y");
    expect(result.flags.yes).toBe(true);
  });

  test("parses combined flags", () => {
    const result = parse(
      "publish",
      "./my-skill",
      "--dry-run",
      "--json",
      "--force",
    );
    expect(result.command).toBe("publish");
    expect(result.subcommand).toBe("./my-skill");
    expect(result.flags.dryRun).toBe(true);
    expect(result.flags.json).toBe(true);
    expect(result.flags.force).toBe(true);
  });
});

// ─── isCLIMode ──────────────────────────────────────────────────────────────

describe("isCLIMode recognizes publish", () => {
  const { isCLIMode } = require("./cli");

  test("publish is recognized as CLI mode", () => {
    expect(isCLIMode(["bun", "script.ts", "publish"])).toBe(true);
  });

  test("publish with flags is CLI mode", () => {
    expect(isCLIMode(["bun", "script.ts", "publish", "--dry-run"])).toBe(true);
  });
});
