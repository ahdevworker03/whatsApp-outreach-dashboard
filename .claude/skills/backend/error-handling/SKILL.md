---
name: error-handling
description: Express.js error handling middleware, synchronous and asynchronous error handling, custom error classes, HTTP status codes, error response structures, logging strategies, production vs development error responses, and unhandled rejection/exception handling. Applicable when implementing error handlers, designing error responses, debugging application errors, or setting up global error recovery.
---

# Error Handling

## Purpose

This skill guides the agent in implementing robust, consistent, and secure error handling in Express.js applications following official Express and Node.js best practices. It covers error propagation, middleware composition, custom error classes, synchronous vs. asynchronous error handling, logging, and production-safe error responses. The goal is to prevent unhandled errors from crashing the application while providing meaningful feedback to clients and maintainers.

---

## When to Load

- User is implementing, reviewing, or refactoring error handling logic in Express.js routes or middleware.
- User mentions: `error handling`, `error handler`, `try/catch`, `next(error)`, `uncaughtException`, `unhandledRejection`, `error middleware`, `error response`, `error logging`.
- User asks about handling asynchronous errors, custom error classes, or structured error responses.
- User is debugging errors or setting up global error recovery mechanisms.

---

## When NOT to Load

- Pure frontend or React error boundaries (see `react` and `quality-assurance` skills).
- Database schema design or migrations (see `database-schema-design` and `migrations` skills).
- General API design without implementation details (see `api-design` skill).
- Infrastructure or deployment configuration.

---

## Core Principles

1. **Handle All Errors** – Every error must be caught and handled. Unhandled errors crash the application and degrade user experience.
2. **Centralize Error Handling** – Use a single error-handling middleware to format and send all error responses. Avoid duplicate error handling logic.
3. **Propagate Errors to Middleware** – Use `next(error)` to pass errors to Express's error handling middleware. Do not respond directly in route handlers after an error occurs.
4. **Differentiate Operational from Programming Errors** – Operational errors (validation, authentication, resource not found) should be handled gracefully; programming errors (bugs) should be logged and fixed.
5. **Use Custom Error Classes** – Extend the native `Error` class to add metadata (status codes, error codes, additional context).
6. **Log Meaningfully, Not Excessively** – Log errors with sufficient context for debugging but avoid logging sensitive data.
7. **Secure by Default** – Do not expose stack traces, internal paths, or database details to clients in production.

---

## Decision Rules

### Synchronous vs. Asynchronous Errors

- **IF** a route handler or middleware uses synchronous code, **THEN** Express automatically catches errors and passes them to error handlers.
- **IF** a route handler uses asynchronous code (callbacks, Promises, async/await), **THEN** you must pass errors to `next(error)` to trigger error handling.
- **IF** using `async/await`, **THEN** wrap route logic in `try/catch` and call `next(error)` in the `catch` block.
- **IF** using Promises, **THEN** attach `.catch(next)` to the chain.
- **IF** using `express-async-errors`, **THEN** you can omit explicit `try/catch` blocks; errors are automatically passed to `next`.

### Error Response Structure

- **IF** an error occurs, **THEN** return a consistent JSON error response with at minimum:
  - `error`: An object containing:
    - `code`: A machine-readable error code (e.g., `VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`)
    - `message`: A human-readable error message
    - `status`: The HTTP status code (optional, but helpful for clients)
    - `details` (optional): Additional context (field-specific validation errors, etc.)
