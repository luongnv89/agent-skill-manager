# Output Patterns

Patterns for producing consistent, high-quality output in skills.

## Template Pattern

Provide templates for output format. Match strictness to requirements.

**For strict requirements (API responses, data formats):**

```markdown
## Report structure

ALWAYS use this exact template structure:

# [Analysis Title]

## Executive summary

[One-paragraph overview of key findings]

## Key findings

- Finding 1 with supporting data
- Finding 2 with supporting data
- Finding 3 with supporting data

## Recommendations

1. Specific actionable recommendation
2. Specific actionable recommendation
```

**For flexible guidance (when adaptation is useful):**

```markdown
## Report structure

Here is a sensible default format, but use your best judgment:

# [Analysis Title]

## Executive summary

[Overview]

## Key findings

[Adapt sections based on what you discover]

## Recommendations

[Tailor to the specific context]

Adjust sections as needed for the specific analysis type.
```

## Examples Pattern

For skills where output quality depends on seeing examples, provide input/output pairs:

```markdown
## Commit message format

Generate commit messages following these examples:

**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication

**Example 2:**
Input: Fixed bug where dates displayed incorrectly in reports
Output: fix(reports): correct date formatting in timezone conversion

Follow this style: type(scope): brief description
```

Examples help Claude understand desired style and detail level better than descriptions alone.

## Test Suite Pattern

Every skill should include test cases. Use these templates:

### Triggering Test Suite

Define what should and should not activate the skill:

```markdown
## Triggering Tests

Should trigger:

- "Help me set up a new ProjectHub workspace"
- "I need to create a project in ProjectHub"
- "Initialize a ProjectHub project for Q4 planning"

Should NOT trigger:

- "What's the weather in San Francisco?"
- "Help me write Python code"
- "Create a spreadsheet"
```

### Functional Test Cases

Define expected behavior with Given/When/Then format:

```markdown
## Functional Tests

### Test: Create project with tasks

Given: Project name "Q4 Planning", 5 task descriptions
When: Skill executes workflow
Then:

- Project created in ProjectHub
- 5 tasks created with correct properties
- All tasks linked to project
- No API errors

### Test: Handle missing project name

Given: No project name provided
When: Skill starts workflow
Then:

- Skill asks user for project name
- Does not proceed without a name
- No partial resources created
```

### Performance Comparison

Show improvement over baseline:

```markdown
## Performance Baseline

Without skill:

- User provides instructions each time
- 15 back-and-forth messages
- 3 failed API calls requiring retry
- 12,000 tokens consumed

With skill:

- Automatic workflow execution
- 2 clarifying questions only
- 0 failed API calls
- 6,000 tokens consumed
```

## Validation Checklist Pattern

Include a checklist for verifying skill output quality:

```markdown
## Output Validation Checklist

Before delivering results, verify:

- [ ] All required sections present
- [ ] No placeholder text remaining
- [ ] Data values are realistic and consistent
- [ ] Links and references are valid
- [ ] Formatting follows the template
- [ ] Error cases handled gracefully
```

## Description Quality Pattern

The description field is the most critical part of a skill. Use this structure:

```
[What it does] + [When to use it] + [Key capabilities]
```

**Good examples:**

```yaml
# Specific and actionable
description: Analyzes Figma design files and generates developer handoff
  documentation. Use when user uploads .fig files, asks for "design specs",
  "component documentation", or "design-to-code handoff".

# Includes trigger phrases
description: Manages Linear project workflows including sprint planning,
  task creation, and status tracking. Use when user mentions "sprint",
  "Linear tasks", "project planning", or asks to "create tickets".

# With negative triggers
description: Advanced data analysis for CSV files. Use for statistical
  modeling, regression, clustering. Do NOT use for simple data exploration
  (use data-viz skill instead).
```

**Bad examples (avoid these):**

```yaml
# Too vague
description: Helps with projects.

# Missing triggers
description: Creates sophisticated multi-page documentation systems.

# Too technical, no user triggers
description: Implements the Project entity model with hierarchical relationships.
```
