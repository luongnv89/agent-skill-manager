---
name: skill-creator
description: "Author, improve, evaluate, and benchmark skills. Use when creating a skill, updating one, running evals, or optimizing a skill's description for triggering. Don't use for invoking skills, writing prose, or scaffolding Python projects."
effort: max
license: MIT
metadata:
  version: 1.7.1
  author: Luong NGUYEN <luongnv89@gmail.com>
---

# Skill Creator

A skill for creating new skills and iteratively improving them.

The core loop:

1. Decide what the skill should do and how it should do it
2. Write a draft
3. Run test prompts against claude-with-access-to-the-skill
4. Evaluate results with the user (qualitative review via `eval-viewer/generate_review.py`, plus quantitative evals)
5. Revise the skill based on feedback and benchmarks
6. Repeat until satisfied; expand the test set and try again at scale

Identify where the user is in this loop and jump in there. New skill from scratch → start at step 1. Existing draft → jump to step 3 or 4. User wants to vibe-iterate without formal evals → support that. After the skill stabilizes, optionally run the description improver to optimize triggering.

## Two entry paths

The skill supports two distinct workflows. **Identify which one the user is on before you do anything else** — they don't share a starting step.

- **Path A — Create a new skill from scratch.** The user wants to capture a workflow, codify a pattern, or build a new capability. Start at **"Creating a skill"** below (Capture Intent → Interview → Write SKILL.md → Test → Eval).
- **Path B — Improve an existing skill.** The user points to a skill that already exists and wants it brought up to standard, fixed, optimized, or iterated based on eval feedback. **Do not start with Capture Intent** — the intent is already encoded in the existing SKILL.md. Start at **"Improving an existing skill"** below.

If the user's request is ambiguous ("can you look at this skill?"), assume **Path B** and ask them to confirm before interviewing them as if it were a new skill. Path B is also the one that fires when the user invokes `/skill-creator` while pointing at a skill directory or file.

Both paths share the mandatory rules above the "Creating a skill" section: **Repo Sync Before Edits**, **Version Management**, **YAML Frontmatter Safety**, and **Frontmatter Audit on Review/Evaluation**. Apply them in either path.

## Step Completion Reports

After completing each major step, output a status report in this format:

```
◆ [Step Name] ([step N of M] — [context])
··································································
  [Check 1]:          √ pass
  [Check 2]:          √ pass (note if relevant)
  [Check 3]:          × fail — [reason]
  [Check 4]:          √ pass
  [Criteria]:         √ N/M met
  ____________________________
  Result:             PASS | FAIL | PARTIAL
```

Adapt the check names to match what the step actually validates. Use `√` for pass, `×` for fail, and `—` to add brief context. The "Criteria" line summarizes how many acceptance criteria were met. The "Result" line gives the overall verdict.

**Intent Capture phase checks:** `Goal defined`, `Triggers identified`, `Output format agreed`

**Skill Writing phase checks:** `SKILL.md written`, `README generated`, `Subagents designed`

**Testing phase checks:** `Evals created`, `Runs completed`, `Viewer launched`

**Iteration phase checks:** `Feedback incorporated`, `Benchmarks improved`, `Description optimized`

## Communicating with the user

Users span a wide range of technical familiarity. Match jargon to context cues: "evaluation" and "benchmark" are borderline-fine; "JSON" and "assertion" need clear cues that the user knows the term before you use it without explaining. Briefly define terms when in doubt.

---

## Mandatory Rule for Repo-Mutating Skills

When creating or updating any skill that changes files in a git repository (code, docs, config, commits, publishing), include this rule in that skill's SKILL.md:

- Add a **"Repo Sync Before Edits (mandatory)"** section near the top.
- Require pulling latest remote branch before modifications:
  - `branch="$(git rev-parse --abbrev-ref HEAD)"`
  - `git fetch origin`
  - `git pull --rebase origin "$branch"`
- If working tree is dirty: stash, sync, then pop.
- If `origin` is missing or conflicts occur: stop and ask the user before continuing.

Do not ship repo-mutating skills without this pre-sync guardrail.

## Version Management (mandatory)

