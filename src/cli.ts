import {
  loadConfig,
  getConfigPath,
  getDefaultConfig,
  saveConfig,
} from "./config";
import { scanAllSkills, searchSkills, sortSkills } from "./scanner";
import {
  buildFullRemovalPlan,
  buildRemovalPlan,
  executeRemoval,
  getExistingTargets,
} from "./uninstaller";
import {
  formatSkillTable,
  formatSkillDetail,
  formatJSON,
  ansi,
} from "./formatter";
import {
  parseSource,
  sanitizeName,
  checkGitAvailable,
  cloneToTemp,
  validateSkill,
  discoverSkills,
  scanForWarnings,
  executeInstall,
  cleanupTemp,
  resolveProvider,
  buildInstallPlan,
  checkConflict,
} from "./installer";
import type { InstallResult } from "./utils/types";
import {
  detectDuplicates,
  sortInstancesForKeep,
  formatAuditReport,
  formatAuditReportJSON,
} from "./auditor";
import { VERSION_STRING } from "./utils/version";
import type { Scope, SortBy } from "./utils/types";

// ─── Arg Parser ─────────────────────────────────────────────────────────────

interface ParsedArgs {
  command: string | null;
  subcommand: string | null;
  positional: string[];
  flags: {
    help: boolean;
    version: boolean;
    json: boolean;
    yes: boolean;
    noColor: boolean;
    scope: Scope;
    sort: SortBy;
    provider: string | null;
    name: string | null;
    force: boolean;
    path: string | null;
    all: boolean;
  };
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2); // skip bun and script path

  const result: ParsedArgs = {
    command: null,
    subcommand: null,
    positional: [],
    flags: {
      help: false,
      version: false,
      json: false,
      yes: false,
      noColor: false,
      scope: "both",
      sort: "name",
      provider: null,
      name: null,
      force: false,
      path: null,
      all: false,
    },
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    // Flags
    if (arg === "--help" || arg === "-h") {
      result.flags.help = true;
    } else if (arg === "--version" || arg === "-v") {
      result.flags.version = true;
    } else if (arg === "--json") {
      result.flags.json = true;
    } else if (arg === "--yes" || arg === "-y") {
      result.flags.yes = true;
    } else if (arg === "--no-color") {
      result.flags.noColor = true;
    } else if (arg === "--scope" || arg === "-s") {
      i++;
      const val = args[i];
      if (val === "global" || val === "project" || val === "both") {
        result.flags.scope = val;
      } else {
        error(`Invalid scope: "${val}". Must be global, project, or both.`);
        process.exit(2);
      }
    } else if (arg === "--sort") {
      i++;
      const val = args[i];
      if (val === "name" || val === "version" || val === "location") {
        result.flags.sort = val;
      } else {
        error(`Invalid sort: "${val}". Must be name, version, or location.`);
        process.exit(2);
      }
    } else if (arg === "--provider" || arg === "-p") {
      i++;
      result.flags.provider = args[i] || null;
    } else if (arg === "--name") {
      i++;
      result.flags.name = args[i] || null;
    } else if (arg === "--force" || arg === "-f") {
      result.flags.force = true;
    } else if (arg === "--path") {
      i++;
      result.flags.path = args[i] || null;
    } else if (arg === "--all") {
      result.flags.all = true;
    } else if (arg.startsWith("-")) {
      error(`Unknown option: ${arg}`);
      console.error(`Run "asm --help" for usage.`);
      process.exit(2);
    } else {
      // Positional: first is command, second is subcommand, rest are positional args
      if (!result.command) {
        result.command = arg;
      } else if (!result.subcommand) {
        result.subcommand = arg;
      } else {
        result.positional.push(arg);
      }
    }

    i++;
  }

  return result;
}

// ─── Output helpers ─────────────────────────────────────────────────────────

function error(msg: string) {
  console.error(ansi.red(`Error: ${msg}`));
}

// ─── Help text ──────────────────────────────────────────────────────────────

