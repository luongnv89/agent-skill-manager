/**
 * Cross-runtime command spawner.
 *
 * Bun and Node expose incompatible spawn APIs. Call sites in the CLI
 * (publisher, evaluator) must work under both, since `asm` ships with
 * `#!/usr/bin/env node` but still runs under Bun when the TUI re-execs.
 *
 * Under Bun we use Bun.spawn (faster, fewer allocations). Under Node we
 * fall back to child_process.spawn. The surface area is deliberately
 * narrow — only what publisher/evaluator actually need.
 */

export interface RunCommandOptions {
  cwd?: string;
}

export interface RunCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface BunSpawnOptions {
  cwd?: string;
  stdout?: "pipe" | "inherit" | "ignore";
  stderr?: "pipe" | "inherit" | "ignore";
}

interface BunSubprocess {
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  exited: Promise<number | null>;
}

interface BunNamespace {
  spawn(argv: string[], opts?: BunSpawnOptions): BunSubprocess;
}

const bunApi = (globalThis as { Bun?: BunNamespace }).Bun;
const isBun = typeof bunApi !== "undefined";

export async function runCommand(
  argv: string[],
  opts: RunCommandOptions = {},
): Promise<RunCommandResult> {
  if (argv.length === 0) {
    throw new Error("runCommand requires a non-empty argv");
  }

  if (isBun) {
    return runWithBun(argv, opts);
  }
  return runWithNode(argv, opts);
}

async function runWithBun(
  argv: string[],
  opts: RunCommandOptions,
): Promise<RunCommandResult> {
  // Non-null: runWithBun is only called when isBun is true.
  const bun = bunApi as BunNamespace;
  let proc: BunSubprocess;
  try {
    proc = bun.spawn(argv, {
      cwd: opts.cwd,
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch (err) {
    // Bun.spawn throws synchronously on missing binary; normalize to the
    // same shape as the Node branch so callers can check exitCode.
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return { exitCode: 127, stdout: "", stderr: (err as Error).message };
    }
    throw err;
  }
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  // Bun returns null when the child was signal-killed; surface that as
  // non-zero so callers' `exitCode !== 0` guards fire.
  return { exitCode: exitCode ?? -1, stdout, stderr };
}

async function runWithNode(
  argv: string[],
  opts: RunCommandOptions,
): Promise<RunCommandResult> {
  const { spawn } = await import("child_process");
  const [cmd, ...args] = argv;
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      // Missing binary should surface as a non-zero exit code, not a
      // rejection — callers like checkGhCli() rely on an exitCode guard to
      // fall back gracefully when `gh` isn't installed.
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        resolvePromise({ exitCode: 127, stdout, stderr: err.message });
        return;
      }
      rejectPromise(err);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      // Node returns null when the child was signal-killed; surface that as
      // non-zero so callers' `exitCode !== 0` guards fire.
      resolvePromise({ exitCode: code ?? -1, stdout, stderr });
    });
  });
}
