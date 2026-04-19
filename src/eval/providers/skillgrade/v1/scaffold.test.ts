/**
 * Scaffold tests. The `Spawner` seam keeps these hermetic — no actual
 * `skillgrade init` is ever run.
 */

import { describe, expect, it } from "bun:test";
import { scaffoldEvalYaml } from "./scaffold";
import type { Spawner, SpawnResult } from "./spawn";

function makeSpawn(result: Partial<SpawnResult>): Spawner {
  return async () => ({
    exitCode: 0,
    stdout: "",
    stderr: "",
    timedOut: false,
    aborted: false,
    ...result,
  });
}

describe("scaffoldEvalYaml", () => {
  it("returns ok:true when skillgrade init exits 0", async () => {
    const res = await scaffoldEvalYaml({
      skillPath: "/tmp/skill",
      spawn: makeSpawn({ exitCode: 0, stdout: "created eval.yaml" }),
    });
    expect(res.ok).toBe(true);
    expect(res.exitCode).toBe(0);
    expect(res.message).toContain("/tmp/skill");
  });

  it("returns ok:false with stderr detail on non-zero exit", async () => {
    const res = await scaffoldEvalYaml({
      skillPath: "/tmp/skill",
      spawn: makeSpawn({
        exitCode: 1,
        stderr: "error: eval.yaml already exists",
      }),
    });
    expect(res.ok).toBe(false);
    expect(res.exitCode).toBe(1);
    expect(res.message).toContain("already exists");
  });

  it("falls back to stdout when stderr is empty", async () => {
    const res = await scaffoldEvalYaml({
      skillPath: "/tmp/skill",
      spawn: makeSpawn({
        exitCode: 2,
        stdout: "usage: skillgrade init",
      }),
    });
    expect(res.ok).toBe(false);
    expect(res.message).toContain("usage:");
  });

  it("handles timeout cleanly", async () => {
    const res = await scaffoldEvalYaml({
      skillPath: "/tmp/skill",
      timeoutMs: 10,
      spawn: makeSpawn({ exitCode: null, timedOut: true }),
    });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/timed out/);
  });

  it("handles abort cleanly", async () => {
    const res = await scaffoldEvalYaml({
      skillPath: "/tmp/skill",
      spawn: makeSpawn({ exitCode: null, aborted: true }),
    });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/aborted/);
  });

  it("surfaces ENOENT with a multi-option install hint", async () => {
    const res = await scaffoldEvalYaml({
      skillPath: "/tmp/skill",
      spawn: async () => {
        const e: any = new Error("spawn skillgrade ENOENT");
        e.code = "ENOENT";
        throw e;
      },
    });
    expect(res.ok).toBe(false);
    // Headline preserves the "not installed" keyword used by downstream
    // regex matchers (cli.test.ts, operator dashboards, etc.).
    expect(res.message).toContain("not installed");
    // Option 1 — reinstall agent-skill-manager (bundled path).
    expect(res.message).toContain("npm install -g agent-skill-manager");
    // Option 2 — manually install skillgrade (issue #173 acceptance
    // criterion: at least two fix paths, exact copy-paste command).
    expect(res.message).toContain("npm install -g skillgrade");
    // Option 3 — power-user escape hatch.
    expect(res.message).toContain("ASM_SKILLGRADE_BIN");
    // Docs link (issue #173 acceptance: reference docs explaining what
    // skillgrade is and why it's needed).
    expect(res.message).toContain(
      "docs/skillgrade-integration.md#troubleshooting",
    );
    // Re-run hint preserves the user's skill path + the `init` subcommand
    // so copy-paste re-runs the exact invocation (issue #173).
    expect(res.message).toContain("asm eval /tmp/skill --runtime init");
  });

  it("surfaces non-ENOENT spawn failures verbatim", async () => {
    const res = await scaffoldEvalYaml({
      skillPath: "/tmp/skill",
      spawn: async () => {
        throw new Error("EACCES: permission denied");
      },
    });
    expect(res.ok).toBe(false);
    expect(res.message).toContain("permission denied");
  });

  it("passes skillPath as cwd to the spawner", async () => {
    let cwdSeen: string | undefined;
    const spy: Spawner = async (_argv, opts) => {
      cwdSeen = opts?.cwd;
      return {
        exitCode: 0,
        stdout: "",
        stderr: "",
        timedOut: false,
        aborted: false,
      };
    };
    await scaffoldEvalYaml({ skillPath: "/my/skill", spawn: spy });
    expect(cwdSeen).toBe("/my/skill");
  });

  it("uses the configured binary name", async () => {
    let argvSeen: string[] | undefined;
    const spy: Spawner = async (argv) => {
      argvSeen = argv;
      return {
        exitCode: 0,
        stdout: "",
        stderr: "",
        timedOut: false,
        aborted: false,
      };
    };
    await scaffoldEvalYaml({
      skillPath: "/x",
      binary: "my-skillgrade",
      spawn: spy,
    });
    expect(argvSeen).toEqual(["my-skillgrade", "init"]);
  });
});
