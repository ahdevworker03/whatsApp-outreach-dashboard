---
name: debugging
description: Systematic debugging methodology for web applications, including frontend (React/TypeScript) and backend (Express/Node.js) debugging, browser DevTools usage, Node.js debugging, logging strategies, error analysis, performance profiling, memory leak detection, and database query debugging. Applicable when troubleshooting bugs, investigating production issues, analyzing error logs, or optimizing application behavior.
---

# Debugging

## Purpose

This skill guides the agent in systematically diagnosing and resolving issues across the full stack using official debugging tools and methodologies. Debugging is a disciplined process of identifying, isolating, and fixing bugs through observation, hypothesis, and experimentation. The skill covers frontend debugging with browser DevTools, backend debugging with Node.js inspector, logging strategies, performance profiling, memory leak detection, and database query debugging.

---

## When to Load

- User is investigating bugs, errors, or unexpected behavior in the application.
- User mentions: `debug`, `debugging`, `bug`, `error`, `issue`, `broken`, `unexpected`, `console.log`, `breakpoint`, `stack trace`, `inspect`, `profiling`, `memory leak`.
- User asks about troubleshooting issues in React, Express, Prisma, or PostgreSQL.
- User is analyzing error logs or stack traces.
- User is optimizing performance or investigating memory usage.

---

## When NOT to Load

- Writing new code without debugging.
- General architecture design or planning.
- Infrastructure or deployment configuration.
- Code review without debugging (see `code-review` skill).
- Performance optimization without profiling (see `performance` skill).

---

## Core Principles

1. **Understand Before Acting** – Never fix a bug you don't understand. Reproduce the issue first and understand the root cause before attempting a fix.
2. **Reproduce the Bug Reliably** – A bug that cannot be reproduced is extremely difficult to fix. Find a consistent way to trigger the bug before investigating.
3. **Divide and Conquer** – Isolate the bug by narrowing down the source. Use binary search or incremental elimination to locate the root cause.
4. **Read the Error** – Most bugs already tell you where and why they happen. Always read the error message and stack trace carefully before taking action.
5. **Use the Right Tools** – Browser DevTools, Node.js inspector, and debugging libraries provide the necessary visibility into application state and execution flow.
6. **Fix One Issue at a Time** – One bug may be hiding another. Fix the most immediate issue first and then see if other issues still occur.
7. **Verify the Fix** – After making a change, verify that the bug is resolved and that no new issues have been introduced.
8. **Add a Regression Test** – A test that covers the fixed issue ensures the bug does not reappear in the future.

---

## Decision Rules

### Frontend Debugging (React/TypeScript)

- **IF** a React component renders incorrectly or not at all, **THEN** inspect the component in React DevTools to check props, state, and hooks.
- **IF** a component re-renders unexpectedly or too frequently, **THEN** use React DevTools Profiler to identify the cause and check dependencies in hooks.
- **IF** the application throws errors in the browser, **THEN** open the browser's console and inspect the error message, stack trace, and line number.
- **IF** the issue occurs on a specific device or browser, **THEN** use browser DevTools to emulate different devices, viewport sizes, and network conditions.
- **IF** the issue is related to network requests, **THEN** use the Network tab to inspect request/response headers, payloads, and status codes.
- **IF** the issue is related to performance (slow rendering, high CPU), **THEN** use the Performance tab to record and analyze a profile session.
- **IF** the issue is related to DOM or layout, **THEN** use the Elements tab to inspect and modify DOM elements, styles, and computed properties.

### Backend Debugging (Express/Node.js)

- **IF** the issue occurs on the server or returns wrong responses, **THEN** use the Node.js inspector with `--inspect` and debug via Chrome DevTools or VS Code.
- **IF** the issue is a runtime error that crashes the server, **THEN** inspect the error logs and stack traces to identify the source.
- **IF** the issue is related to the execution flow or order of operations, **THEN** use breakpoints in VS Code or Node.js inspector to step through the code.
- **IF** the issue is related to middleware or route ordering, **THEN** use console logging or debugger statements to trace the sequence of execution.
- **IF** the issue is a process hanging or not responding, **THEN** use system tools like `top`, `ps`, or Node.js profiling to inspect resource usage.
- **IF** the issue only occurs in production and cannot be reproduced locally, **THEN** set up remote debugging or use APM tools to observe production behavior.

### Database Debugging (PostgreSQL/Prisma)

- **IF** a query returns wrong results or no results, **THEN** log the actual query being executed and its parameters. Use `EXPLAIN ANALYZE` to see the execution plan.
- **IF** a query is slow, **THEN** use `EXPLAIN ANALYZE` to identify missing indexes, inefficient joins, or full table scans.
- **IF** a migration fails or causes issues, **THEN** inspect the migration file and the migration history (`_prisma_migrations` table).
- **IF** data inconsistency occurs, **THEN** check for transaction isolation levels, uncommitted transactions, or missing constraints.
- **IF** an error occurs in Prisma (e.g., `PrismaClientKnownRequestError`), **THEN** check the error code and message. Use Prisma's error codes to identify the specific issue (e.g., `P2002` for unique constraint violation).

### Logging

- **ALWAYS** use structured logging with appropriate log levels (error, warn, info, debug, trace).
- **IF** you need to understand the flow of execution, **THEN** add debug-level logs at key points with sufficient context.
- **IF** you need to inspect data or state, **THEN** log the relevant variables and objects with descriptive messages.
- **IF** you are debugging a production issue, **THEN** use logs to reconstruct the sequence of events leading to the error.
- **NEVER** log sensitive data (passwords, tokens, PII) in production, even in debug logs.

---

## Best Practices

### Systematic Debugging

