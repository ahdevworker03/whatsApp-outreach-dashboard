---
name: code-review
description: Code review process and best practices, reviewing pull requests, providing constructive feedback, identifying code quality issues, ensuring consistency with coding standards, verifying test coverage, checking for security vulnerabilities, evaluating performance implications, and maintaining architectural integrity. Applicable when reviewing pull requests, evaluating code changes, providing feedback, or maintaining code quality standards.
---

# Code Review

## Purpose

This skill guides the agent in conducting thorough, constructive, and systematic code reviews following industry best practices. Code review is a critical quality assurance practice that catches bugs early, ensures consistency, spreads knowledge, and maintains architectural integrity. The skill covers what to look for during review, how to provide effective feedback, and how to balance thoroughness with velocity. The goal is to ensure code is correct, secure, performant, maintainable, and aligned with project standards.

---

## When to Load

- User is reviewing a pull request or code changes.
- User mentions: `code review`, `PR review`, `review`, `feedback`, `LGTM`, `change request`, `pull request`, `merge request`.
- User is evaluating code quality, checking test coverage, or verifying adherence to standards.
- User is providing feedback on code changes or requesting changes.
- User is implementing a feature and wants to pre-review their own code.

---

## When NOT to Load

- Writing new code or implementing features without the intent to review.
- General architecture design without implementation.
- Infrastructure or deployment configuration (unless it is part of a code change).
- Documentation-only changes without code changes.

---

## Core Principles

1. **Be Constructive, Not Critical** – The goal is to improve code and help the author grow, not to demonstrate expertise. Frame feedback as suggestions and questions, not demands.
2. **Review for Correctness, Not Style** – Automated tools (linters, formatters) handle style. Focus on logic, design, performance, security, and maintainability.
3. **Review the Code, Not the Author** – Provide objective feedback based on the code, not the person who wrote it.
4. **Balance Thoroughness with Velocity** – Don't block merges for trivial issues, but don't let critical problems slip through.
5. **Verify Understanding** – Ensure you understand the problem being solved before evaluating the solution.
6. **Practice Continuous Improvement** – Learn from reviews to improve future code; share best practices discovered during reviews.

---

## Decision Rules

### What to Review

