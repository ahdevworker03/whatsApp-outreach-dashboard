---
name: api-design
description: RESTful API design with OpenAPI specification, endpoint naming conventions, HTTP method selection, status code usage, request/response structure, versioning strategies, pagination, filtering, sorting, and API documentation-first workflow. Applicable when designing new API endpoints, reviewing API contracts, writing OpenAPI specifications, or making architectural decisions about API structure.
---

# API Design

## Purpose

This skill guides the agent in designing robust, consistent, and developer-friendly RESTful APIs following industry best practices and official specifications. It covers endpoint naming, HTTP method selection, status code usage, request/response structure, versioning, pagination, filtering, sorting, and the documentation-first workflow using OpenAPI. The goal is to create APIs that are intuitive, self-documenting, and maintainable over the long term.

---

## When to Load

- User is designing, reviewing, or refactoring API endpoints or routes.
- User mentions: `REST`, `API`, `endpoint`, `route`, `OpenAPI`, `Swagger`, `HTTP method`, `status code`, `pagination`, `filtering`, `sorting`, `versioning`.
- User asks about API architecture, request/response structure, or API contract design.
- User is writing OpenAPI specifications or API documentation.
- User is planning new backend features that expose data to clients.

---

## When NOT to Load

- Purely frontend components that consume APIs (see `data-fetching` skill).
- Database schema design or migrations (see `database-schema-design` and `migrations` skills).
- Infrastructure or deployment configuration.
- Business logic implementation details (see `express` and `backend-api-development` skills).

---

## Core Principles

1. **Documentation-First** – Design the API contract (OpenAPI specification) before writing implementation code. This ensures clarity, consistency, and client-driven design.
2. **Resource-Oriented** – Model APIs around resources (nouns), not actions (verbs). Use HTTP methods to express operations on resources.
3. **Consistency** – Use consistent naming conventions, status codes, error formats, and response structures across all endpoints.
4. **Statelessness** – Each request contains all information needed to process it. Do not rely on server-side session state.
5. **Semantic HTTP** – Use HTTP methods and status codes according to their intended meanings. Follow the HTTP specification.
6. **Backward Compatibility** – Never break existing clients. Use versioning or additive changes for evolution.

---

## Decision Rules

### Resource Naming

- **ALWAYS** use plural nouns for collection endpoints: `/users`, `/products`, `/orders`.
- **IF** a resource is a sub-resource of another, **THEN** nest it: `/users/{userId}/orders/{orderId}`.
- **IF** a resource can exist independently, **THEN** use top-level resources: `/users` not `/organizations/{orgId}/users`.
- **IF** an operation is not a standard CRUD operation, **THEN** use a verb in the endpoint: `/users/{userId}/activate` or `POST /users/{userId}/reset-password`.
- **DO NOT** use verbs in resource names: `/getUser` is incorrect; `/users/{id}` is correct.

### HTTP Methods

- **IF** the operation retrieves data without side effects, **THEN** use `GET`.
- **IF** the operation creates a new resource, **THEN** use `POST`.
- **IF** the operation completely replaces an existing resource, **THEN** use `PUT`.
- **IF** the operation partially updates an existing resource, **THEN** use `PATCH`.
- **IF** the operation removes a resource, **THEN** use `DELETE`.
- **IF** the operation retrieves only metadata about a resource, **THEN** use `HEAD`.
- **ALWAYS** ensure `GET`, `HEAD`, `PUT`, `DELETE` are idempotent (multiple identical requests have the same effect).

### HTTP Status Codes

