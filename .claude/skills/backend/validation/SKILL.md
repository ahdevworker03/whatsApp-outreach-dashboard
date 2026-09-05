---
name: validation
description: Validation work for this repo, especially Zod schemas, API request validation in `apps/api`, and generated validation artifacts in `lib/api-zod`. Applicable when validating user input, defining validation schemas, implementing validation middleware, or securing API endpoints against invalid data.
---

# Validation

## Purpose

This skill guides the agent in implementing robust, type-safe request validation for Express APIs using Zod. Validation ensures that incoming data meets expected formats, types, and constraints before it reaches business logic. It acts as the first line of defense against invalid data, injection attacks, and unexpected input. The skill covers schema definition, middleware integration, custom validation rules, error formatting, and leveraging Zod's type inference for full-stack type safety.

---

## When to Load

- User is writing, reviewing, or refactoring API route handlers that process user input.
- User mentions: `validation`, `Zod`, `z.`, `schema`, `parse`, `safeParse`, `validate`, `sanitize`, `input validation`, `request validation`.
- User is defining validation schemas for request bodies, query parameters, or URL parameters.
- User is implementing validation middleware for Express routes.
- User asks about securing endpoints against invalid or malicious input.

---

## When NOT to Load

- Pure frontend validation without backend implications (see `react` and `data-fetching` skills).
- Database-level validation or constraints (see `database-schema-design` and `prisma` skills).
- Authentication and authorization logic (see `authentication` skill).
- General API design without implementation details (see `api-design` skill).

---

## Core Principles

1. **Validate Early** – Validate all input at the edge of your application before it reaches business logic. Route handlers should receive validated, typed data.
2. **Never Trust User Input** – All external input (body, query, params, headers) must be validated. Even if a field is optional, validate its type and format if present.
3. **Validate the Shape, Not Just Existence** – Validate types, formats, lengths, ranges, and business rules. Zod's rich schema API supports nearly all validation needs.
4. **Reject Invalid Input Fast** – Return 400 Bad Request immediately when validation fails. Do not proceed to business logic.
5. **Use Type Inference** – Leverage Zod's type inference (`z.infer<typeof schema>`) to derive TypeScript types from schemas. This ensures your validation logic and TypeScript types are always in sync.
6. **Keep Validation Separate** – Define schemas in dedicated files or modules. Reuse them across routes and services.

---

## Decision Rules

### Where to Validate

- **IF** validating request body, **THEN** define a schema and use it in the route handler's body validation middleware.
- **IF** validating query parameters, **THEN** define a schema with `z.object({ ... })` and validate `req.query`.
- **IF** validating URL parameters (e.g., `/:id`), **THEN** define a schema and validate `req.params`.
- **IF** validating headers (e.g., `Authorization`, `Content-Type`), **THEN** define a schema and validate `req.headers`.
- **ALWAYS** validate each source separately (body, query, params, headers) and combine them into a single validated request object.

### Schema Design

- **IF** a field is required, **THEN** use `z.string()`, `z.number()`, etc., without `.optional()`.
- **IF** a field is optional, **THEN** use `.optional()` or `.nullable()` as appropriate.
- **IF** a field can be `null` or `undefined`, **THEN** use `.nullable()` for `null` and `.optional()` for `undefined`.
- **IF** validating a string, **THEN** use `.min()`, `.max()`, `.email()`, `.url()`, `.regex()`, `.uuid()` as needed.
- **IF** validating a number, **THEN** use `.min()`, `.max()`, `.int()`, `.positive()`, `.nonnegative()`, `.finite()`.
- **IF** validating an array, **THEN** use `z.array(z.string())` or `z.array(someSchema)` and optionally `.min()`, `.max()`.
- **IF** validating an enum, **THEN** use `z.enum(['value1', 'value2'])` or `z.nativeEnum(MyEnum)` for TypeScript enums.
- **IF** validating dates, **THEN** use `z.date()` or `z.string().datetime()` for ISO strings. Validate `createdAt` or `updatedAt` formats.

### Custom Validation

- **IF** a built-in validator doesn't cover your rule, **THEN** use `.refine()` or `.superRefine()` to implement custom logic.
- **IF** validation logic is reused across schemas, **THEN** extract it into a custom Zod utility function.

### Error Handling