function printMainHelp() {
  console.log(`${ansi.blueBold("agent-skill-manager")} (${ansi.bold("asm")}) ${VERSION_STRING}

Interactive TUI and CLI for managing installed skills for AI coding agents.

${ansi.bold("Usage:")}
  asm                        Launch interactive TUI
  asm <command> [options]     Run a CLI command

${ansi.bold("Commands:")}
  list                   List all discovered skills
  search <query>         Search skills by name/description/provider
  inspect <skill-name>   Show detailed info for a skill
  uninstall <skill-name> Remove a skill (with confirmation)
  install <source>       Install a skill from GitHub
  audit                  Detect duplicate skills across providers
  config show            Print current config
  config path            Print config file path
  config reset           Reset config to defaults
  config edit            Open config in $EDITOR

${ansi.bold("Global Options:")}
  -h, --help             Show help for any command
  -v, --version          Print version and exit
  --json                 Output as JSON (list, search, inspect)
  -s, --scope <scope>    Filter: global, project, or both (default: both)
  --no-color             Disable ANSI colors
  --sort <field>         Sort by: name, version, or location (default: name)
  -y, --yes              Skip confirmation prompts`);
}

function printListHelp() {
  console.log(`${ansi.bold("Usage:")} asm list [options]

List all discovered skills.

${ansi.bold("Options:")}
  --sort <field>     Sort by: name, version, or location (default: name)
  -s, --scope <s>    Filter: global, project, or both (default: both)
  --json             Output as JSON array
  --no-color         Disable ANSI colors`);
}

function printSearchHelp() {
  console.log(`${ansi.bold("Usage:")} asm search <query> [options]

Search skills by name, description, or provider.

${ansi.bold("Options:")}
  --sort <field>     Sort by: name, version, or location (default: name)
  -s, --scope <s>    Filter: global, project, or both (default: both)
  --json             Output as JSON array
  --no-color         Disable ANSI colors`);
}

function printInspectHelp() {
  console.log(`${ansi.bold("Usage:")} asm inspect <skill-name> [options]

Show detailed information for a skill. The <skill-name> is the directory name.

${ansi.bold("Options:")}
  -s, --scope <s>    Filter: global, project, or both (default: both)
  --json             Output as JSON object
  --no-color         Disable ANSI colors`);
}

function printUninstallHelp() {
  console.log(`${ansi.bold("Usage:")} asm uninstall <skill-name> [options]

Remove a skill and its associated rule files.

${ansi.bold("Options:")}
  -y, --yes          Skip confirmation prompt
  -s, --scope <s>    Filter: global, project, or both (default: both)
  --no-color         Disable ANSI colors`);
}

function printAuditHelp() {
  console.log(`${ansi.bold("Usage:")} asm audit [subcommand] [options]

Detect and optionally remove duplicate skills.

${ansi.bold("Subcommands:")}
  duplicates   Find duplicate skills (default)

${ansi.bold("Options:")}
  --json             Output as JSON
  -y, --yes          Auto-remove duplicates, keeping one instance per group
  --no-color         Disable ANSI colors`);
}

function printConfigHelp() {
  console.log(`${ansi.bold("Usage:")} asm config <subcommand>

Manage configuration.

${ansi.bold("Subcommands:")}
  show     Print current config as JSON
  path     Print config file path
  reset    Reset config to defaults (with confirmation)
  edit     Open config in $EDITOR`);
}

// ─── Command Handlers ───────────────────────────────────────────────────────

async function cmdList(args: ParsedArgs) {
  if (args.flags.help) {
    printListHelp();
    return;
  }

  const config = await loadConfig();
  const allSkills = await scanAllSkills(config, args.flags.scope);
  const sorted = sortSkills(allSkills, args.flags.sort);

  if (args.flags.json) {
    console.log(formatJSON(sorted));
  } else {
    console.log(formatSkillTable(sorted));
  }
}

async function cmdSearch(args: ParsedArgs) {
  if (args.flags.help) {
    printSearchHelp();
    return;
  }

  const query = args.subcommand;
  if (!query) {
    error("Missing required argument: <query>");
    console.error(`Run "asm search --help" for usage.`);
    process.exit(2);
  }

  const config = await loadConfig();
  const allSkills = await scanAllSkills(config, args.flags.scope);
  const filtered = searchSkills(allSkills, query);
  const sorted = sortSkills(filtered, args.flags.sort);

  if (args.flags.json) {
    console.log(formatJSON(sorted));
  } else {
    console.log(formatSkillTable(sorted));
  }
}