Every skill must have a `metadata.version` field in its YAML frontmatter using semantic versioning (`MAJOR.MINOR.PATCH`). This version tracks the evolution of the skill itself — it tells users and tooling which iteration they're running.

**When creating a new skill**, set `metadata.version: 1.0.0` in the frontmatter:
```yaml
---
name: my-skill
description: ...
metadata:
  version: 1.0.0
---
```

**When updating or modifying an existing skill**, always bump the version before saving. Read the current version from the frontmatter and increment it:
- **Patch** (`x.y.Z`): Bug fixes, typo corrections, minor wording tweaks that don't change behavior
- **Minor** (`x.Y.0`): New capabilities, added sections, new subagents, expanded trigger phrases
- **Major** (`X.0.0`): Breaking changes to the skill's workflow, output format changes, restructured architecture

If the frontmatter has no `metadata.version` field, add one starting at `1.0.0`.

This applies every time you write or edit a SKILL.md — whether creating from scratch, improving after eval feedback, optimizing the description, or any other modification. The version bump is part of the edit, not a separate step.

## YAML Frontmatter Safety (mandatory)

YAML is surprisingly easy to break. An unquoted value containing a colon (`:`) causes many parsers to treat the rest of the line as a new mapping, silently producing wrong output or a hard parse error. This has bitten real skills — `cli-builder` and `code-review` both shipped with broken frontmatter for this reason.

**Rule: quote every frontmatter string that contains any of these characters: `:`, `#`, `{`, `}`, `[`, `]`, `,`, `&`, `*`, `?`, `|`, `-`, `<`, `>`, `=`, `!`, `%`, `@`, `` ` ``.**

In practice, the safest approach is to quote all multi-word string values in frontmatter by default — it costs nothing and prevents the whole class of bugs.

**Examples of the problem and the fix:**

```yaml
# BROKEN — the : after "workflow" starts a new mapping in strict parsers
description: Follows a 5-step workflow: Analyze -> Design -> Plan -> Execute -> Summarize.

# FIXED
description: "Follows a 5-step workflow: Analyze -> Design -> Plan -> Execute -> Summarize."
```

```yaml
# BROKEN — the : after "B+C" breaks strict parsers
architecture: subagent (Pattern B+C: Parallel Workers + Review Loop)

# FIXED
architecture: "subagent (Pattern B+C: Parallel Workers + Review Loop)"
```

When writing or editing any SKILL.md frontmatter, scan every value for colons and other special characters and wrap the value in double quotes if any are present. If the value itself contains double quotes, escape them with `\"`.

## Frontmatter Audit on Review/Evaluation (mandatory)

Whenever this skill is used to **review, evaluate, improve, or iterate on an existing skill** (not just author a new one), audit the target skill's YAML frontmatter as part of the review. Broken or outdated frontmatter is one of the most common defects in published skills, and it silently degrades triggering, validation, and catalog display — so reviewers should not let it slide.

**What to check on every review:**