- **IF** validation fails, **THEN** return `400 Bad Request` with a structured error response listing all validation issues.
- **IF** using `.parse()`, **THEN** Zod throws a `ZodError` containing all validation issues.
- **IF** using `.safeParse()`, **THEN** check the `success` flag and handle errors gracefully.
- **ALWAYS** format errors into a consistent structure:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid request data",
      "details": {
        "email": ["Required", "Must be a valid email"],
        "age": ["Must be at least 18"]
      }
    }
  }
  ```

### Middleware Integration

- **IF** building an Express API, **THEN** implement validation middleware that:
  1. Takes a schema as a parameter (body, query, or params).
  2. Parses the input against the schema.
  3. Passes the validated data to `req.validated` (or `req.body`, `req.query`) and calls `next()`.
  4. If validation fails, passes the error to the error handler.

---

## Best Practices

1. **Define all schemas in a `schemas/` directory** – Keep them organized by domain and source (e.g., `schemas/user.schema.ts`, `schemas/product.schema.ts`).
2. **Export inferred types** – Always export the TypeScript type alongside the schema:
   ```ts
   import { z } from "zod";
   export const CreateUserSchema = z.object({
     email: z.string().email(),
     name: z.string().min(1),
   });
   export type CreateUserInput = z.infer<typeof CreateUserSchema>;
   ```
3. **Use `.strict()` for exact shape validation** – Reject unknown fields unless explicitly allowed.
4. **Use `.transform()` for sanitization** – Trim strings, normalize case, or convert types during validation:
   ```ts
   z.string().transform((val) => val.trim());
   ```
5. **Validate all sources separately** – Body, query, params, and headers each need their own schema. They should be validated independently.
6. **Use `safeParse` when you need to return custom error responses** – It doesn't throw, giving you more control over error handling.
7. **Implement a global validation error handler** – Convert Zod errors to structured HTTP responses in your error handling middleware.
8. **Use the same schemas on the frontend** – Share validation logic across the stack by using the same Zod schemas in your React application (via a shared package or copy).
9. **Validate object IDs** – For MongoDB/ObjectID or Prisma's UUIDs, use `z.string().uuid()` or `z.string().regex(/^[0-9a-f]{24}$/)`.
10. **Validate email domains** – Use custom refinement to restrict to specific domains if needed.

---

## Anti-Patterns

| Anti-Pattern                                   | Why it is wrong                                            | Correct approach                                                               |
| ---------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Validating only in the database                | Invalid data reaches business logic; poor user experience. | Validate at the API edge.                                                      |
| Relying solely on client-side validation       | Security risk; client validation can be bypassed.          | Always validate server-side.                                                   |
| Not validating `req.query` or `req.params`     | Query/params can be manipulated just like the body.        | Validate all input sources.                                                    |
| Using `.strict()` without understanding impact | Rejects valid fields unexpectedly; breaks API contracts.   | Use `.strict()` only when necessary; use `.passthrough()` for partial updates. |
| Hardcoding validation rules in route handlers  | Duplicates logic and makes testing harder.                 | Extract schemas to dedicated files.                                            |
| Returning raw Zod errors to clients            | Exposes internal details; poor UX.                         | Format errors into a consistent structure.                                     |
| Not using Zod's type inference                 | Duplicates TypeScript interfaces; risk of drift.           | Always export `z.infer<typeof schema>`.                                        |
| Validating data that's already validated       | Wastes performance; complicates logic.                     | Validate once at the edge.                                                     |

---

## Common Mistakes & Edge Cases

| Mistake                                          | Symptom                                                          | Solution                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| Forgetting to validate `req.query`               | Query parameters are trusted implicitly; injection risk.         | Always validate all input sources.                             |
| Using `.optional()` when `.nullable()` is needed | Null values fail validation incorrectly.                         | Use `.nullable()` for null; `.optional()` for undefined.       |
| Not handling Zod errors in the error handler     | Validation errors are not formatted; clients receive raw errors. | Implement a `ZodError` handler.                                |
| Using `.parse()` in middleware                   | Throws errors that may crash the app if not caught.              | Use `.safeParse()` or wrap `.parse()` in try/catch.            |
| Not validating pagination parameters             | Malformed `page` or `limit` values cause errors.                 | Validate pagination with `z.coerce.number().int().positive()`. |
| Not validating date formats                      | Inconsistent date parsing causes bugs.                           | Use `z.string().datetime()` or `z.date()` consistently.        |
| Ignoring unknown fields in requests              | Silent acceptance of extra fields can cause bugs.                | Use `.strict()` or `.strip()` as needed.                       |
| Not handling `null` for optional fields          | `null` passes validation incorrectly.                            | Use `.nullable()` for fields that can be `null`.               |

---

## Related Skills

- `express` – for implementing validation middleware and route handlers.
- `typescript` – for leveraging Zod's type inference with strongly typed validators.
- `api-design` – for defining validation rules as part of API contracts.
- `error-handling` – for integrating validation errors with the error handling middleware.
- `authentication` – for validating authentication credentials.
- `testing` – for writing tests for validation logic.

---

## Official References

- [Zod Official Documentation](https://zod.dev/)
- [Zod on GitHub](https://github.com/colinhacks/zod)
- [Zod API Reference](https://zod.dev/api)
- [Express Input Validation Best Practices](https://expressjs.com/en/advanced/best-practice-security.html#input-validation)
- [OWASP Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
