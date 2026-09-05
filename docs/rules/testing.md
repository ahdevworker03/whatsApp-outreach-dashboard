# Testing Policy

## Table of Contents

| # | Section |
| - | ------- |
| 1 | [Requirements](#requirements) |

These rules define the repository's testing requirements. Testing methodology, frameworks, and tooling belong in the `testing` skill.

## Requirements

- Every bug fix should include a test that reproduces the bug.
- Every new feature should have corresponding tests.
- Never delete or skip a failing test just to pass coverage.
- Aim for high coverage on critical business logic; do not obsess over 100%.
- Use the test framework specified in `project.md`.
- Run tests before committing when the project configuration allows.
