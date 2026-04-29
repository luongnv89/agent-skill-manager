# README.md template for skills

This file is loaded only when SKILL.md tells you to consult it — i.e., when authoring or revising a skill's `docs/README.md`. It does not need to be in main context the rest of the time.

## What README.md is for

If the skill ships a README.md, place it in a dedicated `docs/` directory. **README.md is for human catalog browsing. It ships inside the `.skill` package but is never auto-loaded into agent context.** The runtime loader only pulls in `name` + `description` from frontmatter (always), `SKILL.md` body (on trigger), and files under `scripts/` / `references/` / `assets/` (only when SKILL.md tells the agent to read them). `docs/` sits outside all four, so a README parked there costs zero runtime tokens.

Keep the file focused on what humans need when deciding whether to install a skill — capabilities, triggers, workflow diagram, usage. The "don't dump human prose that wastes tokens" rule applies to `SKILL.md` and `references/`, not to `docs/README.md`.

## AI-skip notice (required)

Add this warning comment at the top of every README.md file to prevent AI agents from accidentally reading it:

```markdown
<!--
  DO NOT READ THIS FILE — This README.md is for human catalog browsing only.
  It ships inside the .skill package but is NEVER auto-loaded into agent context.
  The runtime loader only reads SKILL.md + references/ + scripts/ + agents/ when the skill triggers.
  If you're an AI agent, read the SKILL.md file instead for skill instructions.
-->
```

## Template

```markdown
<!--
  DO NOT READ THIS FILE — This README.md is for human catalog browsing only.
  It ships inside the .skill package but is NEVER auto-loaded into agent context.
  The runtime loader only reads SKILL.md + references/ + scripts/ + agents/ when the skill triggers.
  If you're an AI agent, read the SKILL.md file instead for skill instructions.
-->

# [Skill Display Name]

> [One-line description of what the skill does]

## Highlights

- [Key capability 1]
- [Key capability 2]
- [Key capability 3]
- [Key capability 4]

## When to Use

| Say this...          | Skill will...  |
| -------------------- | -------------- |
| "[trigger phrase 1]" | [What happens] |
| "[trigger phrase 2]" | [What happens] |
| "[trigger phrase 3]" | [What happens] |

## How It Works

` ` `mermaid
graph TD
    A["[First Step]"] --> B["[Second Step]"]
    B --> C["[Third Step]"]
    C --> D["[Final Step]"]
    style A fill:#4CAF50,color:#fff
    style D fill:#2196F3,color:#fff
` ` `

## Usage

` ` `/[skill-name]` ` `

## Resources

| Path          | Description                   |
| ------------- | ----------------------------- |
| `references/` | [What the references contain] |
| `scripts/`    | [What the scripts do]         |

## Output

[Description of what the skill produces — files, reports, etc.]
```

## README rules

- **Title**: Use the human-readable display name (e.g., "Code Optimizer", not "code-optimizer")
- **Tagline**: One sentence in blockquote format (`>` prefix)
- **Highlights**: 3–5 bullet points of key capabilities
- **When to Use**: Table with 3–4 trigger phrases mapping to actions
- **How It Works**: Mermaid `graph TD` diagram showing the main workflow steps. First node green (`#4CAF50`), last node blue (`#2196F3`)
- **Usage**: Code block with the slash command invocation
- **Output**: Brief description of what the skill produces
- **Resources** (optional): Table with `| Path | Description |` columns if the skill has `scripts/`, `references/`, or `assets/` directories
