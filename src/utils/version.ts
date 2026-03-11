import { resolve } from "path";

const pkg = await Bun.file(
  resolve(import.meta.dir, "../../package.json"),
).json();

let commitHash = "unknown";
try {
  const proc = Bun.spawn(["git", "rev-parse", "--short", "HEAD"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  commitHash = (await new Response(proc.stdout).text()).trim() || "unknown";
} catch {
  // Not in a git repo or git not available
}

export const VERSION = pkg.version as string;
export const COMMIT_HASH = commitHash;
export const VERSION_STRING = `v${VERSION} (${COMMIT_HASH})`;