async function cmdInspect(args: ParsedArgs) {
  if (args.flags.help) {
    printInspectHelp();
    return;
  }

  const skillName = args.subcommand;
  if (!skillName) {
    error("Missing required argument: <skill-name>");
    console.error(`Run "asm inspect --help" for usage.`);
    process.exit(2);
  }

  const config = await loadConfig();
  const allSkills = await scanAllSkills(config, args.flags.scope);
  const matches = allSkills.filter((s) => s.dirName === skillName);

  if (matches.length === 0) {
    error(`Skill "${skillName}" not found.`);
    process.exit(1);
  }

  if (args.flags.json) {
    console.log(formatJSON(matches.length === 1 ? matches[0] : matches));
  } else {
    for (let i = 0; i < matches.length; i++) {
      if (i > 0) console.log("\n" + "─".repeat(40) + "\n");
      console.log(formatSkillDetail(matches[i]));
    }
  }
}

async function cmdUninstall(args: ParsedArgs) {
  if (args.flags.help) {
    printUninstallHelp();
    return;
  }

  const skillName = args.subcommand;
  if (!skillName) {
    error("Missing required argument: <skill-name>");
    console.error(`Run "asm uninstall --help" for usage.`);
    process.exit(2);
  }

  const config = await loadConfig();
  const allSkills = await scanAllSkills(config, args.flags.scope);
  const plan = buildFullRemovalPlan(skillName, allSkills, config);

  const existing = await getExistingTargets(plan);
  if (existing.length === 0) {
    error(`Skill "${skillName}" not found or nothing to remove.`);
    process.exit(1);
  }

  // Show removal plan
  console.error(ansi.bold("Removal plan:"));
  for (const target of existing) {
    console.error(`  ${ansi.red("•")} ${target}`);
  }

  if (!args.flags.yes) {
    // Interactive confirmation
    if (!process.stdin.isTTY) {
      error(
        "Cannot prompt for confirmation in non-interactive mode. Use --yes to skip.",
      );
      process.exit(2);
    }
    process.stderr.write(`\n${ansi.bold("Proceed with removal?")} [y/N] `);
    const answer = await readLine();
    if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
      console.error("Aborted.");
      process.exit(0);
    }
  }

  const log = await executeRemoval(plan);
  for (const entry of log) {
    console.error(entry);
  }
  console.error(ansi.green("\nDone."));
}

function readLine(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk: string) => {
      data += chunk;
      if (data.includes("\n")) {
        process.stdin.removeAllListeners("data");
        resolve(data.trim());
      }
    });
    process.stdin.resume();
  });
}

async function cmdAudit(args: ParsedArgs) {
  if (args.flags.help) {
    printAuditHelp();
    return;
  }

  const sub = args.subcommand ?? "duplicates";

  if (sub !== "duplicates") {
    error(`Unknown audit subcommand: "${sub}". Use: duplicates`);
    process.exit(2);
  }

  const config = await loadConfig();
  // Always scan all providers regardless of --scope
  const allSkills = await scanAllSkills(config, "both");
  const report = detectDuplicates(allSkills);

  if (args.flags.json) {
    console.log(formatAuditReportJSON(report));
    return;
  }

  console.log(formatAuditReport(report));

  if (args.flags.yes && report.duplicateGroups.length > 0) {
    // Auto-remove all but the first (recommended keep) instance per group
    console.error(ansi.bold("\nAuto-removing duplicates..."));
    for (const group of report.duplicateGroups) {
      const sorted = sortInstancesForKeep(group.instances);
      // Keep the first, remove the rest
      for (let i = 1; i < sorted.length; i++) {
        const skill = sorted[i];
        const plan = buildRemovalPlan(skill, config);
        const log = await executeRemoval(plan);
        for (const entry of log) {
          console.error(entry);
        }
      }
    }
    console.error(ansi.green("\nDone."));
  }
}

