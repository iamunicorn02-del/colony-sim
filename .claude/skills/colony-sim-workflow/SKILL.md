---
name: colony-sim-workflow
description: Autonomous task execution for the colony-sim project using Taskmaster MCP, subagent-driven development, and Haiku review
metadata:
  type: skill
  source: project-execution-workflow.md
---

# Colony-Sim Autonomous Execution Workflow

Skill for executing Taskmaster tasks autonomously in colony-sim sessions without stopping or asking the user between tasks. This skill defines the standard operating procedure once the human has approved the backlog and wants the AI to work continuously.

## Prerequisites (Global Context)

- This skill is only active when tasks have already been parsed and exist in `.taskmaster/tasks/tasks.json`.
- The project is assumed to be bootstrapped (`npm install` already done).

## Execution Loop (What Happens on Each Task)

### 1. Get Next Task

Run `next_task` via the **Taskmaster MCP** tool. If none is left, stop and report.

```
mcp__taskmaster-ai__next_task(projectRoot: <projectRoot>)
```

### 2. Read Task Details

Retrieve the full task record (title, description, details, testStrategy, priority, complexity, dependencies, status). If `complexity >= 5` and subtasks are empty, **expand** the task first using `expand_task` with the same ID.

### 3. Dispatch Implementation Subagent (Sonnet)

**Prompt template for subagent:**

> You are a senior TypeScript/Next.js engineer. Implement the task below for the colony-sim project. Follow the current codebase style, run `npm run lint` after changes, and do not commit yourself.
>
> **Task:** <task_title>
> **Specification:** <task_details>
> **Files to modify/add:** <inferred from task>
> **Constraints:** No ECS, no DB, no microservices, no multi-threading, no premature optimizations.
>
> Return a summary of what you changed, which files were touched, and any issues encountered.

The controller stays lightweight — it does not accumulate code in its own context.

### 4. Review (Haiku Subagent)

Once the implementation subagent returns, dispatch a **Haiku** subagent for review:

> Review the following diff against the task specification. Check:
> 1. Does the code match the `details` and `testStrategy`?
> 2. Are there obvious bugs or missed edge cases?
> 3. Does it violate constraints from CLAUDE.md (no DB, no ECS, etc.)?
> 4. Return a PASS or list of issues.

Subagent receives: task spec text + full diff of the branch changes (staged + unstaged).

### 5. Fix → Re-Review

If issues are found, re-dispatch the implementation subagent with the review feedback. Loop until Haiku returns **PASS**.

### 6. Commit

```bash
git add -A
git commit -m "<task_domain>: <what was done>" --no-verify
```

- Use a clear, descriptive message (prefix with domain if applicable: `simulation:`, `ui:`, `types:`, etc.).
- Add `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` at the end.

### 7. Mark Done in Taskmaster

```
mcp__taskmaster-ai__set_task_status(id: "<task_id>", status: "done", projectRoot: "<projectRoot>")
```

### 8. Repeat

Return to **Step 1** (`next_task`). Continue until no more tasks are available or the session is exhausted.

## Exception Handling

- **Blocked by unmet dependency:** `next_task` will not return this task. Continue to the next available task.
- **Build/test failure:** Implementation subagent must fix before returning. If it cannot, escalate to the user with the exact error.
- **Unclear spec present in `details`:** If `details` is vague, the implementation subagent should make a reasonable assumption and note it in its return summary. Do not ask the user mid-loop.

## Why This Works

- `next_task` already respects the dependency graph — no manual ordering needed.
- Subagent implementation keeps the controller context lean, allowing more tasks per session.
- Haiku review is fast, cheap, and catches spec mismatches before they ever reach `main`.
- The loop is fully autonomous: once started, the only stopping conditions are "no more tasks" or "out of context budget".

## Notes / Gotchas

- Do **not** use `superpowers:subagent-driven-development`; its two-stage spec+quality review and plan-file requirements are overkill for this single-dev MVP.
- Do **not** ask the user for confirmation between tasks. The approved backlog in Taskmaster is the source of truth.
- If a task's `details` references an external doc (e.g., `docs/ux/task-creation-funnel.md`), the implementation subagent **must** read that doc before starting.
- After the final task finishes, run `git log --oneline -5` and present a summary of completed work.