| Code                      | Category     | Use When                                                                   |
| ------------------------- | ------------ | -------------------------------------------------------------------------- |
| 200 OK                    | Success      | Request succeeded with a response body.                                    |
| 201 Created               | Success      | A new resource was created (include `Location` header).                    |
| 204 No Content            | Success      | Request succeeded, no response body (e.g., DELETE).                        |
| 400 Bad Request           | Client Error | Invalid request format, missing required fields, validation failure.       |
| 401 Unauthorized          | Client Error | Authentication required or failed.                                         |
| 403 Forbidden             | Client Error | Authenticated but not authorized to perform the action.                    |
| 404 Not Found             | Client Error | Resource does not exist.                                                   |
| 409 Conflict              | Client Error | Request conflicts with current state (e.g., duplicate resource).           |
| 422 Unprocessable Entity  | Client Error | Valid request syntax but semantic errors (e.g., business logic violation). |
| 429 Too Many Requests     | Client Error | Rate limiting exceeded.                                                    |
| 500 Internal Server Error | Server Error | Unexpected server-side error.                                              |

### Query Parameters for Lists

- **IF** the endpoint returns a list of resources, **THEN** support pagination via `limit` and `offset` or `page` and `pageSize`.
- **IF** the endpoint returns a list of resources, **THEN** support filtering via query parameters: `GET /products?category=electronics`.
- **IF** the endpoint returns a list of resources, **THEN** support sorting via `sort` parameter: `GET /products?sort=price:asc`.
- **IF** the endpoint returns a list, **THEN** include metadata about total count, current page, and next/previous links in the response.
- **ALWAYS** document all query parameters in the OpenAPI specification.

### Request/Response Structure

- **ALWAYS** use consistent response envelope structures:
  - Success: `{ data: T, meta?: { ... } }`
  - Error: `{ error: { code: string, message: string, details?: any } }`
- **IF** the response is a list, **THEN** use: `{ data: T[], meta: { total, page, pageSize } }`.
- **IF** the request has multiple fields, **THEN** use a single JSON object in the request body.
- **IF** the request has file uploads, **THEN** use `multipart/form-data`.
- **ALWAYS** use `camelCase` for JSON field names in request/response bodies.

### Versioning

- **IF** breaking changes are required, **THEN** use URL versioning: `/api/v1/users`, `/api/v2/users`.
- **IF** adding optional fields or non-breaking changes, **THEN** do NOT increment the version – additive changes are safe.
- **IF** deprecating a field, **THEN** mark it as deprecated in the OpenAPI spec and communicate a sunset date.
- **ALWAYS** maintain backward compatibility for at least one major version.

### Error Handling

- **ALWAYS** return a consistent error response structure with:
  - `code`: A machine-readable error code (e.g., `VALIDATION_ERROR`, `RESOURCE_NOT_FOUND`)
  - `message`: A human-readable error message
  - `details` (optional): Additional context (e.g., field-specific validation errors)
