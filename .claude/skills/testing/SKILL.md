---
name: testing
description: Testing for this repository’s stack, including Vitest in `apps/api` and `apps/web`, React Testing Library, Supertest, Playwright, and test-database workflows. Applicable when writing tests, designing testable code, implementing test suites, or ensuring code quality through automated testing.
---

# Testing

## Purpose

This skill guides the agent in writing comprehensive, maintainable tests across the full stack following official testing best practices. Testing is the foundation of code quality, providing confidence in changes, catching regressions, and enabling fast iteration. The skill covers unit testing, integration testing, end-to-end testing, mocking strategies, test coverage, and test-driven development (TDD). The goal is to create a robust test suite that ensures correctness, prevents regressions, and enables safe refactoring.

---

## When to Load

- User is writing new tests or updating existing tests.
- User mentions: `test`, `testing`, `Jest`, `Vitest`, `React Testing Library`, `Supertest`, `Playwright`, `coverage`, `TDD`, `mock`, `snapshot`, `integration`, `e2e`.
- User asks about testing strategies, mocking, test coverage, or test-driven development.
- User is setting up test infrastructure, configuring test runners, or writing test utilities.
- User is debugging failing tests or improving test reliability.

---

## When NOT to Load

- Writing application code without tests.
- General architecture design without implementation.
- Infrastructure or deployment configuration (unless testing-related).
- Code review without testing context (see `code-review` skill).

---

## Core Principles

1. **Test the Behavior, Not the Implementation** – Tests should verify what the code does, not how it does it. Implementation details can change; behavior should remain stable.
2. **Write Tests That Fail Before They Pass** – In TDD, write a failing test first, then write the minimum code to make it pass. This ensures tests actually test something.
3. **Keep Tests Fast** – Slow tests discourage running them frequently. Unit tests should run in milliseconds; integration tests in seconds.
4. **Keep Tests Isolated** – Tests should not depend on each other. Each test should be able to run independently in any order.
5. **Use Realistic Data** – Test data should resemble production data while being deterministic and controlled.
6. **Cover the Critical Path** – Test the most important user journeys and edge cases; not every possible combination.
7. **Maintain Test Quality** – Tests are code and should be clean, readable, and maintainable. Bad tests are worse than no tests.
8. **Run Tests in CI** – Always run tests in CI/CD to catch issues before deployment.

---

## Decision Rules

### What to Test and Why

- **IF** testing a pure utility function, **THEN** use unit tests covering edge cases and error conditions.
- **IF** testing a React component, **THEN** use React Testing Library to test behavior from the user's perspective (what they see and interact with).
- **IF** testing an Express route, **THEN** use Supertest for integration tests that exercise the API with real HTTP requests.
- **IF** testing a database query, **THEN** use Prisma's testing capabilities or a test database with controlled data.
- **IF** testing a complete user flow, **THEN** use end-to-end tests with Playwright or Cypress.
- **IF** testing a backend service, **THEN** use unit tests with mocked dependencies (database, external APIs, services).

### Test Types and Boundaries

- **Unit Tests** – Test individual functions, components, or modules in isolation. Mock all external dependencies (other modules, database, API calls, third-party services). Fast and numerous.
- **Integration Tests** – Test how multiple units work together. For Express, test entire routes with a real database and mocked external services. Use a test database to avoid touching production.
- **End-to-End Tests** – Test the entire application from the user's perspective (UI interactions, API responses). Tests the full stack including frontend, backend, and database. Slower but provides high confidence.

### Mocking Strategy

- **IF** a function depends on an external API, **THEN** mock the API call to return controlled responses (both success and error cases).
- **IF** a component depends on hooks or context, **THEN** test with real hooks/context where possible; mock only when necessary (e.g., for third-party services).
- **IF** a service depends on a database, **THEN** use a test database or in-memory database for integration tests.
- **IF** a test depends on system time, **THEN** mock `Date.now()` or `new Date()` to ensure deterministic tests.
- **DO NOT** mock the code being tested – only its dependencies.