- **Required fields present**: `name` and `description` exist and are non-empty strings.
- **`name` matches the parent directory** exactly (e.g., `skills/my-skill/SKILL.md` → `name: my-skill`). Mismatches fail `scripts/quick_validate.py`.
- **`name` format**: 1–64 chars, lowercase letters/digits/hyphens only, no leading/trailing or consecutive hyphens.
- **`description` is a single line** (no newlines), with no angle brackets. Target **≤250 characters** to stay within the runtime context budget; **1024 is a hard ceiling** but only the spec-level limit. See "Description length budget" below.
- **Negative-trigger clause**: description names adjacent domains that should *not* trigger the skill (e.g., "Don't use for …"). `quick_validate.py` emits a warning when it's missing — treat that as a review finding, not noise.
- **Only allowed top-level keys** appear: `name`, `description`, `license`, `allowed-tools`, `metadata`, `compatibility`, `effort`. Anything else is a typo or a stale field (e.g., a flat `version:` or `author:` at the top level — both belong under `metadata:`).
- **`metadata.version`** is present and follows `MAJOR.MINOR.PATCH`. If missing, flag it and propose `1.0.0`.
- **`metadata.author`** is present when the skill is published/shared. If the skill uses a different key for authorship (e.g., `creator`, `owner`, `maintainer`), normalize it to `author` under `metadata:` — this is the convention in this repo.
- **`effort`** (if set) is one of `low | medium | high | xhigh | max`.
- **YAML safety**: any string value containing `:`, `#`, `-`, `<`, `>`, `|`, `{`, `}`, `[`, `]`, `,`, `&`, `*`, `?`, `=`, `!`, `%`, `@`, or `` ` `` is wrapped in double quotes. See "YAML Frontmatter Safety" above.
- **Consistency with `docs/README.md`**: the skill name, description summary, and author shown to humans should match what's in the frontmatter.

**How to apply the findings:**

1. Run `python scripts/quick_validate.py <skill-path>` first — it catches the mechanical issues (allowed keys, name format, description length, missing negative trigger) without any LLM reasoning.
2. For each issue found:
   - If the user asked to **fix** the skill (review-and-improve workflow, `/ship`-style commands, or an explicit "update this"), apply the correction directly as part of the edit and **bump `metadata.version`** per the Version Management rules above. A frontmatter fix is typically a **patch** bump; renaming a field or restructuring metadata is **minor**.
   - If the user asked only to **review / evaluate** (read-only assessment, PR review, audit), surface the issues as concrete suggestions in the review output — include the exact before/after YAML so the user can paste it in. Do not silently edit the file in review-only mode.
3. Include the frontmatter audit in the step-completion report under a check named `Frontmatter valid` (pass/fail with a brief note on what was fixed or suggested).

This audit is cheap and catches real regressions, so run it on every review pass — not just on the first one.

## Creating a skill

### Capture Intent

Start by understanding the user's intent. The current conversation might already contain a workflow the user wants to capture (e.g., they say "turn this into a skill"). If so, extract answers from the conversation history first — the tools used, the sequence of steps, corrections the user made, input/output formats observed. The user may need to fill the gaps, and should confirm before proceeding to the next step.

1. What should this skill enable Claude to do?
2. When should this skill trigger? (what user phrases/contexts)
3. What's the expected output format?
4. Should we set up test cases to verify the skill works? Skills with objectively verifiable outputs (file transforms, data extraction, code generation, fixed workflow steps) benefit from test cases. Skills with subjective outputs (writing style, art) often don't need them. Suggest the appropriate default based on the skill type, but let the user decide.
5. **Should this skill use subagents?** Evaluate whether the skill would benefit from delegating work to subagents via the Agent tool. Read `references/subagent-patterns.md` for the full guide, but the key signals are:
   - Will the skill read many files or scan large codebases? → Explorer subagent
   - Can parts of the work run in parallel? → Parallel worker subagents
   - Does the skill need independent quality review? → Review loop with fresh subagents
   - Will the skill produce large artifacts that require focused reasoning? → Executor subagent
   If any of these apply, design the skill with a main-agent-as-orchestrator architecture where the main agent handles user communication and coordination, and subagents handle the heavy lifting. This keeps the main conversation context clean.

### Interview and Research

Proactively ask questions about edge cases, input/output formats, example files, success criteria, and dependencies. Wait to write test prompts until you've got this part ironed out.

Check available MCPs - if useful for research (searching docs, finding similar skills, looking up best practices), research in parallel via subagents if available, otherwise inline. Come prepared with context to reduce burden on the user.

### Write the SKILL.md

Based on the user interview, fill in these components:

- **name**: Skill identifier. Must be **1-64 characters**, **lowercase letters, digits, and hyphens only**, **no consecutive hyphens**, and must **exactly match the parent directory name**. Example: a skill at `skills/my-skill/SKILL.md` must have `name: my-skill`. These rules are enforced by `scripts/quick_validate.py` — mismatches will fail validation.
- **description**: When to trigger, what it does. This is the primary triggering mechanism — include both what the skill does AND specific contexts for when to use it. All "when to use" info goes here, not in the body. **The description MUST be a single line (no newlines or line breaks)** — this is required for correct parsing by external tools and automation that process skill metadata. Claude currently tends to *undertrigger* skills — to skip them when they'd be useful — so make descriptions a little bit "pushy." But pushy has a complement: **negative triggers** (see below).
- **effort** (optional): How much reasoning effort the skill requires. Valid values: `low`, `medium`, `high`, `xhigh`, `max`. Defaults to `high` when omitted. Use `low` for simple lookups or template fills, `medium` for moderate multi-step tasks, `high` for complex workflows requiring deep reasoning, `xhigh` for tasks needing extended deliberation beyond `high` but short of full exhaustive analysis, and `max` for tasks demanding exhaustive analysis. This is an optional attribute — not all tools support it yet.
- **metadata.version**: Semantic version string (e.g., `1.0.0`). See "Version Management" above — this must be set on creation and bumped on every update.
- **compatibility**: Required tools, dependencies (optional, rarely needed)
- **the rest of the skill :)**

#### Writing a good description: pushy + negative triggers

A description has two jobs: pull in the queries that *should* trigger the skill, and push away the queries from adjacent domains that *shouldn't*. Most skill authors do the first part well (the "pushy" half) and forget the second. The result is false-positive triggers — a Tailwind skill running on a Vue project, a Python skill firing on a shell script question.

**The fix is a "Don't use for ..." clause.** Name the adjacent domains that share keywords or intent but are the wrong fit. This is especially important when your skill sits near other skills in the marketplace or covers a narrow slice of a broad topic.

**Example 1 — positive triggers only (insufficient):**
> Creates React components using Tailwind CSS.

**Example 1 — with negative triggers (much better):**
> Creates React components using Tailwind CSS. Make sure to use whenever the user asks for a new React component, UI element, or styled layout. **Don't use for** Vue, Svelte, vanilla CSS, or plain HTML projects.

**Example 2 — positive triggers only:**
> Generates SQL migrations for Postgres schemas.

**Example 2 — with negative triggers:**
> Generates SQL migrations for Postgres schemas. Trigger whenever the user needs a schema change, new table, or index. **Don't use for** MySQL, SQLite, MongoDB, or one-off ad-hoc queries.

Write the positive and negative halves as one continuous sentence or two back-to-back sentences — not a structured list. The description field is prose the model reads at trigger-time; the goal is for it to naturally rule out near-misses without feeling like a contract.

`scripts/quick_validate.py` emits a non-fatal warning if a description appears to lack a negative-trigger clause. It's a nudge, not a blocker — sometimes the skill's domain genuinely has no close neighbors, and that's fine.

#### Description length budget

Three limits on a skill's description, in order of which one bites first:

1. **250 chars** — Claude Code's `/skills` listing cap. Anything beyond is **truncated tail-first**, chopping the negative-trigger clause that prevents false-positive triggering. This is the limit that actually shapes triggering behavior.
2. **~2% of context window** (~16k chars total, ~109 chars overhead per skill) — the shared `available_skills` budget. When it overflows, extra skills become **invisible to the agent**. Override with `SLASH_COMMAND_TOOL_CHAR_BUDGET`, but this does not lift limit #1.
3. **1024 chars** — the API spec ceiling. `quick_validate.py` rejects anything longer.

**Rule: target ≤250 characters.** Treat 1024 as a hard error, not a goal. Writing past 250 wastes effort — the tail never reaches the model. `quick_validate.py` warns (non-fatal) when a description exceeds 250 chars.

For very large skill collections (60+ installed), some authors push to ~130 chars to stay visible inside the total budget. Situational — start with 250.

**How to fit ≤250 chars without losing the negative-trigger clause:** lead with verbs (not "this is a skill that helps…"), drop hedge words ("helps", "allows you to", "users want to"), collapse synonyms, and keep the negative half to two or three adjacent domains. Long examples belong in the SKILL.md body or `references/`, not in the description.

### Skill Writing Guide

#### Anatomy of a Skill

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
├── docs/ (optional — human-only, never auto-loaded)
│   └── README.md (optional — catalog-browsing docs with AI-skip notice)
├── references/ (optional — loaded into agent context when SKILL.md points to them)
│   └── *.md (optional — additional docs loaded as needed)
├── agents/ (optional — subagent prompt files)
│   ├── explorer.md   - Codebase analysis subagent
│   ├── executor.md   - Implementation subagent
│   └── reviewer.md   - Quality review subagent
└── Bundled Resources (optional)
    ├── scripts/    - Executable code for deterministic/repetitive tasks
    └── assets/     - Files used in output (templates, icons, fonts)
```