- **IF** validation fails, **THEN** return 400 with field-specific errors:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid input",
      "details": {
        "email": "Must be a valid email address",
        "age": "Must be at least 18"
      }
    }
  }
  ```

---

## Best Practices

1. **Design with OpenAPI** – Write the OpenAPI specification first (YAML or JSON). Use it as the single source of truth for the API contract.
2. **Use nouns, not verbs** – Resources are nouns: `/users`, `/orders`. Actions are expressed via HTTP methods.
3. **Keep endpoints small and focused** – Each endpoint should do one thing well. Avoid "god" endpoints that do too much.
4. **Use consistent naming conventions** – Use `camelCase` for JSON fields, `kebab-case` for URL paths.
5. **Provide meaningful error messages** – Help developers understand what went wrong and how to fix it.
6. **Include pagination metadata** – For list endpoints, include `total`, `page`, `pageSize`, `next`, `prev` links.
7. **Use `ETag` for optimistic concurrency** – Include `ETag` headers and support `If-Match` to prevent lost updates.
8. **Limit request sizes** – Enforce reasonable limits on request body size (e.g., 1MB) to prevent abuse.
9. **Rate limit aggressively** – Protect your API from abuse with rate limiting (e.g., 100 requests per minute per user).
10. **Use `CORS` appropriately** – Configure CORS headers to allow trusted origins only.

---

## Anti-Patterns

| Anti-Pattern                                           | Why it is wrong                                                                         | Correct approach                                     |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Using `GET` for state-changing operations              | Violates HTTP semantics; caching proxies may cache state changes.                       | Use `POST`, `PUT`, `PATCH`, `DELETE`.                |
| Using `POST` for idempotent operations                 | Loses idempotency guarantees; clients cannot safely retry.                              | Use `PUT` for updates that are idempotent.           |
| Returning 200 for validation errors                    | Misuses status codes; clients cannot distinguish success from failure programmatically. | Return 400 or 422.                                   |
| Returning HTML for errors                              | Clients cannot parse machine-readable errors.                                           | Return JSON error responses.                         |
| Not versioning the API                                 | Breaking changes break existing clients.                                                | Use URL versioning.                                  |
| Using verbs in resource names (`/getUser`)             | Non-RESTful; violates resource-oriented design.                                         | Use `/users/{id}` with `GET`.                        |
| Putting business logic in API layer                    | Violates separation of concerns; hard to test.                                          | Delegate to services.                                |
| Not documenting the API                                | Clients cannot integrate without reverse-engineering.                                   | Use OpenAPI documentation-first.                     |
| Allowing unauthenticated access to sensitive endpoints | Security risk.                                                                          | Protect all sensitive endpoints with authentication. |
| Returning database IDs directly to clients             | Couples client to internal implementation.                                              | Use UUIDs or other public identifiers.               |

---

## Common Mistakes & Edge Cases

| Mistake                                             | Symptom                                                                                 | Solution                                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Forgetting `Location` header for 201 Created        | Clients cannot retrieve the created resource.                                           | Include `Location: /users/{id}` in 201 responses.                                |
| Using 401 instead of 403 for unauthorized access    | Ambiguity: 401 means "not authenticated"; 403 means "authenticated but not authorized". | Use 401 for missing/invalid credentials; 403 for insufficient permissions.       |
| Not handling `OPTIONS` requests                     | CORS preflight fails.                                                                   | Express handles this automatically with CORS middleware; ensure it's configured. |
| Returning `null` for missing fields                 | Ambiguous: is the field missing or null?                                                | Use optional fields or omit the key entirely.                                    |
| Using integer IDs in URLs                           | Exposes entity count; easy to enumerate.                                                | Use UUIDs for public identifiers.                                                |
| Not escaping query parameters                       | SQL injection risk in dynamic filters.                                                  | Use parameterized queries or validated query builders.                           |
| Over-fetching data                                  | Returns unnecessary fields, increasing payload size.                                    | Support `fields` parameter for field selection.                                  |
| Not supporting `HEAD` for resource existence checks | Clients must `GET` full resource to check existence.                                    | Implement `HEAD` for all `GET` endpoints.                                        |
| Not using `Accept` header negotiation               | Cannot support multiple content types.                                                  | Support `Accept: application/json` and `application/xml` if needed.              |
| Logging sensitive data in errors                    | Exposes passwords, tokens, or PII.                                                      | Sanitize error logs; never log passwords or tokens.                              |

---

## Related Skills

- `express` – for implementing API routes and middleware.
- `validation` – for request validation and error responses.
- `error-handling` – for consistent error responses and logging.
- `authentication` – for protecting API endpoints.
- `openapi` – for writing and maintaining OpenAPI specifications.
- `backend-api-development` – for combining all these skills in a complete implementation.

---

## Official References

- [OpenAPI Specification 3.1](https://swagger.io/specification/)
- [RESTful API Design – Microsoft Azure](https://docs.microsoft.com/en-us/azure/architecture/best-practices/api-design)
- [HTTP Status Codes – RFC 9110](https://httpwg.org/specs/rfc9110.html#status.codes)
- [JSON:API Specification](https://jsonapi.org/) (Community standard for API structure)
- [REST API Tutorial](https://restfulapi.net/) (Community resource)
- [Express API Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Semantic Versioning for APIs](https://semver.org/)
