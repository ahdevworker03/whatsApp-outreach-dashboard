---
name: express
description: Express.js work in `apps/api`, including routes, controllers, middleware, and server structure for the Vehicle Rental API. Applicable when building REST APIs, configuring Express applications, writing middleware, defining routes, or deploying Express servers to production.
---

# Express

## Purpose

This skill guides the agent in building robust, secure, and performant Express.js web applications following official Express documentation and best practices. Express is a lightweight and flexible routing framework with minimal core features, meant to be augmented through the use of Express middleware modules. The skill covers middleware composition, routing, error handling, application structure, performance optimization, and production security.

---

## When to Load

- User is building, reviewing, or refactoring Express.js applications, routes, or middleware.
- User mentions: `Express`, `app.get`, `app.post`, `app.use`, `router`, `middleware`, `route`, `req`, `res`, `next`, `server`.
- User is setting up an Express server, defining API endpoints, or configuring middleware.
- User asks about error handling, request/response processing, or application structure.
- User is deploying or optimizing Express applications for production.

---

## When NOT to Load

- Frontend React component development without backend logic.
- Database schema design or migrations.
- Infrastructure or deployment configuration unrelated to the Express application itself.
- General API design without implementation details.

---

## Core Principles

1. **Middleware-First Architecture** – An Express application is essentially a series of middleware function calls. Every request passes through a pipeline of middleware functions that can modify the request, response, or terminate the request-response cycle.
2. **Separation of Concerns** – Keep route definitions, business logic, and data access in separate modules. Use `express.Router()` to group related routes by feature.
3. **Async Error Propagation** – Ensure all errors are passed to Express's error handling middleware. Never let errors go unhandled.
4. **Production Readiness** – Optimize for performance and security. Use compression, avoid synchronous functions, and implement proper logging.
5. **Statelessness** – Each request should contain all information needed to process it. Use middleware for cross-cutting concerns (authentication, logging, parsing).

---

## Decision Rules

### Application Setup

- **ALWAYS** create the app instance with `const app = express()`.
- **IF** using TypeScript, **THEN** install `@types/express` and use proper typing for `req`, `res`, and `next`.
- **IF** the application has routes organized by feature, **THEN** use `express.Router()` for each feature group.
- **ALWAYS** place error-handling middleware after all routes and other middleware.

### Middleware Selection

- **IF** parsing JSON request bodies, **THEN** use `express.json()`.
- **IF** parsing URL-encoded form data, **THEN** use `express.urlencoded({ extended: true })`.
- **IF** serving static files, **THEN** use `express.static()`.
- **IF** compressing responses in production, **THEN** use the `compression` middleware (or implement at reverse proxy level).
- **IF** adding security headers, **THEN** use the `helmet` middleware early in the chain.
- **IF** enabling CORS, **THEN** use the `cors` middleware.
- **IF** parsing cookies, **THEN** use `cookie-parser`.

### Routing

- **IF** defining a route for a specific HTTP method, **THEN** use `app.get()`, `app.post()`, `app.put()`, `app.delete()`, etc..
- **IF** defining a route that handles all HTTP methods, **THEN** use `app.all()`.
- **IF** defining middleware that should run for all requests, **THEN** use `app.use()`.
- **IF** defining route parameters, **THEN** use colon syntax: `app.get('/users/:userId', ...)`.
- **ALWAYS** handle `404 Not Found` at the end of all route definitions with a catch-all middleware.

### Error Handling

- **IF** synchronous code throws an error, **THEN** Express will catch and process it automatically.
- **IF** using asynchronous code with callbacks, **THEN** pass errors to `next(error)`.
- **IF** using Promises or `async/await`, **THEN** wrap in `try/catch` and pass errors to `next`, OR use `express-async-errors` to auto-propagate.
- **IF** using Express 5, **THEN** route handlers returning a rejected Promise automatically call `next(value)`.
- **IF** you pass anything to `next()` (except the string `'route'`), **THEN** Express treats it as an error and skips remaining non-error handlers.
- **ALWAYS** define a custom error-handling middleware with four parameters: `(err, req, res, next)`.

### Request/Response Handling

- **IF** accessing query parameters, **THEN** use `req.query`.
- **IF** accessing route parameters, **THEN** use `req.params`.
- **IF** accessing request body, **THEN** use `req.body` (after body-parsing middleware is applied).
- **IF** accessing request headers, **THEN** use `req.headers` or `req.get()`.
- **IF** sending a JSON response, **THEN** use `res.json()`.
- **IF** sending a file, **THEN** use `res.sendFile()`.
- **IF** setting an HTTP status, **THEN** use `res.status()` before sending.

---

## Best Practices

### Code-Level Performance