The `agents/` directory is for skills that use the Agent tool to delegate work to subagents. Each file contains a complete prompt template for a specific subagent role (what it does, what it receives, what it returns). The SKILL.md references these files — e.g., "Read `agents/explorer.md` for the full explorer prompt" — so the main skill stays lean while subagents get detailed instructions. See `references/subagent-patterns.md` for when and how to use this pattern.

#### Progressive Disclosure

Skills use a three-level loading system:
1. **Metadata** (name + description) — Always in context (~100 words)
2. **SKILL.md body** — In context whenever skill triggers (keep under 500 lines)
3. **Bundled resources** — As needed (unlimited, scripts can execute without loading)

**Key patterns:**
- Keep SKILL.md under 500 lines. This is a hard rule for the skills authored here, not just a preference — longer SKILL.md files waste tokens on every invocation and tend to bury important guidance. If you're approaching the limit, add another layer of hierarchy (pull dense sections out to `references/`) and replace them with a one-line pointer like "Read `references/foo.md` when you need X."
- Reference files clearly from SKILL.md with guidance on when to read them
- For large reference files (>300 lines), include a table of contents

**Domain organization**: When a skill supports multiple domains/frameworks, organize by variant:
```
cloud-deploy/
├── SKILL.md (workflow + selection)
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```
Claude reads only the relevant reference file.

