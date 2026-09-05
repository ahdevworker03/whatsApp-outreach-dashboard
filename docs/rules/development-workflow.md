# Development Workflow

## Table of Contents

| # | Section |
| - | ------- |
| 1 | [Preparation](#preparation) |
| 2 | [Planning](#planning) |
| 3 | [Implementation](#implementation) |
| 4 | [Verification](#verification) |
| 5 | [Documentation](#documentation) |
| 6 | [Completion](#completion) |

Follow this workflow for any task that modifies code, tests, documentation, or project structure.

## Preparation

Before making changes:

- Understand the requested task and expected outcome.
- Inspect the relevant repository area before editing.
- Follow the documented architecture and existing implementation patterns.
- Identify source-of-truth boundaries before modifying files.

## Planning

- Small, low-risk tasks may be implemented directly.
- Non-trivial tasks should begin with a brief implementation plan.
- Architectural or product-direction changes require approval before implementation.

## Implementation

- Make the smallest coherent change that satisfies the task.
- Keep changes limited to the requested scope.
- Avoid unrelated refactoring or cleanup unless explicitly requested or required for correctness.
- Preserve existing architectural boundaries.

## Verification

Before considering a task complete:

- Verify the implementation compiles or builds when applicable.
- Run relevant tests when affected.
- Resolve type or lint errors introduced by the change.
- Review the final diff for unintended modifications.

## Documentation

Update documentation only when repository truth changes.

Follow `documentation.md` to determine which documents require updates.

## Completion

Before finishing:

- Confirm the requested task has been completed.
- Summarize what changed.
- Mention any assumptions, limitations, or remaining work.
