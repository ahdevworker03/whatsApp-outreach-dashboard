# Agent Workflow

## 1. Overview

This project uses a mix of AI models for different kinds of work: a senior-model conversation for architecture, planning, and review, and a coding agent (Claude Code) driven by cheaper/faster models for routine implementation, so the subscription usage lasts through the full project timeline.

## 2. Model Roles

**Architecture and planning (Sonnet-tier conversation)**
Used for: architecture decisions, implementation planning, debugging strategy, reviewing agent output, writing implementation prompts, scope discipline.

**Implementation (Claude Code, Haiku-tier by default)**
Used for: routine code generation from a well-scoped prompt, boilerplate (CRUD endpoints, Prisma schema changes, simple components), formatting/cleanup, repetitive frontend work once a pattern is established.

**Escalation rule**
Switch to a stronger model within Claude Code only for: difficult debugging that Haiku-tier fails to resolve after one or two attempts, ambiguous cross-system work, or anything touching the WhatsApp/Meta integration logic directly.

## 3. Working Loop

1. Architecture/planning conversation produces a scoped implementation prompt
2. Prompt is given to Claude Code
3. Claude Code implements and reports back
4. Developer runs/tests the result
5. Output is reviewed against acceptance criteria (in the architecture/planning conversation if needed)
6. If issues are found, a fix prompt is written and the loop repeats

## 4. Prompt Discipline

- Always point to relevant existing docs/files to read first
- State scope and explicit exclusions
- State acceptance criteria
- Do not let the agent invent requirements not in the docs
- Keep prompts scoped to one meaningful unit of work, not tiny fragments and not oversized batches

## 5. Review Discipline

- Agent output is never assumed correct because it "ran" or "tests passed"
- Every output is checked against the actual requirement and the relevant architecture doc
- Bugs, scope creep, and missing edge cases are called out before moving to the next task
- Documentation changes are reviewed the same way as code changes

## 6. Usage Budget Discipline

Because the plan/subscription has a monthly usage limit, expensive-model usage (this conversation) is reserved for decisions and review, not generation. Small clarifying questions are batched rather than opening new expensive-model exchanges. This keeps enough capacity available to finish the project before the deadline.
