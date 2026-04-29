# Skill Writing Guide

Anatomy, progressive disclosure, writing patterns, bundled-script hygiene, and the report-format conventions used in skill bodies.

## Anatomy of a Skill

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

## Progressive Disclosure

Skills use a three-level loading system:

1. **Metadata** (name + description) — Always in context (~100 words)
2. **SKILL.md body** — In context whenever skill triggers (keep under 500 lines)
3. **Bundled resources** — As needed (unlimited, scripts can execute without loading)

**Key patterns:**

- Keep SKILL.md under 500 lines. This is a hard rule — longer SKILL.md files waste tokens on every invocation and tend to bury important guidance. Approaching the limit means it's time to add another layer of hierarchy: pull dense sections out to `references/` and replace them with a one-line pointer like "Read `references/foo.md` when you need X."
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

## Principle of Lack of Surprise

Skills must not contain malware, exploit code, or any content that could compromise system security. A skill's contents should not surprise the user in their intent if described. Don't go along with requests to create misleading skills or skills designed to facilitate unauthorized access, data exfiltration, or other malicious activities. "Roleplay as an XYZ" skills are fine.

## Writing Patterns

Prefer the imperative form in instructions.

**Defining output formats** — like this:

```markdown
## Report structure

ALWAYS use this exact template:

# [Title]

## Executive summary

## Key findings

## Recommendations
```

**Examples pattern** — useful to include real input/output:

```markdown
## Commit message format

**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

## Bundled scripts and error messages

When a skill includes scripts under `scripts/`, the scripts become part of the agent's execution surface — an agent runs them and reacts to what they print. A terse, unexplained `exit 1` is effectively a dead end: the agent sees a non-zero exit and has no idea what went wrong or how to recover.

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

## Step Completion Reports

Every skill must produce a structured status report after each major phase — compact monospace block with checkmark rows and a summary result line, so pass/fail is immediately scannable. Tailor the check names to what each step actually validates (e.g., a code review skill might use `Correctness`, `Test coverage`, `Security`, `Edge cases`; a deploy skill might use `Build`, `Tests`, `Lint`, `CI status`).

## Writing Style

Explain to the model _why_ things are important in lieu of heavy-handed musty MUSTs. Use theory of mind and try to make the skill general and not super-narrow to specific examples. Start with a draft, then look at it with fresh eyes and improve it.

## Generate README.md

If the skill ships a README.md, place it in `docs/README.md`. **README.md is for human catalog browsing only — it ships inside the `.skill` package but is never auto-loaded into agent context**, so it costs zero runtime tokens. Every README.md must carry an AI-skip HTML comment at the top so agents don't accidentally read it.

Read `references/readme-template.md` when authoring or updating a `docs/README.md` — it contains the AI-skip notice, the full template (title, highlights, when-to-use table, mermaid `How It Works` diagram, usage, resources, output), and the rules for each section.

## Test Cases

After writing the skill draft, come up with 2-3 realistic test prompts — the kind of thing a real user would actually say. Share them with the user and ask whether to add more, then run them.

Save test cases to `evals/evals.json`. Don't write assertions yet — just the prompts. Draft assertions in the next step while runs are in progress.

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

See `references/schemas.md` for the full schema (including the `assertions` field, added later).

Read `references/output-patterns.md` when designing output formats or file-writing behavior for a skill.
Read `references/workflows.md` when structuring multi-phase workflows or iteration loops in a skill.
Read `references/subagent-patterns.md` when the skill involves heavy exploration, parallel tasks, review loops, or large artifact generation.

## Optional: pre-eval LLM validation

Before spending tokens on full eval runs, you can run a cheaper 4-phase LLM validation pass to catch triggering failures, ambiguous logic, edge-case blind spots, and architectural bloat. Read `references/validation-prompts.md` for the copy-pasteable prompts:

1. **Discovery validation** — does the frontmatter trigger correctly in isolation?
2. **Logic validation** — simulated step-by-step execution to find ambiguous instructions
3. **Edge case testing** — adversarial prompts to find failure states
4. **Architecture refinement** — enforces progressive disclosure and token discipline

Optional — useful right after drafting a skill, after a large rewrite, or when an eval fails in a way you can't explain.
