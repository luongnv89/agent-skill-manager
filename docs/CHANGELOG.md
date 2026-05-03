# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [2.6.1] - 2026-05-03

### Fixed

- `asm link` handles non-existent paths and directory symlinks gracefully — bare registry-style names (e.g. `asm link code-review`) and missing paths exit 1 with a polished error and an `asm install <name>` suggestion instead of crashing with a Node stack trace; the top-level path probe now uses `stat` instead of `lstat` so directory symlinks are followed (re-linking an already-linked skill works), while inner-loop entry classification still uses `lstat` to avoid traversing nested symlinks (#262)

## [2.6.0] - 2026-05-01

### Added

- `skill-upstream-pr` built-in skill — forks a target repo via `gh`, delegates the improvement loop to `skill-auto-improver`, and opens an upstream PR with an `asm eval` before/after metrics table; mandatory preview/approval before any public action and a minimum-delta check skip trivial PRs (#244)
- `asm eval` accepts `author` as the canonical frontmatter field, with `creator` retained as a legacy alias — autofixer writes `author:` going forward; legacy skills declaring `creator:` keep their score with no migration required (#243)
- `asm eval` `skill-best-practice` provider (v1.0.0 → v1.1.0) — align with `skill-creator` v1.7.1: add `xhigh` to the effort enum, warn on descriptions over the 250-char runtime budget, require `metadata.version` (semver-formatted), warn when `metadata.author` is missing, and require frontmatter `name` to match the parent directory (#246)
- `skill-auto-improver` (v0.2.0 → v1.0.2) — adapt the skill and its workflow to the `skill-creator` standard, restructured around Gate 1 (skill-creator must-pass floor) and Gate 2 (asm-eval 85/8 quality floor); adds a Phase 1 frontmatter-normalization step after `asm eval --fix`, new `references/skill-creator-checklist.md` and `references/frontmatter-audit.md` playbooks, dual-gate report layout, and per-loop `metadata.version` bump for the target skill (#253)
- `Paramchoudhary/ResumeSkills` curated-index source — 20 resume optimization and job-search skills (76 `SKILL.md` entries including cross-platform mirrors) covering ATS optimization, bullet writing, cover letters, LinkedIn profiles, interview prep, salary negotiation, and executive/academic/creative resumes (#256)

### Changed

- Refresh the bundled `skills/skill-creator/` skill to the upstream version — pulls in updated references, scripts, and templates used by `skill-auto-improver` and `skill-upstream-pr`
- Add a local-first security baseline plus CI mirror — pre-commit hook runs `gitleaks` (secrets), `trivy` (dependencies), and `semgrep` (static analysis) offline, exits non-zero on HIGH/CRITICAL, and writes JSON + Markdown reports under `security/`; `.github/workflows/security.yml` mirrors the same runner on push to `main` and pull requests, with the trivy DB cache keyed on a weekly stamp (#257)
- Bring `skill-index-updater` up to the `skill-creator` standard — move `README.md` under `docs/`, normalize frontmatter (`metadata.version` + `metadata.author`, drop top-level `version`), rewrite the description under the 250-char runtime budget with a negative-trigger clause, and add `When to Use` / `Example` / `Expected Output` / `Edge Cases` sections; `asm eval` 76 (C) → 97 (A) with every category >= 8 (#258)
- Re-sync all 27 enabled skill sources via `bun run preindex` — picks up upstream additions, removals, version/description bumps, and refreshed `evalSummary` + `tokenCount` for every skill; net delta +51 skills (6797 → 6848) (#260)

### Fixed

- Website list now surfaces a muted `relPath` sub-label on rows whose `owner/repo::name` collides — plugin-bundle repos ship the same skill name at multiple install paths, and identical-looking cards (matching name, owner/repo, description, badges) made duplicates indistinguishable; non-colliding rows are unchanged (#241)
- `asm install` treats `skills/x-skill` and `./skills/x-skill` identically — when the input contains a path separator and resolves to an existing directory in the current working directory, it is treated as a local path rather than dispatched to the registry as a scoped name (#249)
- `asm install --path` and `--all` compose correctly — when `--all` is set and the resolved path contains skill subdirectories, ASM scans subdirectories instead of failing on missing `SKILL.md`; when a subpath is supplied with `--all`, duplicate detection is scoped to that prefix so unrelated dupes don't abort the install; the zero-skills error message is also scope-aware (#251, #252)

## [2.5.0] - 2026-04-24

### Added

- Bundle builder UI on the catalog website — interactive cart flow with localStorage persistence across routes, bundle metadata form (name/description/author/tags), and either `BundleManifest` JSON export or a pre-filled GitHub feature-request issue to publish the bundle (#238, #240)
- `google/skills` and `antonbabenko/terraform-skill` sources in the skill-index — 13 Google product/technology skills plus a Terraform/OpenTofu skill for AI agents (#237)
- `asm eval` warning when `README.md` sits at the skill root — flags a common packaging mistake that previously slipped through scoring (#227, #234)

### Changed

- Redesign the website `/changelog` page with an editorial release-log aesthetic — two-column layout with Fraunces + Instrument Serif masthead, JetBrains Mono sticky version index, outlined tag pills, and numbered receipt-style entries; existing `ENTRIES` data preserved verbatim
- Remove the `eu-project-ops` predefined website bundle and update bundle tests and the website changelog bundle count to match the reduced set

### Fixed

- `deploy-website.yml` workflow now also triggers on changes to `website-src/**` and `package.json` — previously release commits that bumped only those paths would not fire the workflow, leaving the live site stale

## [2.4.0] - 2026-04-23

### Added

- `skill-auto-improver` built-in skill — eval-driven improvement loop that runs `asm eval`, applies deterministic `--fix`, and iterates per-category playbook edits until a skill clears the 85/8 quality floor (overallScore > 85 AND every category >= 8) or stops with a blocker report (#209, #218)
- `asm bundle modify` and `asm bundle export` subcommands — non-interactive editing via `--add`, `--remove`, `--description`, `--author`, `--tags`, plus an interactive prompt mode and JSON export with `--force` / `--json` (#204, #205, #208)
- Ship 5 curated pre-defined bundles (`frontend-dev`, `devops`, `ios-release`, `content-writing`, `eu-project-ops`) — new `--predefined` flag on `asm bundle list` to show shipped bundles (#206, #211)
- Full React + Vite + Tailwind + shadcn/ui rewrite of the ASM catalog website — replaces the 4.4k-line single-file `index.html` with sidebar + detail two-pane layout for catalog and bundles, plus `/bundles`, `/docs`, and `/changelog` SPA pages (#228, #229, #230, #231, #207, #215)
- `react-window` virtualization of the catalog sidebar — click latency on the 6,783-skill catalog drops from ~10s to instant (#232)
- Mobile burger menu consolidating theme toggle, GitHub link, and nav items at `<=768px` with aria-expanded, aria-controls, Escape-to-close, and outside-click dismissal (#216, #217)
- Real ASM nexus logo in website header

### Changed

- Drop Bun from the toolchain — replace `@opentui/core` with `ink` for the TUI so CLI and TUI both run on Node >=18 alone, removing the `bun:ffi` native dependency (#224, #226)
- Make `bun` optional at install time — CLI runs on Node; Bun is only required for interactive TUI mode (#221, #223)
- Rename eval provider ID `skill-creator` → `skill-best-practice` to avoid collision with the Anthropic `skill-creator` skill; include warning-severity checks in the score denominator; add per-check `√`/`×`/`⚠` breakdown under each extra provider's score line

### Performance

- Split `catalog.json` into a compact list + a MiniSearch index — faster initial load and smaller per-request payloads on the website (#214, #220)

### Fixed

- Include `relPath` in the catalog dedup key so plugin-bundle variants aren't dropped — recovers ~3k installable targets that the `owner/repo::name` key had silently collapsed; regression tests assert `totalSkills === skills.length` and unique `installUrl` per entry (#201, #203)
- Opt into React Router v7 future flags (`v7_startTransition`, `v7_relativeSplatPath`) to silence v6 deprecation warnings
- Import test accounts for missing providers so the test suite runs cleanly when optional providers aren't installed

## [2.3.0] - 2026-04-21

### Added

- Show estimated token count and `asm eval` scores on every consumer surface — website cards/modal, TUI list/detail, and CLI inspect. Token count uses a `words + spaces` heuristic labelled with `~`; eval scores include overall score, letter grade, per-category breakdown, and an explicit empty state pointing to `asm eval <skill>` when data is missing. Catalog payload is the single source of truth, so all 3,140 indexed skills carry both signals (#191, closes #187 and #188)

### Changed

- Refresh the website Documentation page with the full `asm` command reference — adds 6 missing commands (`import`, `outdated`, `update`, `doctor`, `bundle`, `config path`), expands global-options and install-flags tables, and adds per-command sections with flags and runnable examples (#190, closes #189)

## [2.1.0] - 2026-04-20

### Added

- `heygen-com/hyperframes` curated-index entry — 5 new skills (hyperframes, hyperframes-cli, hyperframes-registry, website-to-hyperframes, gsap) for HTML-based video composition (#184)
- Re-indexed `mattpocock/skills` (18 → 21 skills) (#183)

### Fixed

- Skill discovery now scans 5 levels deep (was 3), catching skills nested under `plugins/<group>/skills/<skill>/SKILL.md`. All curated repos re-indexed — catalog grew from ~1,700 to 3,135 skills across 24 repos (#185)

## [2.0.0] - 2026-04-19

### Removed (BREAKING)

- Drop the `skillgrade` runtime provider and its bundled binary. `asm eval <skill>` is now zero-config — no external binary, API key, Docker, or `eval.yaml` needed; the built-in `quality` provider scores every skill out of the box (#180, #182)
- Remove CLI flags: `--runtime`, `--runtime init`, `--preset`, `--provider`, `--compare`, `--threshold`. CI pipelines using these flags will fail on upgrade — drop the flags and rely on the default quality provider
- Remove `ASM_SKILLGRADE_BIN` environment variable
- Remove `docs/skillgrade-integration.md`

### Changed

- Cuts ~5–10 MB from the npm tarball by dropping `skillgrade` from `dependencies` and `bundledDependencies`

## [1.22.0] - 2026-04-19

### Added

- PATH shadowing detection: `asm --version` warns when multiple `asm` binaries are found on `PATH`; `asm doctor` gains a new `checkNoPathShadowing` check; npm postinstall emits a warning at install time; `install.sh` adds a bash-side warning in `verify_installation`
- Expanded `skillgrade-missing` error in `asm eval` with a manual fallback — guides users through installing Skillgrade by hand when automatic install fails (#176)

### Fixed

- Bundle `skillgrade` via `bundledDependencies` so it ships inside the `asm` package and is always available without a separate install step (#175)
- Auto-initialise `eval.yaml` when missing and fix a misleading init hint in `asm eval --runtime init` output (#174)

## [1.21.0] - 2026-04-19

### Added

- `asm eval <skill>` static quality lint through a new pluggable evaluator framework (`quality@1.0.0` provider wraps the existing SKILL.md linter)
- `asm eval <skill> --runtime` runtime evaluation via [skillgrade](https://github.com/mgechev/skillgrade) — deterministic + LLM-judge graders in a Docker sandbox with CI-ready exit codes
- **Skillgrade now ships bundled with `agent-skill-manager`.** `npm install -g agent-skill-manager` installs everything needed; no separate `npm i -g skillgrade` step. Binary is resolved from asm's own `node_modules` at runtime so there's no PATH pollution or conflict with a system-wide skillgrade
- `ASM_SKILLGRADE_BIN` environment variable to override the bundled binary (useful for developing skillgrade locally, pinning a specific release, or CI containers with a system-provided skillgrade)
- `asm eval <skill> --runtime init` scaffolds an `eval.yaml` for the skill via `skillgrade init`
- `asm eval` flags: `--preset smoke|reliable|regression`, `--threshold <n>`, `--provider docker|local`, `--machine` JSON output
- `asm eval <skill> --compare <id>@<v1>,<id>@<v2>` renders a diff between two provider versions on the same skill — score delta, pass/fail flips, added/removed findings, category deltas
- `asm eval-providers list` subcommand — prints a table of registered providers with version, schema version, description, and external requirements
- Pluggable `EvalProvider` contract with semver-range resolution and a versioned `EvalResult` schema (new `src/eval/` module: `types.ts`, `registry.ts`, `runner.ts`, `config.ts`, `compare.ts`)
- Config section `eval.providers.*` in `~/.asm/config.yml` for pinning provider versions and configuring runtime options (preset, threshold, Docker vs local, external version range)
- Hermes agent as a built-in provider (18 providers total) — supports `~/.hermes/skills/` and `.hermes/skills/`, listed in `asm tools` and on the website's supported-tools section

### Fixed

- Recognize Windows drive paths (e.g. `C:\…`) as local sources in `asm install` (#138)

### Docs

- Add `docs/eval-providers.md` — provider model, version pinning, `--compare` before upgrade, 5-step checklist for adding a new provider
- Add `docs/skillgrade-integration.md` — install skillgrade, write your first `eval.yaml`, presets (smoke/reliable/regression), CI usage, troubleshooting
- Document the `src/eval/` module in `docs/ARCHITECTURE.md`
- README: expanded Runtime Evaluation section, added `eval`/`eval-providers` to the CLI commands table, added eval step to the local-dev workflow

## [1.6.0] - 2026-03-13

### Added

- Default grouped list view: skills installed across multiple providers are collapsed into a single row with colored `[Provider]` badges
- `--flat` flag for `list` and `search` to show one row per provider instance (previous default behavior)
- `-p/--provider` filter on `list` and `search` commands to filter by provider
- Search results display match count header and highlight matching terms in bold/yellow
- Stats dashboard with ASCII bar charts for provider distribution and scope breakdown
- Provider-specific colors throughout CLI output (Claude=blue, Codex=cyan, OpenClaw=yellow, Agents=green)
- Summary footer on `list` output showing total, unique count, provider count, and scope breakdown
- Practical examples section added to all subcommand `--help` texts
- Actionable error hints: "not found" errors now suggest `asm list` or `asm search`
- Audit report now shows actionable hint: "Run `asm audit -y` to auto-remove duplicates"

### Changed

- Paths shortened with `~` prefix throughout all CLI output (list, inspect, audit, uninstall)
- Inspect output uses lighter header style with provider badges instead of numbered list
- Audit output leads with provider-colored labels instead of long paths
- `stats --json` omits `perSkillDiskBytes` by default (use `--verbose` to include)

## [1.5.1] - 2026-03-13

### Fixed

- Compact batch install output: shared settings shown once, one line per skill with progress counter and warning summary
- Replace Unicode characters (checkmarks, arrows, box-drawing, em-dashes) with ASCII-safe equivalents to prevent garbled terminal output
- Fix process hang after interactive provider selection by pausing stdin after read

## [1.5.0] - 2026-03-13

### Added

- `asm install -p all` option to install skills across all enabled providers simultaneously
- Primary provider receives the skill files; other providers get relative symlinks
- Safe symlink handling: existing symlinks are replaced, real directories are skipped (no data loss)
- Interactive provider picker now includes an "All providers" option
- Comprehensive tests for `executeInstallAllProviders`

## [1.4.1] - 2026-03-13

### Added

- `asm install` now accepts plain HTTPS GitHub URLs (e.g., `https://github.com/owner/repo`) in addition to the `github:owner/repo` format (#5)
- Support for `.git` suffix, `/tree/branch` paths, and trailing slashes in HTTPS URLs

### Fixed

- Add type annotations to fix implicit `any` typecheck errors in tests

## [1.4.0] - 2026-03-13

### Added

- `asm install github:user/repo` command for installing skills directly from GitHub repositories
- `--verbose` / `-V` flag for debug output across all commands
- Node.js compatibility layer, config backup, semver sort, readline safety, lazy file counts
- `export`, `init`, `stats`, `link` commands and skill health warnings

### Fixed

- Pin @opentui/core to exact version 0.1.87 for stability
- Make list table test resilient to environments without skills

## [1.3.0] - 2026-03-11

### Added

- Symlink-aware duplicate detection — skills that are symlinks pointing to the same real directory are no longer flagged as duplicates
- `realPath` field on scanned skills via `fs.realpath()` for accurate identity resolution

### Changed

- Audit deduplicates by resolved real path before grouping, preferring the non-symlink (real directory) entry

## [1.2.0] - 2026-03-11

### Added

- Build step (`bun run build`) to bundle the project into a single JS file for npm distribution
- `prepublishOnly` script to auto-build before `npm publish`
- Build script (`scripts/build.ts`) with version and commit hash injection at build time
- `files` field in package.json for clean npm package (only `dist/`, `README.md`, `LICENSE`)

### Changed

- Bin entry points now reference bundled `dist/agent-skill-manager.js` instead of raw TypeScript source
- Version resolution falls back to build-time injected values when running as bundled binary

### Fixed

- Version display works correctly in both development (source) and production (bundled) modes

## [1.1.0] - 2026-03-11

### Added

- Non-interactive CLI mode with full command suite: `list`, `search`, `inspect`, `uninstall`, `audit`, `config`
- `asm` shorthand command alias
- Duplicate skill audit — detect and remove duplicates across providers and scopes (`asm audit`)
- TUI audit overlay with two-phase workflow (groups → instance picker, key: `a`)
- JSON output support (`--json`) for CLI commands
- Output formatter module for consistent table, detail, and JSON output
- One-command install script (`curl | bash`) with automatic Bun installation
- .npmignore to exclude unnecessary files from npm package
- TUI screenshot in README

### Fixed

- Bun global bin PATH handling and asm/agent-skill-manager alias creation in installer
- External font import in SVGs for GitHub rendering

### Changed

- Rebranded project to agent-skill-manager across all files
- Renamed bin entry point to `agent-skill-manager.ts` to match package name
- Renamed package to agent-skill-manager with version info in help output

### Removed

- Obsolete CLI_PLAN.md

## [1.0.0] - 2025-03-11

### Added

- Interactive TUI dashboard with OpenTUI
- Multi-agent support: Claude Code, Codex, OpenClaw, and generic Agents
- Configurable providers via `~/.config/agent-skill-manager/config.json`
- Global and project scope filtering
- Real-time search and sort (by name, version, location)
- Detailed skill view with SKILL.md frontmatter metadata
- Safe uninstall with confirmation dialog
- In-TUI config editor with provider toggle
- CLI entry point with `--help` and `--version` flags
- Pre-commit hooks (Prettier, TypeScript type-checking)
- GitHub Actions CI pipeline
- Unit tests for config, scanner, uninstaller, and frontmatter modules
