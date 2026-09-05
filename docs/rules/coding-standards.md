# Coding Standards

## Table of Contents

| # | Section |
| - | ------- |
| 1 | [Core Principles](#core-principles) |
| 2 | [Code Organization](#code-organization) |
| 3 | [Naming](#naming) |
| 4 | [Error Handling](#error-handling) |
| 5 | [Dependencies](#dependencies) |
| 6 | [Maintainability](#maintainability) |

These standards apply across the entire repository regardless of language or framework. Technology-specific guidance belongs in the corresponding skill.

## Core Principles

- Write the simplest solution that correctly solves the current problem.
- Optimize for readability and maintainability over clever implementations.
- Make the smallest coherent change that satisfies the task.
- Avoid over-engineering, speculative abstractions, and premature optimization.
- Prefer consistency with the existing codebase over introducing new patterns.

## Code Organization

- Keep functions, classes, and modules focused on a single responsibility.
- Respect the architecture, folder structure, and module boundaries.
- Reuse existing code when appropriate instead of duplicating logic.
- Introduce new abstractions only when they provide clear value.
- Remove obsolete code rather than leaving unused implementations.
- Don't write comments inside the code unless it's important.

## Naming

- Use names that describe business intent rather than implementation details.
- Follow the repository's existing naming conventions.
- Avoid abbreviations unless they are well known within the project.

## Error Handling

- Fail fast when invalid states are detected.
- Never silently ignore errors.
- Preserve useful context when propagating errors.
- Handle errors at the appropriate architectural layer.

## Dependencies

- Prefer existing project dependencies before introducing new ones.
- Do not add libraries without a clear technical justification.
- Remove unused dependencies when modifying related code.

## Maintainability

- Leave the codebase as clean as or cleaner than you found it.
- Keep implementations easy to understand for future contributors.
- Prioritize long-term maintainability over short-term convenience.
