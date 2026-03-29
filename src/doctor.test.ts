import { describe, expect, test } from "bun:test";

import {
  checkGitAvailable,
  checkGitVersion,
  checkGhAvailable,
  checkGhAuthenticated,
  checkNodeVersion,
  checkConfigValid,
  checkLockFileIntegrity,
  checkRegistryReachable,
  checkDiskSpace,
  checkAgentDirsWritable,
  checkInstalledSkillsIntact,
  checkNoOrphanedSkills,
  formatDoctorReport,
  formatDoctorJSON,
  formatDoctorMachine,
} from "./doctor";
import type { DoctorReport, CheckResult, CheckStatus } from "./doctor";
import type { AppConfig, LockFile } from "./utils/types";
import { getDefaultConfig } from "./config";

function makeReport(overrides: Partial<DoctorReport> = {}): DoctorReport {
  return {
    checks: [
      { name: "Git available", status: "pass", message: "2.43.0" },
      {
        name: "Config file valid",
        status: "warn",
        message: "missing fields",
        fix: "Run: asm init",
      },
      {
        name: "Registry reachable",
        status: "fail",
        message: "Network error",
        fix: "Check network",
      },
    ],
    passed: 1,
    warnings: 1,
    failures: 1,
    ...overrides,
  };
}

// ─── Individual checks ──────────────────────────────────────────────────────

describe("checkGitAvailable", () => {
  test("returns pass when git is installed", async () => {
    const result = await checkGitAvailable();
    expect(result.status).toBe("pass");
    expect(result.name).toBe("Git available");
    expect(result.message).toBeTruthy();
  });
});

describe("checkGitVersion", () => {
  test("returns pass for git >= 2.20", async () => {
    const result = await checkGitVersion();
    expect(result.status).toBe("pass");
    expect(result.name).toBe("Git version");
  });
});

describe("checkGhAvailable", () => {
  test("returns pass when gh is installed", async () => {
    const result = await checkGhAvailable();
    expect(result.status).toBe("pass");
    expect(result.name).toBe("GitHub CLI available");
  });
});

describe("checkGhAuthenticated", () => {
  test("returns pass or fail (environment-dependent)", async () => {
    const result = await checkGhAuthenticated();
    expect(["pass", "fail"]).toContain(result.status);
    expect(result.name).toBe("GitHub CLI authenticated");
  });

  test("includes fix suggestion on failure", async () => {
    const result = await checkGhAuthenticated();
    if (result.status === "fail") {
      expect(result.fix).toBeDefined();
      expect(result.fix).toContain("gh auth login");
    }
  });

  test("returns a non-empty message", async () => {
    const result = await checkGhAuthenticated();
    expect(typeof result.message).toBe("string");
    expect(result.message.length).toBeGreaterThan(0);
  });
});

describe("checkNodeVersion", () => {
  test("returns pass for node >= 18", async () => {
    const result = await checkNodeVersion();
    expect(result.status).toBe("pass");
    expect(result.name).toBe("Node.js version");
  });
});

describe("checkDiskSpace", () => {
  test("returns pass or warn (never throws)", async () => {
    const result = await checkDiskSpace();
    expect(["pass", "warn", "fail"]).toContain(result.status);
    expect(result.name).toBe("Disk space");
  });
});

describe("checkConfigValid", () => {
  test("returns pass or warn for current environment", async () => {
    const result = await checkConfigValid();
    expect(["pass", "warn"]).toContain(result.status);
    expect(result.name).toBe("Config file valid");
  });
});

describe("checkLockFileIntegrity", () => {
  test("returns pass or warn for current environment", async () => {
    const result = await checkLockFileIntegrity();
    expect(["pass", "warn"]).toContain(result.status);
    expect(result.name).toBe("Lock file integrity");
  });
});

describe("checkRegistryReachable", () => {
  test("returns pass or fail (network-dependent)", async () => {
    const result = await checkRegistryReachable();
    expect(["pass", "fail"]).toContain(result.status);
    expect(result.name).toBe("Registry reachable");
  });
});

describe("checkAgentDirsWritable", () => {
  test("returns pass for default config", async () => {
    const config = getDefaultConfig();
    const result = await checkAgentDirsWritable(config);
    expect(["pass", "warn"]).toContain(result.status);
    expect(result.name).toBe("Agent directories writable");
  });
});

describe("checkInstalledSkillsIntact", () => {
  test("returns pass when lock is empty", async () => {
    const config = getDefaultConfig();
    const lock: LockFile = { version: 1, skills: {} };
    const result = await checkInstalledSkillsIntact(config, lock);
    expect(result.status).toBe("pass");
    expect(result.message).toBe("No skills in lock file");
  });

  test("returns fail when locked skill directory is missing", async () => {
    const config = getDefaultConfig();
    const lock: LockFile = {
      version: 1,
      skills: {
        "nonexistent-skill": {
          source: "https://github.com/test/test",
          commitHash: "abc123",
          ref: null,
          installedAt: new Date().toISOString(),
          provider: "claude",
        },
      },
    };
    const result = await checkInstalledSkillsIntact(config, lock);
    expect(result.status).toBe("fail");
    expect(result.message).toContain("nonexistent-skill");
  });
});

