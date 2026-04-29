# LLM Validation Prompts

Optional 4-phase quality gate for a skill. Use these prompts before running full evals when you want a faster, cheaper smoke-test of the skill's structure and discoverability. Each prompt is copy-pasteable into a fresh Claude session.

The goal is to surface bugs that quantitative evals might miss — triggering failures, ambiguous steps, adversarial breakage, and bloated architecture — without waiting for a full iteration of subagent runs.

## When to run these

- Right after drafting a new skill, before the first eval run.
- After a large rewrite, to sanity-check before spending tokens on evals.
- Before shipping a version you plan to publish.
- When an eval fails in a way you can't explain — one of these phases usually localizes the problem.

You don't need to run all four every time. The phases are ordered so that each assumes the prior one passed: if discovery is broken, logic issues don't matter yet.

## Phase 1 — Discovery validation

Checks that the frontmatter triggers correctly in isolation — before anything else is tested. Run this in a fresh session where the skill is installed.

```
I have a skill available called `<skill-name>` with this description:

> <paste the current description verbatim>

Without reading the skill's SKILL.md body, answer:

1. For each of these user queries, would you consult the skill? Answer yes/no and explain in one sentence why:

   <paste 5-10 queries — mix of clear triggers, clear non-triggers, and near-misses>

2. Based only on the description, what do you think this skill does? What would you NOT expect it to do?

3. What keywords or phrases in the description are doing the most work? Which feel like filler?
```

**What to look for:** should-trigger queries that get "no", should-not-trigger queries that get "yes", and a gap between what you intended and what the description actually implies. If this phase fails, the eval loop won't save you — fix the description first.

## Phase 2 — Logic validation

Simulates step-by-step execution to find ambiguous instructions, missing preconditions, and places where the skill assumes context it doesn't have.

```
Read the attached SKILL.md carefully. Then walk through executing it for this user request:

> <paste a realistic user prompt that should trigger the skill>

Don't actually do the task. Instead, narrate what you would do at each step. At every branching point, pause and ask:

- What decision am I making here, and what information am I using to make it?
- Is the instruction ambiguous? If so, what are the plausible interpretations?
- Does the skill tell me which interpretation to pick, or am I guessing?
- Is there a step where I'd need information the user hasn't given me? How does the skill say to get it?

Flag every ambiguity, missing precondition, or silent assumption. Be especially alert to steps that say "evaluate," "decide," or "choose" without giving concrete criteria.
```

**What to look for:** places where a reasonable agent would branch differently than you intended. These are the bugs that cause eval variance — the same skill producing different behavior on similar inputs.

## Phase 3 — Edge case testing

Adversarial prompts designed to find where the skill breaks. This is about building robustness, not coverage — a single clear failure is more useful than ten near-misses.

```
Read the attached SKILL.md. Your job is to find three prompts that would make the skill fail — either produce wrong output, crash, or trigger when it shouldn't.

Consider:

1. **Boundary inputs** — empty inputs, very large inputs, malformed inputs, inputs in an unexpected format.
2. **Conflicting instructions** — user asks for something the skill partially supports and partially doesn't.
3. **Scope creep** — user asks for something adjacent that the skill might be tempted to handle but shouldn't.
4. **Resource assumptions** — the skill assumes a file, tool, or directory exists; what happens if it doesn't?
5. **Silent mode mismatches** — the skill was written for Claude Code but the user is on Claude.ai (or vice versa).

For each failing prompt, explain which instruction in the skill would lead to the failure and what the output would likely look like.
```

**What to look for:** failure modes the skill doesn't handle. Don't necessarily fix each one — sometimes the right answer is to add a brief guard, sometimes it's to narrow the description so the skill doesn't trigger in that case at all.

## Phase 4 — Architecture refinement

Enforces progressive disclosure and shrinks token footprint. This is where you turn a working skill into a lean one.

```
Read the attached SKILL.md and any referenced files under `references/` and `agents/`.

Answer:

1. **Total line count of SKILL.md:** <N>. Is it under 500?
2. **Load order:** What gets loaded when the skill triggers? List everything that ends up in context.
3. **Dead weight:** Which sections or paragraphs could be moved to `references/` without hurting the skill's ability to execute its core workflow? List them.
4. **Over-specification:** Which instructions over-specify a step that the model could handle with less guidance? (Yellow flag: all-caps ALWAYS/NEVER, rigid step-by-step where reasoning would suffice.)
5. **Missing pointers:** Are there reference files that SKILL.md should mention but doesn't? Are there mentions of files that don't exist?
6. **Duplication:** Is anything said twice — once in SKILL.md and once in a reference, or in two different sections?

For each issue, propose a specific edit: "Move section X to references/Y.md and replace with a one-line pointer: 'Read references/Y.md when you need Z.'"
```

**What to look for:** line-count wins from extraction, over-specified instructions that can become theory-of-mind prose, and reference files that should exist but don't. This phase is about discipline — most skills grow, and this is how you keep them from sprawling.

## Using the results

Don't try to act on every finding at once. Prioritize:

1. Discovery failures first — if triggering is broken, nothing else matters.
2. Logic ambiguities next — these cause eval variance and are usually quick fixes.
3. Edge cases by severity — hard failures over near-misses.
4. Architecture last — cleanup is valuable but doesn't unblock shipping.

After a round of fixes, re-run any phase that showed problems. The goal isn't "all four phases pass perfectly" — it's "no phase is surfacing bugs you'd want a user to find first."
