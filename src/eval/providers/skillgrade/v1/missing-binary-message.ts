/**
 * Shared formatter for the "skillgrade binary not reachable" error (issue #173).
 *
 * Two call sites surface this error with slightly different headlines:
 *
 *   - `scaffold.ts` spawns `skillgrade init` and catches ENOENT before any
 *     version probe. Headline: `<binary> not installed`.
 *   - `index.ts::applicable()` runs `<binary> --version` first; when that
 *     fails for any reason (ENOENT, wrong exit code, unparseable output)
 *     the headline becomes `<binary> not installed or unreachable`.
 *
 * Both paths share the same *fix options* — this module is the single
 * source of truth so the error text, the docs link, and the re-run hint
 * stay in sync.
 *
 * Shape (single string, newline-separated — one message, rendered verbatim
 * by the CLI's plain-text output and embedded as-is inside JSON/machine
 * envelopes):
 *
 *   <headline>
 *
 *     Fix options:
 *       1. Reinstall agent-skill-manager (bundles skillgrade):
 *            npm install -g agent-skill-manager
 *       2. Install skillgrade manually:
 *            npm install -g skillgrade
 *       3. Point ASM_SKILLGRADE_BIN at a local skillgrade binary:
 *            export ASM_SKILLGRADE_BIN=/path/to/skillgrade
 *
 *     Docs: <hosted troubleshooting URL>
 *
 *     Then re-run:
 *       asm eval <skillPath> <rerunArgs>
 *
 * Acceptance criteria coverage (from issue #173):
 *   - Lists at least two fix paths (reinstall + manual) → options 1 & 2.
 *   - Exact copy-paste commands → `npm install -g …` on its own line.
 *   - Docs link → `Docs:` line points at the hosted troubleshooting anchor.
 *   - Re-run hint reuses the skill path the user invoked → rendered from
 *     `opts.skillPath`.
 */

/**
 * Canonical docs URL — kept as a constant so both the error text and
 * any future call site reference the same anchor. We use the hosted
 * GitHub URL rather than a relative path because the error is read in
 * terminals where `docs/...` links don't click.
 */
export const SKILLGRADE_DOCS_URL =
  "https://github.com/luongnv89/agent-skill-manager/blob/main/docs/skillgrade-integration.md#troubleshooting";

/** Arguments accepted by {@link formatSkillgradeMissingMessage}. */
export interface SkillgradeMissingMessageOptions {
  /**
   * Short one-line headline explaining what's wrong. The two canonical
   * headlines are:
   *   - `"<binary> not installed"` — used by scaffold (no version probe ran).
   *   - `"<binary> not installed or unreachable"` — used by applicable()
   *     (version probe ran and failed, so we can't tell whether the binary
   *     is missing, non-executable, or misbehaving).
   *
   * Kept as a free-form string so callers control the exact wording and
   * existing regex assertions (`/not installed or unreachable/i`) keep
   * passing. The formatter only guarantees the headline is on its own
   * line at the top of the rendered message.
   */
  headline: string;
  /**
   * Absolute skill path the user invoked (`ctx.skillPath` from the provider,
   * `opts.skillPath` from the scaffold). Reused in the "Then re-run:" hint
   * so copy-paste gives the user back the exact command they just ran.
   */
  skillPath: string;
  /**
   * Argv fragment appended after `asm eval <skillPath>` in the re-run hint.
   * Examples: `"--runtime"` (applicable() case), `"--runtime init"`
   * (scaffold case). Kept as a single string because the CLI renders it
   * verbatim — we never need to quote or join array elements.
   */
  rerunArgs: string;
}

/**
 * Render the shared multi-option error message.
 *
 * Pure function, no I/O. The returned string is suitable for:
 *   - CLI stderr (rendered as-is by the runner's error-wrap path)
 *   - `EvalResult.findings[].message` (embedded verbatim, no escaping)
 *   - `ApplicableResult.reason` (same — the CLI prints it unmodified)
 *
 * Leading indent for options/docs/re-run is two spaces — matches the
 * surrounding CLI output style (see DESIGN.md "content under section
 * headers is indented two spaces"). A trailing newline is intentionally
 * omitted; callers decide whether to append one.
 */
export function formatSkillgradeMissingMessage(
  opts: SkillgradeMissingMessageOptions,
): string {
  return [
    opts.headline,
    "",
    "  Fix options:",
    "    1. Reinstall agent-skill-manager (bundles skillgrade):",
    "         npm install -g agent-skill-manager",
    "    2. Install skillgrade manually:",
    "         npm install -g skillgrade",
    "    3. Point ASM_SKILLGRADE_BIN at a local skillgrade binary:",
    "         export ASM_SKILLGRADE_BIN=/path/to/skillgrade",
    "",
    `  Docs: ${SKILLGRADE_DOCS_URL}`,
    "",
    "  Then re-run:",
    `    asm eval ${opts.skillPath} ${opts.rerunArgs}`,
  ].join("\n");
}
