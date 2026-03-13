import type { SkillInfo } from "./utils/types";
import { countFiles } from "./scanner";

// ─── Color helpers ──────────────────────────────────────────────────────────

const useColor = (): boolean => {
  if (process.env.NO_COLOR !== undefined) return false;
  if ((globalThis as any).__CLI_NO_COLOR) return false;
  if (!process.stdout.isTTY) return false;
  return true;
};

const ansi = {
  bold: (s: string) => (useColor() ? `\x1b[1m${s}\x1b[0m` : s),
  cyan: (s: string) => (useColor() ? `\x1b[36m${s}\x1b[0m` : s),
  green: (s: string) => (useColor() ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s: string) => (useColor() ? `\x1b[33m${s}\x1b[0m` : s),
  dim: (s: string) => (useColor() ? `\x1b[2m${s}\x1b[0m` : s),
  red: (s: string) => (useColor() ? `\x1b[31m${s}\x1b[0m` : s),
  blueBold: (s: string) => (useColor() ? `\x1b[1m\x1b[34m${s}\x1b[0m` : s),
};

export { ansi };

// ─── Table formatter ────────────────────────────────────────────────────────

export function formatSkillTable(skills: SkillInfo[]): string {
  if (skills.length === 0) {
    return "No skills found.";
  }

  const headers = ["Name", "Version", "Provider", "Scope", "Type", "Path"];

  const rows = skills.map((s) => [
    s.name,
    s.version,
    s.providerLabel,
    s.scope,
    s.isSymlink ? "symlink" : "directory",
    s.path,
  ]);

  // Calculate column widths
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => r[i].length)),
  );

  const pad = (str: string, width: number) => str.padEnd(width);

  const headerLine = headers.map((h, i) => pad(h, widths[i])).join("  ");
  const separator = widths.map((w) => "-".repeat(w)).join("--");
  const dataLines = rows.map((row) =>
    row.map((cell, i) => pad(cell, widths[i])).join("  "),
  );

  return [
    useColor() ? ansi.bold(headerLine) : headerLine,
    separator,
    ...dataLines,
  ].join("\n");
}

// ─── Detail formatter ───────────────────────────────────────────────────────

export async function formatSkillDetail(skill: SkillInfo): Promise<string> {
  const lines: string[] = [];
  const label = (key: string, value: string) =>
    `${useColor() ? ansi.bold(key + ":") : key + ":"} ${value}`;

  lines.push(label("Name", skill.name));
  lines.push(label("Version", skill.version));
  lines.push(label("Provider", skill.providerLabel));
  lines.push(label("Scope", skill.scope));
  lines.push(label("Location", skill.location));
  lines.push(label("Path", skill.path));
  lines.push(label("Type", skill.isSymlink ? "symlink" : "directory"));
  if (skill.isSymlink && skill.symlinkTarget) {
    lines.push(label("Symlink Target", skill.symlinkTarget));
  }
  const fileCount = skill.fileCount ?? (await countFiles(skill.path));
  lines.push(label("File Count", String(fileCount)));
  if (skill.description) {
    lines.push("");
    lines.push(label("Description", skill.description));
  }

  if (skill.warnings && skill.warnings.length > 0) {
    lines.push("");
    lines.push(useColor() ? ansi.bold("Warnings:") : "Warnings:");
    for (const w of skill.warnings) {
      lines.push(
        `  ${useColor() ? ansi.yellow("!") : "!"} [${w.category}] ${w.message}`,
      );
    }
  }

  return lines.join("\n");
}

// ─── Multi-instance detail formatter ────────────────────────────────────────

export async function formatSkillInspect(skills: SkillInfo[]): Promise<string> {
  if (skills.length === 0) return "No skills found.";
  if (skills.length === 1) return formatSkillDetail(skills[0]);

  const lines: string[] = [];
  const label = (key: string, value: string) =>
    `${useColor() ? ansi.bold(key + ":") : key + ":"} ${value}`;
  const ref = skills[0];

  // ── Header ──
  const title = ` ${ref.name} `;
  const bar = "=".repeat(Math.max(title.length, 40));
  lines.push(useColor() ? ansi.blueBold(bar) : bar);
  lines.push(useColor() ? ansi.blueBold(title) : title);
  lines.push(useColor() ? ansi.blueBold(bar) : bar);
  lines.push("");

  // ── Shared info ──
  lines.push(label("Name", ref.name));
  lines.push(
    label("Version", useColor() ? ansi.green(ref.version) : ref.version),
  );

  const fileCount = ref.fileCount ?? (await countFiles(ref.path));
  lines.push(label("File Count", String(fileCount)));

  lines.push(
    label(
      "Installed in",
      useColor()
        ? ansi.cyan(`${skills.length} providers`)
        : `${skills.length} providers`,
    ),
  );

  // ── Description ──
  if (ref.description) {
    lines.push("");
    const descHeader = "Description";
    lines.push(useColor() ? ansi.bold(descHeader + ":") : descHeader + ":");
    // Word-wrap description to ~76 chars with 2-space indent
    const wrapped = wordWrap(ref.description, 76);
    for (const wl of wrapped) {
      lines.push("  " + wl);
    }
  }

  // ── Installations table ──
  lines.push("");
  const instHeader = `Installations (${skills.length})`;
  lines.push(useColor() ? ansi.bold(instHeader) : instHeader);
  lines.push("-".repeat(instHeader.length));

  for (let i = 0; i < skills.length; i++) {
    const s = skills[i];
    const idx = useColor() ? ansi.dim(`[${i + 1}]`) : `[${i + 1}]`;
    const provider = useColor() ? ansi.cyan(s.providerLabel) : s.providerLabel;
    const type = s.isSymlink
      ? useColor()
        ? ansi.yellow("symlink")
        : "symlink"
      : useColor()
        ? ansi.green("directory")
        : "directory";
    const scope = useColor() ? ansi.dim(s.scope) : s.scope;

    lines.push(`${idx} ${provider} (${scope}, ${type})`);
    lines.push(`    ${label("Path", s.path)}`);
    if (s.isSymlink && s.symlinkTarget) {
      lines.push(`    ${label("Target", s.symlinkTarget)}`);
    }
    if (i < skills.length - 1) lines.push("");
  }

  // ── Warnings (aggregate) ──
  const allWarnings = skills.flatMap((s) => {
    if (!s.warnings || s.warnings.length === 0) return [];
    return s.warnings.map((w) => ({ ...w, provider: s.providerLabel }));
  });

  if (allWarnings.length > 0) {
    lines.push("");
    const warnHeader = `Warnings (${allWarnings.length})`;
    lines.push(useColor() ? ansi.bold(warnHeader) : warnHeader);
    lines.push("-".repeat(warnHeader.length));
    for (const w of allWarnings) {
      const icon = useColor() ? ansi.yellow("!") : "!";
      lines.push(`  ${icon} [${w.category}] ${w.message}`);
    }
  }

  return lines.join("\n");
}

function wordWrap(text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + 1 > maxWidth && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ─── JSON formatter ─────────────────────────────────────────────────────────

export function formatJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
