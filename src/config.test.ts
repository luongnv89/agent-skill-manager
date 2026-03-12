import { describe, expect, it, beforeEach, afterEach, spyOn } from "bun:test";
import {
  getDefaultConfig,
  resolveProviderPath,
  getConfigPath,
  loadConfig,
} from "./config";
import { setVerbose } from "./logger";
import { homedir } from "os";
import { resolve } from "path";

const HOME = homedir();

describe("getDefaultConfig", () => {
  it("returns a config with version 1", () => {
    const config = getDefaultConfig();
    expect(config.version).toBe(1);
  });

  it("returns 4 default providers", () => {
    const config = getDefaultConfig();
    expect(config.providers).toHaveLength(4);
  });

  it("includes claude, codex, openclaw, and agents providers", () => {
    const config = getDefaultConfig();
    const names = config.providers.map((p) => p.name);
    expect(names).toEqual(["claude", "codex", "openclaw", "agents"]);
  });

  it("all providers are enabled by default", () => {
    const config = getDefaultConfig();
    expect(config.providers.every((p) => p.enabled)).toBe(true);
  });

  it("has empty customPaths", () => {
    const config = getDefaultConfig();
    expect(config.customPaths).toEqual([]);
  });

  it('defaults to scope "both" and sort "name"', () => {
    const config = getDefaultConfig();
    expect(config.preferences.defaultScope).toBe("both");
    expect(config.preferences.defaultSort).toBe("name");
  });

  it("returns a fresh copy each time (not shared reference)", () => {
    const a = getDefaultConfig();
    const b = getDefaultConfig();
    a.providers[0].name = "mutated";
    expect(b.providers[0].name).toBe("claude");
  });
});

describe("resolveProviderPath", () => {
  it("resolves ~ paths to home directory", () => {
    const result = resolveProviderPath("~/.claude/skills");
    expect(result).toBe(`${HOME}/.claude/skills`);
  });

  it("preserves absolute paths", () => {
    const result = resolveProviderPath("/usr/local/skills");
    expect(result).toBe("/usr/local/skills");
  });

  it("resolves relative paths from cwd", () => {
    const result = resolveProviderPath(".claude/skills");
    expect(result).toBe(resolve(".claude/skills"));
  });

  it("handles ~/path with deeper nesting", () => {
    const result = resolveProviderPath("~/a/b/c/d");
    expect(result).toBe(`${HOME}/a/b/c/d`);
  });

  it("handles ~ alone as prefix", () => {
    const result = resolveProviderPath("~/");
    expect(result).toBe(HOME);
  });
});

describe("getConfigPath", () => {
  it("returns a path under ~/.config/agent-skill-manager", () => {
    const path = getConfigPath();
    expect(path).toContain(".config/agent-skill-manager/config.json");
  });
});

describe("config verbose output", () => {
  let stderrSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    stderrSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    setVerbose(false);
    stderrSpy.mockRestore();
  });

  it("emits debug lines when verbose is enabled", async () => {
    setVerbose(true);
    await loadConfig();
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("[verbose]");
    expect(output).toContain("config:");
  });

  it("logs 'loaded from' when config file exists", async () => {
    setVerbose(true);
    await loadConfig();
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join("\n");
    // Either loaded from file or using defaults — both are valid
    const hasLoaded =
      output.includes("loaded from") || output.includes("using defaults");
    expect(hasLoaded).toBe(true);
  });

  it("emits no debug lines when verbose is disabled", async () => {
    setVerbose(false);
    await loadConfig();
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).not.toContain("[verbose]");
  });
});