async function cmdConfig(args: ParsedArgs) {
  if (args.flags.help) {
    printConfigHelp();
    return;
  }

  const sub = args.subcommand;

  if (!sub) {
    error("Missing subcommand. Use: show, path, reset, or edit.");
    console.error(`Run "asm config --help" for usage.`);
    process.exit(2);
  }

  switch (sub) {
    case "show": {
      const config = await loadConfig();
      console.log(formatJSON(config));
      break;
    }
    case "path": {
      console.log(getConfigPath());
      break;
    }
    case "reset": {
      if (!args.flags.yes) {
        if (!process.stdin.isTTY) {
          error(
            "Cannot prompt for confirmation in non-interactive mode. Use --yes to skip.",
          );
          process.exit(2);
        }
        process.stderr.write(
          `${ansi.bold("Reset config to defaults?")} [y/N] `,
        );
        const answer = await readLine();
        if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
          console.error("Aborted.");
          process.exit(0);
        }
      }
      const defaults = getDefaultConfig();
      await saveConfig(defaults);
      console.error(ansi.green("Config reset to defaults."));
      break;
    }
    case "edit": {
      const editor = process.env.VISUAL || process.env.EDITOR || "vi";
      const configPath = getConfigPath();
      // Ensure config file exists
      await loadConfig();
      const proc = Bun.spawn([editor, configPath], {
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      });
      await proc.exited;
      break;
    }
    default: {
      error(
        `Unknown config subcommand: "${sub}". Use: show, path, reset, or edit.`,
      );
      process.exit(2);
    }
  }
}

function printInstallHelp() {
  console.log(`${ansi.bold("Usage:")} asm install <source> [options]

Install a skill from a GitHub repository.

${ansi.bold("Source Format:")}
  github:owner/repo          Install from default branch
  github:owner/repo#ref      Install from specific branch or tag

${ansi.bold("Options:")}
  -p, --provider <name>  Target provider (claude, codex, openclaw, agents)
  --name <name>          Override skill directory name
  --path <subdir>        Install skill from a subdirectory of the repo
  --all                  Install all skills found in the repo
  -f, --force            Overwrite if skill already exists
  -y, --yes              Skip confirmation prompt
  --json                 Output result as JSON
  --no-color             Disable ANSI colors

${ansi.bold("Single-skill repo:")}
  asm install github:user/my-skill
  asm install github:user/my-skill#v1.0.0 -p claude

${ansi.bold("Multi-skill repo:")}
  asm install github:user/skills --path skills/code-review
  asm install github:user/skills --all -p claude -y
  asm install github:user/skills              ${ansi.dim("(interactive picker)")}`);
}

async function installSingleSkill(
  args: ParsedArgs,
  sourceStr: string,
  source: ReturnType<typeof parseSource>,
  tempDir: string,
  skillDir: string,
  skillNameOverride: string | null,
  config: Awaited<ReturnType<typeof loadConfig>>,
  provider: Awaited<ReturnType<typeof resolveProvider>>,
): Promise<InstallResult> {
  // Validate
  const metadata = await validateSkill(skillDir);
  console.error(`Found skill: ${metadata.name} v${metadata.version}`);

  // Scan for warnings
  const warnings = await scanForWarnings(skillDir);

  // Determine skill name: --name flag > dirName of skill subdir > repo name
  const dirName = skillDir === tempDir ? null : skillDir.split("/").pop();
  const rawName = skillNameOverride || dirName || source.repo;
  const skillName = sanitizeName(rawName);

  // Build install plan
  const plan = buildInstallPlan(
    source,
    tempDir,
    skillDir,
    skillName,
    provider,
    args.flags.force,
  );

  // Check conflict
  await checkConflict(plan.targetDir, plan.force);

  // Preview
  console.error(`\n${ansi.bold("Install preview:")}`);
  console.error(`  Name:        ${metadata.name}`);
  console.error(`  Version:     ${metadata.version}`);
  console.error(`  Description: ${metadata.description || "(none)"}`);
  console.error(`  Source:      ${sourceStr}`);
  console.error(`  Provider:    ${provider.label} (${provider.name})`);
  console.error(`  Target:      ${plan.targetDir}`);

  if (warnings.length > 0) {
    console.error(`\n${ansi.yellow(ansi.bold("Security warnings:"))}`);
    const grouped = new Map<string, typeof warnings>();
    for (const w of warnings) {
      const list = grouped.get(w.category) || [];
      list.push(w);
      grouped.set(w.category, list);
    }
    for (const [category, items] of grouped) {
      console.error(
        `\n  ${ansi.yellow(`[${category}]`)} (${items.length} match${items.length > 1 ? "es" : ""})`,
      );
      for (const item of items.slice(0, 5)) {
        console.error(
          `    ${ansi.dim(item.file)}:${item.line} — ${item.match}`,
        );
      }
      if (items.length > 5) {
        console.error(`    ... and ${items.length - 5} more`);
      }
    }
  }

  // Confirmation (only when not in batch/--all mode — caller handles --all confirmation)
  if (!args.flags.yes && !args.flags.all) {
    if (!process.stdin.isTTY) {
      error(
        "Cannot prompt for confirmation in non-interactive mode. Use --yes to skip.",
      );
      process.exit(2);
    }
    process.stderr.write(`\n${ansi.bold("Proceed with installation?")} [y/N] `);
    const answer = await readLine();
    if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
      console.error("Aborted.");
      process.exit(0);
    }
  }

  // Execute install
  console.error(`\nInstalling to ${plan.targetDir}...`);
  return await executeInstall(plan);
}