- **ALWAYS** review for correctness: Does the code do what it's supposed to do? Are there edge cases unhandled?
- **ALWAYS** review for security: Is user input validated and sanitized? Are authentication and authorization checks present? Are secrets exposed?
- **ALWAYS** review for performance: Are there N+1 queries? Is there unnecessary computation? Are resources freed properly?
- **ALWAYS** review for maintainability: Is the code readable? Are there comments for complex logic? Is the code DRY (Don't Repeat Yourself)?
- **ALWAYS** review for test coverage: Are there tests covering the new code? Do the tests test the right things?
- **ALWAYS** review for consistency: Does the code follow project conventions (naming, file structure, patterns)?
- **ALWAYS** review for architectural integrity: Does the change fit the overall architecture? Does it introduce technical debt?

### Review Scope

- **IF** the change is large (> 400 lines), **THEN** ask for smaller, incremental PRs in the future. Large PRs are hard to review and increase the chance of missing issues.
- **IF** the change includes both logical and stylistic changes, **THEN** ask the author to separate them in the future. This makes reviews more focused.
- **IF** the change touches multiple unrelated areas, **THEN** suggest breaking it into separate PRs.

### Providing Feedback

- **IF** an issue is critical (security vulnerability, data loss, broken functionality), **THEN** mark as `blocking` and request changes.
- **IF** an issue is important but not critical (performance concern, maintainability issue), **THEN** mark as `non-blocking` and explain why it should be addressed.
- **IF** an issue is a suggestion or alternative approach, **THEN** mark as `non-blocking` and frame as a question or suggestion.
- **IF** you don't fully understand the code, **THEN** ask clarifying questions rather than assuming issues.
- **ALWAYS** provide specific, actionable feedback. Vague comments like "this doesn't feel right" are not helpful.

### Approving vs. Requesting Changes

- **IF** all blocking issues are addressed, **THEN** approve and merge.
- **IF** there are unresolved blocking issues, **THEN** request changes.
- **IF** there are only non-blocking suggestions, **THEN** approve with comments explaining the suggestions.

### Handling Disagreements

- **IF** you disagree with the author, **THEN** discuss constructively with data and reasoning. Avoid subjective opinions.
- **IF** you cannot reach consensus, **THEN** escalate to a senior team member or tech lead.
- **IF** the author provides a valid justification for their approach, **THEN** accept it even if you would have done it differently.

---

## Best Practices

1. **Start with the big picture** – Understand the purpose of the change before diving into line-by-line details. Review the overall approach first.
2. **Review test coverage** – Ensure new code is covered by tests. If not, ask why. Tests should cover both happy paths and error cases.
3. **Run the code** – Whenever possible, pull the branch and run the code locally to verify it works as expected.
4. **Use checklists** – Use a checklist of common issues (security, performance, error handling, logging) to ensure consistent reviews.
5. **Provide examples** – When suggesting an alternative approach, provide a code example to make the suggestion clear.
6. **Review dependencies** – Check if new dependencies are justified. Are they necessary? Are they well-maintained? Do they align with the project's ecosystem?
7. **Verify logging** – Ensure that errors are logged appropriately, sensitive data is not logged, and log levels are correct.
8. **Check for future maintainability** – Consider whether the code will be easy to understand and modify in 6 months.
9. **Acknowledge good work** – When you see well-written code, efficient solutions, or good practices, call them out. Positive feedback is motivating.

---

## Anti-Patterns

| Anti-Pattern                         | Why it is wrong                                               | Correct approach                                                          |
| ------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Nitpicking style issues              | Wastes time; style should be handled by linters/formatters.   | Use automated tools for style; focus on substance.                        |
| Blocking for subjective preferences  | Slows down development; hurts team morale.                    | Accept valid alternatives; reserve blocking for real issues.              |
| Not understanding the problem        | You cannot evaluate if the code solves the problem correctly. | Read the PR description and understand the context first.                 |
| Lazy reviews ("LGTM" without review) | Missed issues; no quality assurance.                          | Take the time to do a thorough review.                                    |
| Rubber-stamping approvals            | Bypasses the purpose of code review.                          | Always review meaningfully; never approve without understanding.          |
| Not responding to feedback           | Feedback is ignored; issues persist.                          | Acknowledge feedback and either address it or respond with justification. |
| Over-engineering in reviews          | Adds unnecessary complexity; delays delivery.                 | Suggest improvements but prioritize minimal viable changes.               |
| Reviewing only when asked            | Reactively reviewing; not proactive about quality.            | Consider reviewing relevant PRs without being explicitly asked.           |

---

## Common Mistakes & Edge Cases

| Mistake                           | Symptom                                                   | Solution                                                                |
| --------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Not checking error handling       | Code fails in production; unhandled errors crash the app. | Always verify that errors are caught and handled appropriately.         |
| Missing security checks           | SQL injection, XSS, or authentication bypass.             | Review input validation, output sanitization, and authorization checks. |
| Not reviewing test coverage       | Tests pass but don't test the new code.                   | Ensure tests cover the new logic, including edge cases.                 |
| Ignoring performance implications | Code works but is slow under load.                        | Check for N+1 queries, inefficient loops, and memory leaks.             |
| Not checking compatibility        | Changes break other parts of the system.                  | Verify that the change is backward-compatible or update dependent code. |
| Ignoring logging                  | Errors occur but are not logged; debugging is harder.     | Ensure appropriate logging is added for errors and important events.    |
| Overlooking migration safety      | Schema changes break production.                          | Verify that migrations are backward-compatible and tested.              |
| Not checking for TODOs            | Critical tasks are forgotten.                             | Ensure all TODOs are addressed or tracked as issues.                    |

---

## Related Skills

- `typescript` – for type safety and TypeScript-specific code review items.
- `testing` – for ensuring test coverage and quality.
- `security` – for security vulnerability review.
- `performance` – for performance impact review.
- `error-handling` – for error handling and logging review.
- `api-design` – for API contract review.
- `database-schema-design` – for schema change review.
- `migrations` – for migration safety review.
- `refactoring` – for identifying refactoring opportunities.

---

## Official References

- [Google Engineering Practices – Code Review](https://google.github.io/eng-practices/review/)
- [Google Engineering Practices – Developer Guide](https://google.github.io/eng-practices/)
- [Microsoft Code Review Best Practices](https://docs.microsoft.com/en-us/azure/devops/learn/devops-at-microsoft/code-review-best-practices)
- [Atlassian Code Review Guidelines](https://www.atlassian.com/agile/software-development/code-reviews)
- [SmartBear – Code Review Best Practices](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/)
- [OWASP Code Review Guide](https://owasp.org/www-project-code-review-guide/)
- [Prisma Code Review Best Practices](https://www.prisma.io/docs/orm/overview/prisma-in-your-stack/prisma-code-review-best-practices)
- [12 Factor App – Code Review](https://12factor.net/codebase)
- [Clean Code – Code Review Practices](https://www.oreilly.com/library/view/clean-code/9780136083238/)