- **IF** the error is a validation failure, **THEN** include `details` with field-specific messages:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid input",
      "status": 400,
      "details": {
        "email": "Must be a valid email address",
        "age": "Must be at least 18"
      }
    }
  }
  ```

### Custom Error Classes

- **IF** you need to represent application-specific errors, **THEN** create custom error classes that extend `Error`:
  - `ValidationError` (status 400)
  - `AuthenticationError` (status 401)
  - `AuthorizationError` (status 403)
  - `NotFoundError` (status 404)
  - `ConflictError` (status 409)
  - `InternalError` (status 500)
- **ALWAYS** set the `status` and `code` properties on custom errors.
- **IF** a custom error is not handled explicitly, **THEN** fall back to a generic error handler.

### Error Middleware Placement

- **ALWAYS** place error handling middleware after all routes and other middleware:
  ```ts
  app.use(router);
  app.use(errorHandler);
  ```
- **IF** using multiple error handlers, **THEN** chain them based on error type (e.g., validation errors first, then generic errors).
- **IF** using custom error classes, **THEN** check `error instanceof CustomError` in the error handler to determine the appropriate response.

### Logging

- **ALWAYS** log errors with sufficient context: request ID, user ID, route, method, timestamp, and stack trace (in development).
- **IF** the error is a programming error (unhandled exception), **THEN** log as `error` level.
- **IF** the error is an operational error (validation, not found), **THEN** log as `warn` or `info` level.
- **DO NOT** log passwords, tokens, or personally identifiable information (PII) in error logs.

---

## Best Practices

1. **Use `express-async-errors` for cleaner async error handling** – This package automatically catches async errors and passes them to the error handler:
   ```ts
   import "express-async-errors";
   app.get("/users", async (req, res) => {
     // If this throws, Express will handle it automatically
     const users = await db.user.findMany();
     res.json(users);
   });
   ```
2. **Define a custom `AppError` base class** – Create a base error class that includes `status`, `code`, `isOperational`, and serialize methods:
   ```ts
   class AppError extends Error {
     status: number;
     code: string;
     isOperational: boolean;
     constructor(message: string, status = 500, code = "INTERNAL_ERROR") {
       super(message);
       this.status = status;
       this.code = code;
       this.isOperational = true;
       Error.captureStackTrace(this, this.constructor);
     }
   }
   ```
3. **Use `try/catch` with `async/await` in individual routes when specific context is needed** – This allows you to add additional context to errors before passing them to `next`.
4. **Implement a single error handler middleware** – Centralize error formatting, logging, and response:
   ```ts
   app.use((err, req, res, next) => {
     const status = err.status || 500;
     const code = err.code || "INTERNAL_ERROR";
     const message = err.message || "Internal server error";
     const response = { error: { code, message, status } };
     if (status === 500) response.error.message = "Internal server error";
     if (status >= 500) {
       console.error(`[${req.method}] ${req.url} - ${err.stack}`);
     } else {
       console.warn(`[${req.method}] ${req.url} - ${err.message}`);
     }
     res.status(status).json(response);
   });
   ```
5. **Handle `uncaughtException` and `unhandledRejection`** – These are programming errors that should crash the application after logging:
   ```ts
   process.on("uncaughtException", (err) => {
     console.error("Uncaught Exception:", err);
     process.exit(1);
   });
   process.on("unhandledRejection", (reason, promise) => {
     console.error("Unhandled Rejection at:", promise, "reason:", reason);
     process.exit(1);
   });
   ```
6. **Use a structured logging library** – Use `pino`, `winston`, or `bunyan` for structured logs that include context (request ID, user ID, timestamp).
7. **Use `http-errors` or `boom` for convenience** – These libraries simplify creating HTTP error objects with status codes and messages.
8. **Document error codes** – Maintain a list of error codes and their meanings in your API documentation.
9. **Handle `404 Not Found` at the end** – Add a middleware that catches any unmatched routes and throws a `NotFoundError`.

---

## Anti-Patterns

| Anti-Pattern                                            | Why it is wrong                                                 | Correct approach                                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Responding directly in route `catch` blocks             | Bypasses centralized error handling; duplicates logic.          | Use `next(error)` to delegate to the error handler.                                       |
| Not catching async errors                               | Unhandled promise rejections crash the application.             | Use `try/catch` with `next(error)`, `.catch(next)`, or `express-async-errors`.            |
| Exposing stack traces in production                     | Leaks sensitive internal details to clients.                    | Check `process.env.NODE_ENV` and return generic messages in production.                   |
| Swallowing errors (empty `catch` blocks)                | Bugs are hidden and hard to debug.                              | Always handle or log errors in `catch` blocks.                                            |
| Logging errors at `error` level for client errors       | Noise in logs; misclassification.                               | Use `warn` or `info` for 4xx errors; `error` for 5xx errors.                              |
| Using `throw` in middleware without `next`              | Express may not catch it; unhandled error.                      | Use `next(error)` instead.                                                                |
| Creating custom error classes without setting prototype | `instanceof` checks fail; error properties missing.             | Use `Object.setPrototypeOf(this, CustomError.prototype)` or use modern class inheritance. |
| Not handling `404`                                      | Clients receive generic 404 pages instead of structured errors. | Add a 404 middleware that throws a `NotFoundError`.                                       |

---

## Common Mistakes & Edge Cases

| Mistake                                                             | Symptom                                                       | Solution                                                                         |
| ------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Forgetting to call `next` in async `try/catch`                      | Errors are caught but not propagated; request hangs.          | Always call `next(error)` in the `catch` block.                                  |
| Using `express-async-errors` without `try/catch` for specific logic | Errors pass through, but you lose opportunity to add context. | Use `try/catch` when you need to add additional context to the error.            |
| Error handler placed before routes                                  | Errors from routes are not caught.                            | Place error handler after all routes.                                            |
| Sending HTML errors for JSON APIs                                   | Clients cannot parse HTML error responses.                    | Always return JSON error responses for API routes.                               |
| Not differentiating `isOperational` errors                          | Application crashes on operational errors.                    | Set `isOperational: true` for expected errors; only crash on programming errors. |
| Over-logging sensitive data                                         | Passwords, tokens, or PII appear in logs.                     | Sanitize error logs; use structured logging with redaction.                      |
| Using `process.exit` without draining connections                   | Connections abruptly close; clients see errors.               | For graceful shutdown, close server and database connections before exiting.     |
| Not handling `EADDRINUSE` errors                                    | Server fails to start; user doesn't know why.                 | Catch and log the error with a clear message.                                    |

---

## Related Skills

- `express` – for implementing routes and middleware.
- `validation` – for handling validation errors and field-specific errors.
- `api-design` – for consistent error response structures and status codes.
- `authentication` – for handling authentication and authorization errors.
- `logging-monitoring` – for structured logging and error monitoring.
- `testing` – for testing error scenarios and handlers.

---

## Official References

- [Express Error Handling Guide](https://expressjs.com/en/guide/error-handling.html)
- [Express Error Handling Middleware](https://expressjs.com/en/guide/using-middleware.html#middleware.error-handling)
- [Node.js Error Handling Best Practices](https://nodejs.org/en/docs/guides/error-handling/)
- [Node.js `uncaughtException` Documentation](https://nodejs.org/api/process.html#process_event_uncaughtexception)
- [Node.js `unhandledRejection` Documentation](https://nodejs.org/api/process.html#process_event_unhandledrejection)
- [MDN HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [OWASP Error Handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)
