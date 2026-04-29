# Workflow Patterns

Patterns for structuring skill workflows. Use these when designing the instruction body of a new skill.

## Pattern 1: Sequential Workflow Orchestration

Use when: Multi-step processes in a specific order.

```markdown
## Workflow: Onboard New Customer

### Step 1: Create Account

Call MCP tool: `create_customer`
Parameters: name, email, company

### Step 2: Setup Payment

Call MCP tool: `setup_payment_method`
Wait for: payment method verification

### Step 3: Create Subscription

Call MCP tool: `create_subscription`
Parameters: plan_id, customer_id (from Step 1)

### Step 4: Send Welcome Email

Call MCP tool: `send_email`
Template: welcome_email_template
```

Key techniques:

- Explicit step ordering
- Dependencies between steps
- Validation at each stage
- Rollback instructions for failures

## Pattern 2: Conditional Workflows

Use when: Tasks with branching logic.

```markdown
1. Determine the modification type:
   **Creating new content?** → Follow "Creation workflow" below
   **Editing existing content?** → Follow "Editing workflow" below

2. Creation workflow: [steps]
3. Editing workflow: [steps]
```

## Pattern 3: Multi-MCP Coordination

Use when: Workflows span multiple services.

```markdown
### Phase 1: Design Export (Figma MCP)

1. Export design assets from Figma
2. Generate design specifications
3. Create asset manifest

### Phase 2: Asset Storage (Drive MCP)

1. Create project folder in Drive
2. Upload all assets
3. Generate shareable links

### Phase 3: Task Creation (Linear MCP)

1. Create development tasks
2. Attach asset links to tasks
3. Assign to engineering team
```

Key techniques:

- Clear phase separation
- Data passing between MCPs
- Validation before moving to next phase
- Centralized error handling

## Pattern 4: Iterative Refinement

Use when: Output quality improves with iteration.

```markdown
### Initial Draft

1. Fetch data via MCP
2. Generate first draft report
3. Save to temporary file

### Quality Check

1. Run validation script: `scripts/check_report.py`
2. Identify issues:
   - Missing sections
   - Inconsistent formatting
   - Data validation errors

### Refinement Loop

1. Address each identified issue
2. Regenerate affected sections
3. Re-validate
4. Repeat until quality threshold met

### Finalization

1. Apply final formatting
2. Generate summary
3. Save final version
```

Key techniques:

- Explicit quality criteria
- Iterative improvement
- Validation scripts
- Know when to stop iterating

## Pattern 5: Context-Aware Tool Selection

Use when: Same outcome, different tools depending on context.

```markdown
### Decision Tree

1. Check file type and size
2. Determine best storage location:
   - Large files (>10MB): Use cloud storage MCP
   - Collaborative docs: Use Notion/Docs MCP
   - Code files: Use GitHub MCP
   - Temporary files: Use local storage

### Execute Storage

Based on decision:

- Call appropriate MCP tool
- Apply service-specific metadata
- Generate access link

### Provide Context to User

Explain why that storage was chosen
```

Key techniques:

- Clear decision criteria
- Fallback options
- Transparency about choices

## Pattern 6: Domain-Specific Intelligence

Use when: Skill adds specialized knowledge beyond tool access.

```markdown
### Before Processing (Compliance Check)

1. Fetch transaction details via MCP
2. Apply compliance rules:
   - Check sanctions lists
   - Verify jurisdiction allowances
   - Assess risk level
3. Document compliance decision

### Processing

IF compliance passed:

- Call payment processing MCP tool
- Apply appropriate fraud checks
- Process transaction
  ELSE:
- Flag for review
- Create compliance case

### Audit Trail

- Log all compliance checks
- Record processing decisions
- Generate audit report
```

Key techniques:

- Domain expertise embedded in logic
- Compliance before action
- Comprehensive documentation
- Clear governance

## Pattern 8: Subagent Orchestration

Use when: The skill involves heavy work that would bloat the main agent's context, or multiple independent tasks that can run in parallel.

The main agent acts as a lightweight orchestrator — it coordinates subagents, communicates with the user, and makes decisions. Subagents do the heavy lifting in isolated context.

```markdown
## Phase 1: Explore (subagent)

Spawn an explorer subagent to analyze the current state.
Read `agents/explorer.md` for the explorer prompt.

The explorer returns structured findings (JSON or markdown summary).
The main agent reviews findings — it does NOT read the raw files itself.

## Phase 2: Decide (main agent)

Based on the explorer's findings:

1. Determine the approach
2. Present the plan to the user
3. Get confirmation before proceeding

## Phase 3: Execute (subagent)

Spawn an executor subagent with the confirmed plan.
Read `agents/executor.md` for the executor prompt.

For independent subtasks, spawn multiple workers in parallel.

## Phase 4: Review (subagent, fresh context)

Spawn a reviewer subagent to independently assess the output.
The reviewer must be a NEW agent — never reuse a prior agent.
Read `agents/reviewer.md` for the reviewer prompt.

If NEEDS_FIX: spawn fixer + fresh reviewer, repeat up to 3 cycles.
If PASS: report results to the user.
```

Key techniques:

- Main agent stays lean — orchestration and user communication only
- Subagents get focused prompts with explicit input/output contracts
- Parallel spawn for independent work (`run_in_background: true`)
- Fresh context per review cycle for objectivity
- Graceful degradation: if Agent tool unavailable, execute inline

For the full subagent pattern catalog (Explorer+Executor, Parallel Workers, Review Loop, Research+Synthesis, Staged Pipeline), see `references/subagent-patterns.md`.

## Guided Discovery Pattern

Use when: The skill needs to gather information from the user before acting.

```markdown
## Step 1: Gather Requirements

Ask the user:

- "What is the project name?"
- "Which team members should be added?"

If any answer is unclear, ask follow-up questions before proceeding.

## Step 2: Confirm Understanding

Present a summary:

- Project: [name]
- Team: [members]
- Settings: [defaults]

Ask: "Does this look correct? Confirm or tell me what to change."

## Step 3: Execute

Only proceed after explicit user confirmation.
[Execute the workflow steps]

## Step 4: Validate & Report

Run validation checks and report results to the user.
```

Key techniques:

- Never assume -- ask when unclear
- Present understanding before acting
- Get explicit approval at gates
- Report results transparently