#### Principle of Lack of Surprise

This goes without saying, but skills must not contain malware, exploit code, or any content that could compromise system security. A skill's contents should not surprise the user in their intent if described. Don't go along with requests to create misleading skills or skills designed to facilitate unauthorized access, data exfiltration, or other malicious activities. Things like a "roleplay as an XYZ" are OK though.

#### Writing Patterns

Prefer using the imperative form in instructions.

**Defining output formats** — You can do it like this:
```markdown
## Report structure
ALWAYS use this exact template:
# [Title]
## Executive summary
## Key findings
## Recommendations
```

**Examples pattern** — It's useful to include examples. You can format them like this (but if "Input" and "Output" are in the examples you might want to deviate a little):
```markdown
## Commit message format
**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

#### Bundled scripts and error messages

When a skill includes scripts under `scripts/`, the scripts become part of the agent's execution surface — an agent runs them and reacts to what they print. That means a terse, unexplained `exit 1` is effectively a dead end: the agent sees a non-zero exit and has no idea what went wrong or how to recover.

**Rule: scripts must print descriptive, human-readable error messages on stderr (or stdout) before exiting.** The agent that just ran the script should be able to self-correct without the user intervening.

**Bad:**
```bash
if [ -z "$FIELD" ]; then
  exit 1
fi
```

```python
if not frontmatter.get('name'):
    sys.exit(1)
```

**Good:**
```bash
if [ -z "$FIELD" ]; then
  echo "Error: missing required field 'name' in SKILL.md frontmatter." >&2
  echo "Expected format: name: my-skill-name" >&2
  exit 1
fi
```

```python
if not frontmatter.get('name'):
    print(
        "Error: missing required field 'name' in SKILL.md frontmatter. "
        "Expected format: name: my-skill-name",
        file=sys.stderr,
    )
    sys.exit(1)
