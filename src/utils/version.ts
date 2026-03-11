import { resolve } from "path";

let _version: string = (process.env.__ASM_VERSION__ as string) || "0.0.0";
try {
  const pkg = await Bun.file(
    resolve(import.meta.dir, "../../package.json"),
  ).json();
  _version = pkg.version;
} catch {
  // Bundled mode — use build-time injected version
}

let _commit: string = (process.env.__ASM_COMMIT__ as string) || "unknown";
try {
  const proc = Bun.spawn(["git", "rev-parse", "--short", "HEAD"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  _commit = (await new Response(proc.stdout).text()).trim() || _commit;
} catch {
  // Not in a git repo or git not available
}

export const VERSION = _version;
export const COMMIT_HASH = _commit;
export const VERSION_STRING = `v${VERSION} (${COMMIT_HASH})`;