async function cmdInstall(args: ParsedArgs) {
  if (args.flags.help) {
    printInstallHelp();
    return;
  }

  const sourceStr = args.subcommand;
  if (!sourceStr) {
    error("Missing required argument: <source>");
    console.error(`Run "asm install --help" for usage.`);
    process.exit(2);
  }

  let tempDir: string | null = null;

  // SIGINT/SIGTERM cleanup handler
  const cleanup = () => {
    if (tempDir) {
      cleanupTemp(tempDir).finally(() => process.exit(1));
    } else {
      process.exit(1);
    }
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  try {
    // Parse source
    const source = parseSource(sourceStr);
    console.error(`Parsing source: ${sourceStr}`);

    // Check git
    await checkGitAvailable();

    // Clone
    console.error(
      `Cloning ${source.cloneUrl}${source.ref ? ` (ref: ${source.ref})` : ""}...`,
    );
    tempDir = await cloneToTemp(source);

    // Select provider early (needed for all paths)
    const config = await loadConfig();
    const provider = await resolveProvider(
      config,
      args.flags.provider,
      !!process.stdin.isTTY,
    );

    // Determine which skill(s) to install
    const { join: joinPath } = await import("path");
    let results: InstallResult[] = [];

    // Case 1: --path flag — install specific subdirectory
    if (args.flags.path) {
      const skillDir = joinPath(tempDir, args.flags.path);
      try {
        await validateSkill(skillDir);
      } catch {
        throw new Error(
          `No SKILL.md found at path "${args.flags.path}" in the repository.`,
        );
      }
      const result = await installSingleSkill(
        args,
        sourceStr,
        source,
        tempDir,
        skillDir,
        args.flags.name,
        config,
        provider,
      );
      results.push(result);

      // Case 2: SKILL.md at root — single-skill repo
    } else {
      let isRootSkill = false;
      try {
        await validateSkill(tempDir);
        isRootSkill = true;
      } catch {
        // Not a root-level skill
      }

      if (isRootSkill) {
        const result = await installSingleSkill(
          args,
          sourceStr,
          source,
          tempDir,
          tempDir,
          args.flags.name,
          config,
          provider,
        );
        results.push(result);

        // Case 3: Multi-skill repo — discover skills in subdirectories
      } else {
        console.error("No SKILL.md at repository root. Scanning for skills...");
        const discovered = await discoverSkills(tempDir);

        if (discovered.length === 0) {
          throw new Error(
            "No skills found in this repository. Skills must have a SKILL.md file.",
          );
        }

        console.error(`Found ${discovered.length} skill(s):\n`);
        for (let i = 0; i < discovered.length; i++) {
          console.error(
            `  ${ansi.bold(`${i + 1})`)} ${discovered[i].name} v${discovered[i].version} ${ansi.dim(`(${discovered[i].relPath})`)}`,
          );
          if (discovered[i].description) {
            console.error(`     ${discovered[i].description}`);
          }
        }

        let selectedPaths: string[];

        if (args.flags.all) {
          // --all: install everything
          selectedPaths = discovered.map((s) => s.relPath);
          console.error(`\nInstalling all ${selectedPaths.length} skills...`);

          if (!args.flags.yes) {
            if (!process.stdin.isTTY) {
              error(
                "Cannot prompt for confirmation in non-interactive mode. Use --yes to skip.",
              );
              process.exit(2);
            }
            process.stderr.write(
              `\n${ansi.bold(`Install all ${selectedPaths.length} skills?`)} [y/N] `,
            );
            const answer = await readLine();
            if (
              answer.toLowerCase() !== "y" &&
              answer.toLowerCase() !== "yes"
            ) {
              console.error("Aborted.");
              process.exit(0);
            }
          }
        } else if (process.stdin.isTTY) {
          // Interactive picker
          process.stderr.write(`\nEnter skill number (or "all"): `);
          const answer = await readLine();

          if (answer.toLowerCase() === "all") {
            selectedPaths = discovered.map((s) => s.relPath);
          } else {
            const idx = parseInt(answer, 10) - 1;
            if (isNaN(idx) || idx < 0 || idx >= discovered.length) {
              throw new Error("Invalid selection. Aborting.");
            }
            selectedPaths = [discovered[idx].relPath];
          }
        } else {
          // Non-interactive without --path or --all
          error(
            `Repository contains ${discovered.length} skills. Use --path <subdir> to pick one or --all to install all.\n` +
              `Available skills:\n${discovered.map((s) => `  --path ${s.relPath}`).join("\n")}`,
          );
          process.exit(2);
        }

        for (const relPath of selectedPaths) {
          const skillDir = joinPath(tempDir, relPath);
          console.error(`\n${"─".repeat(40)}`);
          try {
            const result = await installSingleSkill(
              args,
              sourceStr,
              source,
              tempDir,
              skillDir,
              // For multi-skill, don't use --name (it would conflict across skills)
              selectedPaths.length === 1 ? args.flags.name : null,
              config,
              provider,
            );
            results.push(result);
            console.error(
              ansi.green(`✓ Installed "${result.name}" to ${result.path}`),
            );
          } catch (skillErr: any) {
            console.error(
              ansi.red(
                `✗ Failed to install from ${relPath}: ${skillErr.message}`,
              ),
            );
            if (selectedPaths.length === 1) throw skillErr;
          }
        }
      }
    }

    // Remove signal handlers
    process.removeListener("SIGINT", cleanup);
    process.removeListener("SIGTERM", cleanup);

    if (args.flags.json) {
      console.log(
        JSON.stringify(results.length === 1 ? results[0] : results, null, 2),
      );
    } else if (results.length === 1) {
      console.error(
        ansi.green(`\n✓ Installed "${results[0].name}" to ${results[0].path}`),
      );
    } else {
      console.error(
        `\n${ansi.green(`✓ Installed ${results.length} skill(s) successfully.`)}`,
      );
    }
  } catch (err: any) {
    // Remove signal handlers
    process.removeListener("SIGINT", cleanup);
    process.removeListener("SIGTERM", cleanup);

    if (args.flags.json) {
      console.log(
        JSON.stringify({ success: false, error: err.message }, null, 2),
      );
    } else {
      error(err.message);
    }
    process.exit(1);
  } finally {
    if (tempDir) {
      await cleanupTemp(tempDir);
    }
  }
}