```

Good error messages say three things: **what went wrong, which input caused it, and how to fix it.** If the fix involves a filename, config key, or command, mention it explicitly — the agent will copy it verbatim.

#### Step Completion Reports (mandatory)

Every skill must produce a structured status report after each major phase — compact monospace block with checkmark rows and a summary result line, so pass/fail is immediately scannable. Mirror the format shown above in the "Step Completion Reports" section near the top of this file. Tailor the check names to what each step actually validates (e.g., a code review skill might use `Correctness`, `Test coverage`, `Security`, `Edge cases`; a deploy skill might use `Build`, `Tests`, `Lint`, `CI status`).

### Writing Style

Try to explain to the model why things are important in lieu of heavy-handed musty MUSTs. Use theory of mind and try to make the skill general and not super-narrow to specific examples. Start by writing a draft and then look at it with fresh eyes and improve it.

### Generate README.md

If the skill ships a README.md, place it in `docs/README.md`. **README.md is for human catalog browsing only — it ships inside the `.skill` package but is never auto-loaded into agent context**, so it costs zero runtime tokens. Every README.md must carry an AI-skip HTML comment at the top so agents don't accidentally read it.

Read `references/readme-template.md` when authoring or updating a `docs/README.md` — it contains the AI-skip notice, the full template (title, highlights, when-to-use table, mermaid `How It Works` diagram, usage, resources, output), and the rules for each section.

### Test Cases

After writing the skill draft, come up with 2-3 realistic test prompts — the kind of thing a real user would actually say. Share them with the user: [you don't have to use this exact language] "Here are a few test cases I'd like to try. Do these look right, or do you want to add more?" Then run them.

Save test cases to `evals/evals.json`. Don't write assertions yet — just the prompts. You'll draft assertions in the next step while the runs are in progress.

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's task prompt",
      "expected_output": "Description of expected result",
      "files": []
    }
  ]
}
```