### Test Coverage Targets

- **ALWAYS** aim for high coverage of critical business logic (error handling, security, core functionality).
- **ALWAYS** aim for 80%+ coverage on utility functions, services, and business logic.
- **CONSIDER** aiming for 70%+ coverage on UI components.
- **DO NOT** require 100% coverage; it often leads to poor tests that only exist to increase coverage.
- **USE** coverage reports (via `jest --coverage`) to identify untested areas of the codebase.

### Test-Driven Development (TDD)

- **IF** implementing a new feature, **THEN** write the test first (TDD) to ensure the test is actually testing something.
- **IF** fixing a bug, **THEN** write a test that reproduces the bug first, then fix the code.
- **IF** refactoring code, **THEN** ensure existing tests pass before and after; add new tests if necessary.

---

## Best Practices

### Unit Testing (Jest/Vitest)

1. **Use `describe` to organize tests** – Group related tests by functionality.
   ```ts
   describe('calculateTotal', () => {
     it('calculates total with tax correctly', () => { ... });
     it('handles zero quantity', () => { ... });
   });
   ```
2. **Use `beforeEach` and `afterEach` for setup** – Reset mocks and state before each test to ensure isolation.
3. **Test both happy paths and error paths** – Test success cases, edge cases, and error handling.
4. **Use `expect` matchers wisely** – Use appropriate matchers (`.toBe()`, `.toEqual()`, `.toContain()`, `.toThrow()`) for clear assertions.
5. **Use `it` over `test`** – `it` reads better when describing behavior (`it('should...')`).
6. **Write descriptive test names** – Test names should describe the behavior being tested.

### React Component Testing (React Testing Library)

1. **Test user interactions** – Use `userEvent` to simulate clicks, type input, and keyboard events.
2. **Use `screen` for queries** – Query by role, text, label, placeholder, or test ID.
   ```ts
   const button = screen.getByRole("button", { name: "Submit" });
   ```
3. **Test accessibility** – Query by role (button, heading, textbox) to ensure components are accessible.
4. **Use `jest.mock` for API calls** – Mock fetch/axios calls to avoid network requests.
5. **Use `act` for async updates** – Wrap state updates in `act()` to ensure they are processed before assertions.
6. **Test form submissions** – Simulate user input and form submission; verify the expected output.
7. **Test error states** – Verify that error messages are displayed and error handling works.

### API Testing (Supertest)

