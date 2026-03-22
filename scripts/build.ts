#!/usr/bin/env bun

import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dir, "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const version = pkg.version;

let commitHash = "unknown";
try {
  const proc = Bun.spawn(["git", "rev-parse", "--short", "HEAD"], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: root,
  });
  commitHash = (await new Response(proc.stdout).text()).trim() || "unknown";
} catch {
  // git not available
}

// Plugin to replace bun:ffi imports with no-op stubs for Node.js compatibility.
// @opentui/core uses bun:ffi for native rendering, but the TUI works without it
// on Node.js (WASM/JS fallback). Without this plugin, Node.js throws
// ERR_UNSUPPORTED_ESM_URL_SCHEME because it doesn't support the bun: protocol.
const bunFfiStub: import("bun").BunPlugin = {
  name: "bun-ffi-stub",
  setup(build) {
    build.onResolve({ filter: /^bun:ffi$/ }, () => ({
      path: "bun:ffi",
      namespace: "bun-ffi-stub",
    }));
    build.onLoad({ filter: /.*/, namespace: "bun-ffi-stub" }, () => ({
      contents: `
        export function dlopen() { return null; }
        export function toArrayBuffer() { return new ArrayBuffer(0); }
        export function ptr() { return 0; }
        export class JSCallback { constructor() {} close() {} }
      `,
      loader: "js",
    }));
  },
};

const result = await Bun.build({
  entrypoints: [resolve(root, "bin/agent-skill-manager.ts")],
  outdir: resolve(root, "dist"),
  target: "node",
  minify: true,
  splitting: true,
  plugins: [bunFfiStub],
  define: {
    "process.env.__ASM_VERSION__": JSON.stringify(version),
    "process.env.__ASM_COMMIT__": JSON.stringify(commitHash),
  },
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log(`Built agent-skill-manager v${version} (${commitHash})`);
console.log(`  ${result.outputs.length} output(s) in dist/`);