1. **Reproduce consistently** – Ensure the bug can be reproduced reliably before starting the investigation. Document the reproduction steps.
2. **Define the expected behavior** – Understand what the correct behavior should be before diagnosing the issue.
3. **Form a hypothesis** – Based on the evidence, form a hypothesis about what might be causing the bug. Test the hypothesis with targeted changes.
4. **Make one change at a time** – When testing a fix, change only one variable at a time to confirm the cause. Then make the final fix.
5. **Add regression tests** – Once the bug is fixed, write a test that covers the issue to prevent it from recurring.
6. **Document the fix** – Document the root cause, the steps to reproduce, and the fix for future reference.

### Frontend Debugging Tools

1. **Chrome DevTools** – Use Console, Elements, Sources, Network, Performance, and Application tabs to inspect and debug frontend applications.
2. **React DevTools** – Install the React DevTools extension to inspect component hierarchy, props, state, and hooks in the browser.
3. **Redux DevTools** – If using Redux, use the Redux DevTools extension to inspect actions, state changes, and time-travel debugging.
4. **Mobile emulation** – Use the Device Toolbar to emulate different devices and viewport sizes for mobile-specific issues.

### Backend Debugging Tools

1. **Node.js Inspector** – Use `node --inspect` to enable the inspector protocol and debug with Chrome DevTools or VS Code.
2. **VS Code Debugger** – Configure `.vscode/launch.json` to enable breakpoint-based debugging for Node.js applications.
3. **Node.js Profiling** – Use `node --prof` and `node --trace` to profile CPU usage and performance.
4. **`node-inspect`** – Use the `node-inspect` CLI for a lightweight, terminal-based debugger.

### Database Debugging

1. **Enable query logging** – In Prisma, enable query logging to see every SQL query executed:
   ```ts
   const prisma = new PrismaClient({ log: ["query", "info", "warn", "error"] });
   ```
2. **Log Prisma errors** – Catch Prisma errors and inspect the error code and message:
   ```ts
   try {
     await prisma.user.create({ data });
   } catch (error) {
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
       console.log(error.code, error.message);
     }
   }
   ```
3. **Use `EXPLAIN ANALYZE`** – In production, you can enable query logging and inspect the execution plan for slow queries.
4. **Use `psql`** – Connect directly to the database via `psql` to run queries and test database behavior without the application layer.

---

## Anti-Patterns

| Anti-Pattern                    | Why it is wrong                                        | Correct approach                                            |
| ------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------- |
| Randomly changing code          | Wastes time, may introduce new issues.                 | Form a hypothesis and change only one thing at a time.      |
| Not reproducing first           | Cannot verify if the fix actually worked.              | Always reproduce the bug reliably before investigating.     |
| Not reading the error           | Errors often contain the exact solution or location.   | Read error messages and stack traces carefully.             |
| Using `console.log` exclusively | Adds noise, performance overhead, and must be removed. | Use structured logging or debugger for detailed inspection. |
| Debugging in production         | Performance impact; risks exposing internals.          | Reproduce in development/staging; use logs in production.   |
| Not adding tests for fixes      | Bug may reappear after future changes.                 | Add regression tests covering the issue.                    |
| Making too many changes at once | Impossible to isolate the cause or fix.                | Make one change at a time and verify each.                  |
| Not checking for side effects   | Fix may cause other issues.                            | Verify the fix in the full application context.             |

---

## Common Mistakes & Edge Cases

| Mistake                          | Symptom                                              | Solution                                                             |
| -------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| Missing dependencies in hooks    | Stale closures in React; effect uses outdated state. | Check the dependency array in `useEffect`, `useMemo`, `useCallback`. |
| SQL injection in raw queries     | Database errors or security vulnerabilities.         | Use parameterized queries or Prisma ORM.                             |
| Unhandled promise rejections     | Applications crash or hang.                          | Use `try/catch` with async/await or `.catch()` on promises.          |
| Forgetting to clean up resources | Memory leaks, duplicate listeners, timeout leaks.    | Return cleanup functions in `useEffect`; close database connections. |
| CORS issues                      | API requests blocked in the browser.                 | Configure CORS middleware with correct origins.                      |
| Environment variable mismatches  | Application behaves differently in production.       | Validate environment variables at startup.                           |
| Migration conflicts              | Schema changes break production.                     | Use backward-compatible migrations; test in staging first.           |

---

## Related Skills

- `logging-monitoring` – for production logging and monitoring strategies.
- `performance` – for performance profiling and optimization.
- `testing` – for writing regression tests to prevent bug recurrence.
- `error-handling` – for consistent error handling and logging.
- `react` – for debugging React-specific issues.
- `express` – for debugging backend issues.
- `prisma` – for debugging database queries and errors.
- `postgresql` – for diagnosing database performance and query issues.

---

## Official References

- [Chrome DevTools Documentation](https://developer.chrome.com/docs/devtools/)
- [React Developer Tools](https://react.dev/learn/react-developer-tools)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [Node.js Inspector Documentation](https://nodejs.org/api/inspector.html)
- [Visual Studio Code Debugging – Node.js](https://code.visualstudio.com/docs/nodejs/nodejs-debugging)
- [Node.js Profiling – Official Docs](https://nodejs.org/en/docs/guides/simple-profiling/)
- [PostgreSQL Monitoring and Debugging](https://www.postgresql.org/docs/current/monitoring.html)
- [Prisma Error Reference – Official Docs](https://www.prisma.io/docs/reference/api-reference/error-reference)
- [Prisma Query Logging](https://www.prisma.io/docs/orm/prisma-client/observability/logging)
- [OWASP – Debugging and Testing](https://owasp.org/www-project-testing-guide/)
- [MDN – Debugging JavaScript](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps/What_went_wrong)