1. **Use a test database** – Use a separate database for tests to avoid interfering with development data.
2. **Reset database state** – Use `beforeEach` and `afterEach` to reset the test database state (e.g., using Prisma's `$transaction` or truncation).
3. **Test all HTTP methods** – `GET`, `POST`, `PUT`, `PATCH`, `DELETE` – test each endpoint's behavior.
4. **Test status codes** – Verify correct HTTP status codes for success, error, and edge cases.
5. **Test response structure** – Verify that the response format matches the expected structure (e.g., `{ data: ... }` or `{ error: ... }`).
6. **Test authentication** – Test both authenticated and unauthenticated requests to verify proper access control.

### End-to-End Testing (Playwright)

1. **Test critical user flows** – Login, signup, checkout, dashboard, etc.
2. **Use `test.describe` for organization** – Group related tests into test suites.
3. **Use `test.beforeEach` for setup** – Set up authentication, navigate to the target page, etc.
4. **Wait for DOM updates** – Use `page.waitForSelector()` or `expect(page).toHaveText()` for reliable assertions.
5. **Use `screenshot` for debugging** – Capture screenshots on test failure for easier debugging.
6. **Keep E2E tests minimal** – Focus on key user journeys; do not test every edge case with E2E tests.

### Mocking

1. **Mock at the boundary** – Mock the interface, not the implementation.
2. **Use `jest.spyOn` for partial mocking** – Spy on methods and mock only what you need.
3. **Use `jest.fn().mockResolvedValue()` for async mocks** – Control async return values.
4. **Reset mocks between tests** – Use `jest.resetAllMocks()` or `jest.clearAllMocks()` to avoid state leakage.

---

## Anti-Patterns

| Anti-Pattern                           | Why it is wrong                                           | Correct approach                                     |
| -------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| Testing implementation details         | Tests break when code is refactored; brittle tests.       | Test behavior, not implementation.                   |
| Using `screen.getByTestId` excessively | Not aligned with user experience; breaks when UI changes. | Prefer role, text, and label queries.                |
| Not mocking dependencies               | Tests hit external services, slow and unreliable.         | Mock external APIs and services.                     |
| Tests depending on order               | Fails when run in isolation or in random order.           | Keep tests isolated; use `beforeEach` for setup.     |
| Low test coverage                      | Bugs slip through; confidence is low.                     | Aim for high coverage on critical code.              |
| Over-testing simple code               | Tests simple getters and setters; low value.              | Test behavior, not trivial code.                     |
| Not testing error handling             | Errors are hidden; production breaks silently.            | Test both success and error paths.                   |
| Writing tests after the fact           | Harder to write; more likely to be incomplete.            | Write tests first (TDD) or alongside development.    |
| Using snapshots excessively            | Snapshots are easy to update blindly; mask real changes.  | Use snapshots sparingly; prefer explicit assertions. |
| Ignoring failing tests                 | Technical debt accumulates; bugs are missed.              | Fix failing tests immediately or disable them.       |

---

## Common Mistakes & Edge Cases

| Mistake                              | Symptom                                                    | Solution                                         |
| ------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------ |
| Not isolating tests                  | Tests interfere with each other; order-dependent failures. | Use `beforeEach` and `afterEach` to reset state. |
| Forgetting `await` in async tests    | Tests pass incorrectly or time out.                        | Always `await` promises in async tests.          |
| Using `data-testid` for everything   | Tests are brittle; hard to maintain.                       | Use role-based or text-based queries.            |
| Not handling `act` warnings          | React warnings about state updates outside `act`.          | Wrap state updates in `act` or use `waitFor`.    |
| Testing routing with real navigation | Slow and fragile.                                          | Use `MemoryRouter` for React component tests.    |
| Not cleaning up after tests          | Database state leaks; tests fail unpredictably.            | Reset database state between tests.              |
| Testing with inconsistent data       | Tests pass locally but fail in CI.                         | Use deterministic test data.                     |
| Not mocking `Date.now()`             | Time-dependent tests fail at different times.              | Mock `Date.now()` for deterministic tests.       |
| Using snapshots for dynamic data     | Snapshots fail on every run.                               | Use explicit assertions or mock dynamic data.    |

---

## Related Skills

- `react` – for testing React components with React Testing Library.
- `express` – for testing Express APIs with Supertest.
- `prisma` – for testing with a test database and Prisma's testing utilities.
- `typescript` – for typed test utilities and writing type-safe tests.
- `code-review` – for reviewing test coverage and quality.
- `debugging` – for debugging failing tests.
- `refactoring` – for refactoring code with confidence when tests are in place.
- `ci-cd` – for integrating tests into the CI/CD pipeline.

---

## Official References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/guide/)
- [React Testing Library Documentation](https://testing-library.com/react)
- [Testing Library Query Priorities](https://testing-library.com/docs/queries/about/#priority)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Prisma Testing Guide](https://www.prisma.io/docs/orm/prisma-client/testing)
- [Jest Matchers](https://jestjs.io/docs/expect)
- [Jest Mock Functions](https://jestjs.io/docs/mock-functions)
- [React Test Utilities](https://react.dev/reference/react-dom/test-utils)
- [MDN - Testing](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Unit_testing)
- [OWASP Testing Guide](https://owasp.org/www-project-testing-guide/)