// ─── Main CLI dispatcher ────────────────────────────────────────────────────

export async function runCLI(argv: string[]): Promise<void> {
  const args = parseArgs(argv);

  // Apply --no-color
  if (args.flags.noColor) {
    (globalThis as any).__CLI_NO_COLOR = true;
  }

  // --version at top level
  if (args.flags.version) {
    console.log(`asm ${VERSION_STRING}`);
    return;
  }

  // --help at top level (no command)
  if (!args.command && args.flags.help) {
    printMainHelp();
    return;
  }

  // No command → return null to signal TUI launch
  if (!args.command) {
    return;
  }

  switch (args.command) {
    case "list":
      await cmdList(args);
      break;
    case "search":
      await cmdSearch(args);
      break;
    case "inspect":
      await cmdInspect(args);
      break;
    case "uninstall":
      await cmdUninstall(args);
      break;
    case "audit":
      await cmdAudit(args);
      break;
    case "install":
      await cmdInstall(args);
      break;
    case "config":
      await cmdConfig(args);
      break;
    default:
      error(`Unknown command: "${args.command}"`);
      console.error(`Run "asm --help" for usage.`);
      process.exit(2);
  }
}

// ─── Check if CLI mode should run ──────────────────────────────────────────

export function isCLIMode(argv: string[]): boolean {
  const args = argv.slice(2);
  if (args.length === 0) return false;

  // Known commands
  const commands = [
    "list",
    "search",
    "inspect",
    "uninstall",
    "audit",
    "config",
    "install",
  ];
  const first = args[0];

  // If the first arg is a known command, it's CLI mode
  if (commands.includes(first)) return true;

  // --help and --version are handled in CLI mode too
  if (first === "--help" || first === "-h") return true;
  if (first === "--version" || first === "-v") return true;

  // Unknown flags/commands → CLI mode (will show error)
  if (first.startsWith("-") || first.length > 0) return true;

  return false;
}