describe("checkNoOrphanedSkills", () => {
  test("returns pass when no orphaned skills", async () => {
    const config = getDefaultConfig();
    const lock: LockFile = { version: 1, skills: {} };
    const result = await checkNoOrphanedSkills(config, lock);
    // Could be pass or warn depending on what's on disk
    expect(["pass", "warn"]).toContain(result.status);
    expect(result.name).toBe("No orphaned skills");
  });
});

// ─── CheckResult shape ──────────────────────────────────────────────────────

describe("CheckResult shape", () => {
  test("all checks return required fields", async () => {
    const checks: CheckResult[] = [
      await checkGitAvailable(),
      await checkGitVersion(),
      await checkNodeVersion(),
      await checkDiskSpace(),
      await checkConfigValid(),
      await checkLockFileIntegrity(),
    ];

    for (const check of checks) {
      expect(typeof check.name).toBe("string");
      expect(check.name.length).toBeGreaterThan(0);
      expect(["pass", "warn", "fail"]).toContain(check.status);
      expect(typeof check.message).toBe("string");
      if (check.status !== "pass" && check.fix) {
        expect(typeof check.fix).toBe("string");
      }
    }
  });
});

// ─── Formatters ─────────────────────────────────────────────────────────────

describe("formatDoctorReport", () => {
  test("includes header and summary line", () => {
    const report = makeReport();
    const output = formatDoctorReport(report);
    expect(output).toContain("Checking your environment...");
    expect(output).toContain("1 passed");
    expect(output).toContain("1 warning");
    expect(output).toContain("1 error");
  });

  test("includes fix suggestions for non-pass checks", () => {
    const report = makeReport();
    const output = formatDoctorReport(report);
    expect(output).toContain("Run: asm init");
    expect(output).toContain("Check network");
  });

  test("does not double-prefix 'Run: ' when fix already starts with it", () => {
    const report = makeReport({
      checks: [
        {
          name: "Config file valid",
          status: "warn",
          message: "missing fields",
          fix: "Run: asm init",
        },
      ],
      passed: 0,
      warnings: 1,
      failures: 0,
    });
    const output = formatDoctorReport(report);
    expect(output).toContain("Run: asm init");
    expect(output).not.toContain("Run: Run:");
  });

  test("prepends 'Run: ' when fix does not start with it", () => {
    const report = makeReport({
      checks: [
        {
          name: "Registry reachable",
          status: "fail",
          message: "Network error",
          fix: "Check network",
        },
      ],
      passed: 0,
      warnings: 0,
      failures: 1,
    });
    const output = formatDoctorReport(report);
    expect(output).toContain("Run: Check network");
  });

  test("does not include fix for passing checks", () => {
    const report = makeReport({
      checks: [{ name: "Test", status: "pass", message: "OK", fix: "nope" }],
      passed: 1,
      warnings: 0,
      failures: 0,
    });
    const output = formatDoctorReport(report);
    expect(output).not.toContain("nope");
  });
});

describe("formatDoctorJSON", () => {
  test("produces valid JSON with checks and summary", () => {
    const report = makeReport();
    const parsed = JSON.parse(formatDoctorJSON(report));
    expect(parsed.checks).toHaveLength(3);
    expect(parsed.summary.passed).toBe(1);
    expect(parsed.summary.warnings).toBe(1);
    expect(parsed.summary.failures).toBe(1);
  });

  test("includes fix only when present", () => {
    const report = makeReport();
    const parsed = JSON.parse(formatDoctorJSON(report));
    // First check (pass) has no fix field
    expect(parsed.checks[0].fix).toBeUndefined();
    // Second check (warn) has a fix
    expect(parsed.checks[1].fix).toBe("Run: asm init");
  });
});

describe("formatDoctorMachine", () => {
  test("produces v1 envelope format", () => {
    const report = makeReport();
    const parsed = JSON.parse(formatDoctorMachine(report));
    expect(parsed.v).toBe(1);
    expect(parsed.type).toBe("doctor");
    expect(parsed.data.checks).toHaveLength(3);
    expect(parsed.data.passed).toBe(1);
    expect(parsed.data.warnings).toBe(1);
    expect(parsed.data.failures).toBe(1);
  });

  test("is single-line JSON (no pretty print)", () => {
    const report = makeReport();
    const output = formatDoctorMachine(report);
    expect(output.includes("\n")).toBe(false);
  });
});