See `references/schemas.md` for the full schema (including the `assertions` field, which you'll add later).

Read `references/output-patterns.md` when designing output formats or file-writing behavior for a skill.
Read `references/workflows.md` when structuring multi-phase workflows or iteration loops in a skill.
Read `references/subagent-patterns.md` when the skill involves heavy exploration, parallel tasks, review loops, or large artifact generation — to design a subagent architecture that keeps the main agent's context clean.

### Optional: pre-eval LLM validation

Before spending tokens on full eval runs, you can run a cheaper 4-phase LLM validation pass to catch triggering failures, ambiguous logic, edge-case blind spots, and architectural bloat. Read `references/validation-prompts.md` for the copy-pasteable prompts for:

1. **Discovery validation** — does the frontmatter trigger correctly in isolation?
2. **Logic validation** — simulated step-by-step execution to find ambiguous instructions
3. **Edge case testing** — adversarial prompts to find failure states
4. **Architecture refinement** — enforces progressive disclosure and token discipline

This is optional — it's useful right after drafting a skill, after a large rewrite, or when an eval fails in a way you can't explain.

## Running and evaluating test cases

Read `references/eval-loop.md` for the full 5-step sequence (spawn runs, draft assertions, capture timing, grade/aggregate/view, read feedback). That file covers: the with-skill + baseline subagent pattern, the `eval_metadata.json` format, the `timing.json` capture, the `generate_review.py` invocation, and reading `feedback.json` when the user is done.

Do NOT use `/skill-test` or any other testing skill — the flow in `references/eval-loop.md` is the one this skill expects.

## Improving an existing skill

This is **Path B** from the entry-paths block at the top. There are two distinct subpaths inside it. Pick the right one based on what the user is actually asking for — they need different opening moves.

### Subpath B1 — Retrofit an existing skill to the standard

Use this when the user says "update this skill to match the standard," "fix this skill," "review and improve," or invokes `/skill-creator` on a published skill that hasn't been touched in a while. The goal is mechanical conformance, not behavioral redesign. **Do not interview the user about purpose, triggers, or output format** — those are already encoded in the existing SKILL.md.

Sequence:

1. **Read the existing SKILL.md and surrounding directory.** Note the current frontmatter, body length, references, scripts, and version. Skim `docs/README.md` if it exists for human-facing claims to keep consistent.
2. **Run `python scripts/quick_validate.py <skill-path>`.** This catches the mechanical issues (allowed keys, name format, description over 250, missing negative trigger, broken YAML) without reasoning.
3. **Run the Frontmatter Audit** described in "Frontmatter Audit on Review/Evaluation" above. Cover every checklist item, not just what `quick_validate.py` flagged — required fields, name/dir match, allowed keys, `metadata.version`, `metadata.author`, YAML safety, and consistency with `docs/README.md`.
4. **Inspect the body** against the standards in this file:
   - SKILL.md under 500 lines (split to `references/` if not).
   - Step Completion Reports section present.
   - "Repo Sync Before Edits" section if the skill mutates a git repo.
   - Bundled scripts print descriptive errors before exiting.
   - Progressive disclosure used appropriately; references one level deep.
5. **Decide fix vs. review-only mode** (per the Frontmatter Audit rules): if the user asked to fix, apply edits and **bump `metadata.version`** — typically a patch for frontmatter-only fixes, minor for new sections or capabilities, major for restructuring. If the user asked only to review, surface findings as before/after suggestions and do not silently edit.
6. **Re-run `quick_validate.py`** after fixes to confirm clean. Output a Step Completion Report with a `Frontmatter valid` check.
7. **Optional: offer description optimization.** If the description is fine but triggering still feels off, offer the 4-step flow in "Description Optimization" below. Don't run it automatically — it costs eval tokens.

This subpath does **not** require running evals. Retrofitting frontmatter, sections, and structure does not change behavior in a way that needs benchmark comparison. Skip to subpath B2 only if the body changes are substantive enough that the user wants verification.

### Subpath B2 — Iterate on a skill based on eval feedback

Use this when the user has eval results (or wants to run evals) and wants the skill revised based on what the evals show. The opening move is the **eval loop**, not interviewing.

1. If evals already exist, read the latest results and the user's `feedback.json`. If not, run them per "Running and evaluating test cases" above.
2. Read `references/iteration.md` for the five principles of revision (generalize, stay lean, explain the why, spot repeated work, consider subagents) and the iteration loop itself (apply → rerun → review → repeat).
3. Before or alongside content revision, run the **Frontmatter Audit on Review/Evaluation** — a polished body on top of broken frontmatter still fails validation and silently hurts triggering. Don't skip this even when the focus is body content.
4. Bump `metadata.version` per the Version Management rules — typically minor for new capabilities or expanded triggers from feedback, patch for wording fixes.
5. Re-run evals into a new `iteration-<N+1>/` directory and let the user compare.

`references/iteration.md` also documents the optional blind A/B comparison system for "is the new version actually better?" questions.

## Description Optimization

The description field in SKILL.md frontmatter is the primary mechanism that determines whether Claude invokes a skill. After creating or improving a skill, offer to optimize the description for better triggering accuracy.

Read `references/description-optimization.md` for the full 4-step flow: generate trigger eval queries, review with the user via the HTML template, run the optimization loop with `run_loop.py`, and apply the best description. That file also explains the triggering mechanism itself and why substantive queries are better eval material than trivial ones.

### Package and Present (only if `present_files` tool is available)

Check whether you have access to the `present_files` tool. If you don't, skip this step. If you do, package the skill and present the `.skill` file to the user:

```bash
python -m scripts.package_skill <path/to/skill-folder>
```

After packaging, direct the user to the resulting `.skill` file path so they can install it.

## Environment-specific notes

If you're on Claude.ai (no subagents) or in Cowork (subagents but no browser), some mechanics change. Read `references/environment-modes.md` for the adapted flow in each environment. The core loop (draft → test → review → improve) is the same everywhere — only execution mechanics shift.

---

## Reference files

The `agents/` directory contains instructions for specialized subagents. Read them when you need to spawn the relevant subagent.

- `agents/grader.md` — How to evaluate assertions against outputs
- `agents/comparator.md` — How to do blind A/B comparison between two outputs
- `agents/analyzer.md` — How to analyze why one version beat another

The `references/` directory has additional documentation:
- `references/schemas.md` — JSON structures for evals.json, grading.json, etc.
- `references/subagent-patterns.md` — When and how to design skills that use the Agent tool to delegate work to subagents.
- `references/workflows.md` — Workflow patterns for structuring skill instructions, including the Subagent Orchestration pattern (Pattern 8).
- `references/output-patterns.md` — Output format and file-writing patterns.
- `references/validation-prompts.md` — Optional 4-phase LLM validation pass for a draft skill.
- `references/eval-loop.md` — Full 5-step eval run / grade / viewer flow.
- `references/iteration.md` — Principles for improving a skill based on feedback; blind comparison.
- `references/description-optimization.md` — 4-step description-tuning workflow.
- `references/environment-modes.md` — Claude.ai and Cowork-specific adaptations.
- `references/readme-template.md` — AI-skip notice, template, and rules for `docs/README.md`.

---

If you maintain a task list, include "Create evals JSON and run `eval-viewer/generate_review.py` so human can review test cases" — especially in Cowork, where it's easy to skip.