1. **Use gzip compression** – Apply the `compression` middleware for production, or implement at the reverse proxy level.
2. **Avoid synchronous functions** – Synchronous functions tie up the executing process. Always use asynchronous versions in production.
3. **Use `--trace-sync-io`** – Use this flag during development to detect synchronous API usage.
4. **Log correctly** – Use `debug` for debugging logs, and production logging libraries like `pino` for app activity.

### Security Best Practices

1. **Don't use deprecated or vulnerable Express versions** – Always use the latest stable version.
2. **Don't trust user input** – Validate and sanitize all input from `req.body`, `req.query`, and `req.params`.
3. **Use security middleware** – Add `helmet()` early in the middleware chain.
4. **Use TLS** – Secure connections with Transport Layer Security in production.
5. **Prevent brute-force attacks** – Implement rate limiting on authorization endpoints.
6. **Use cookies securely** – Set `HttpOnly`, `Secure`, and `SameSite` attributes.

### Application Structure

1. **Group routes by feature** – Don't define all routes in `app.js`. Create a router for each feature group in a `routes` directory.
2. **Separate configuration** – Use environment variables for configuration. Never hardcode secrets.
3. **Modularize middleware** – Extract reusable middleware into separate modules.

---

## Anti-Patterns

| Anti-Pattern                                  | Why it is wrong                                      | Correct approach                                            |
| --------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| Using synchronous functions in route handlers | Blocks the event loop; kills performance under load. | Always use async/await, Promises, or callbacks.             |
| Not handling async errors                     | Unhandled promise rejections crash the app.          | Use try/catch with `next(error)` or `express-async-errors`. |
| Defining all routes in `app.js`               | Becomes too large and hard to maintain.              | Group routes by feature using `express.Router()`.           |
| Using `console.log()` in production           | Synchronous; blocks the event loop.                  | Use `debug` or production logging libraries like `pino`.    |
| Exposing stack traces in production           | Leaks sensitive internal details.                    | Set `NODE_ENV=production` to hide stack traces.             |
| Not using `helmet()`                          | Missing critical security headers.                   | Add `helmet()` early in the middleware chain.               |
| Error handler placed before routes            | Errors from routes aren't caught.                    | Place error handler after all routes.                       |
| Trusting `req.body` without validation        | Security risk; user-controlled input.                | Validate all request body data before use.                  |

---

## Common Mistakes & Edge Cases

| Mistake                                | Symptom                                          | Solution                                                            |
| -------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| Forgetting `express.json()` middleware | `req.body` is `undefined`.                       | Add `app.use(express.json())` before route handlers.                |
| Forgetting `next` in middleware        | Request hangs; no response sent.                 | Always call `next()` or send a response.                            |
| Not catching async errors              | Unhandled promise rejection crashes app.         | Use try/catch with `next(error)` or `express-async-errors`.         |
| Placing error handler before routes    | Errors go to default handler, not custom one.    | Place custom error handler after all routes.                        |
| Using `res.send()` for JSON            | Missing `Content-Type: application/json` header. | Use `res.json()` for JSON responses.                                |
| Not handling 404                       | Clients get generic "Cannot GET /route".         | Add a catch-all `app.use((req, res) => res.status(404).json(...))`. |
| Hardcoding environment variables       | Security risk; breaks across environments.       | Use `process.env` with `.env` files and validation.                 |
| Express 4 vs Express 5 differences     | Code breaks after upgrade.                       | Use migration guide and codemods: `npx @expressjs/codemod upgrade`. |

---

## Related Skills

- `api-design` – for designing RESTful API endpoints and contracts.
- `authentication` – for protecting routes with authentication middleware.
- `error-handling` – for consistent error responses and logging.
- `validation` – for request validation and sanitization.
- `typescript` – for strongly typing `req`, `res`, and middleware.
- `openapi` – for generating OpenAPI specifications from Express routes.
- `logging-monitoring` – for production logging and observability.
- `testing` – for testing routes and middleware.

---

## Official References

- [Express.js Official Website](https://expressjs.com)
- [Express 5.x API Reference](https://expressjs.com/ko/5x/api/)
- [Express Routing Guide](https://expressjs.com/ko/4x/guide/routing/)
- [Express Error Handling Guide](https://expressjs.com/ko/5x/guide/error-handling/)
- [Using Express Middleware](https://expressjs.com/en/guide/using-middleware.html)
- [Writing Middleware for Express](https://expressjs.com/en/guide/writing-middleware.html)
- [Production Best Practices: Performance](https://expressjs.com/en/advanced/best-practice-performance/)
- [Production Best Practices: Security](https://expressjs.com/en/advanced/best-practice-security/)
- [Express 4.x to 5.x Migration Guide](https://expressjs.com/en/guide/migrating-5.html)
- [Express API Reference (4.x)](http://expressjs.com/4x/api.html)
- [Express GitHub Repository](https://github.com/expressjs/express)
