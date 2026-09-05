---
name: typescript
description: TypeScript in this repo, especially strict types across `apps/web`, `apps/api`, and shared generated packages. Applicable when writing .ts/.tsx files, defining types/interfaces, configuring TypeScript compiler options, or refactoring JavaScript to TypeScript.
---

# TypeScript

## Purpose

This skill guides the agent in leveraging TypeScript's type system to enforce correctness, improve maintainability, and catch bugs at compile time. It prioritizes strictness, type inference, and explicit boundaries, following the official TypeScript coding guidelines and compiler design goals.

---

## When to Load

- User is writing, reviewing, or refactoring any `.ts` or `.tsx` file.
- User mentions: `type`, `interface`, `generic`, `infer`, `utility type`, `satisfies`, `asserts`, `unknown`, `never`, `union`, `intersection`, `mapped type`, `conditional type`.
- User asks about type safety, strictness, or compiler configuration (`tsconfig`).
- User is converting JavaScript code to TypeScript.
- User is designing public API surfaces or data models.

---

## When NOT to Load

- Purely runtime logic that does not involve types (e.g., simple console scripts without complex types).
- Configuration files that are not TypeScript (e.g., `.json`, `.yaml`).
- SQL or database schema design (unless directly mapped to TypeScript types).
- Infrastructure or deployment scripts that do not use TypeScript.

---

## Core Principles

1. **Strict by Default** – Always enable `strict: true`. Use `unknown` over `any`. Never silence type errors with `@ts-ignore`.
2. **Type Inference over Explicit Annotations** – Let TypeScript infer types where possible; only annotate when inference fails or when the type is part of a public API boundary.
3. **Precise Over General** – Prefer unions, discriminated unions, and literal types over `string`, `number`, or `boolean` when the set of possible values is known.
4. **Immutable by Convention** – Use `readonly` properties, `ReadonlyArray`, and `as const` to enforce immutability.
5. **Shape Over Inheritance** – Favor structural typing (interfaces/types) over classical inheritance. TypeScript's type system is structural.

---

## Decision Rules

### Interface vs. Type Alias

- **IF** defining an object shape that will be extended or augmented (declaration merging), **THEN** use `interface`.
- **IF** defining a union, intersection, tuple, mapped type, conditional type, or any complex type, **THEN** use `type`.
- **IF** the shape is part of a public API and intended to be extended by consumers, **THEN** prefer `interface` for better error messages and performance.
- **OTHERWISE**, `type` is acceptable; consistency within a file is more important.

### Type Annotations vs. Inference

- **IF** the variable declaration initializes with a clear value, **THEN** omit the type annotation (let TypeScript infer).
- **IF** the declaration is a function exported from a module (public API), **THEN** explicitly annotate parameter and return types to define the contract.
- **IF** the declaration is a private/internal function, **THEN** let return types be inferred to avoid unnecessary verbosity.
- **IF** the inference produces `any` unexpectedly, **THEN** fix the source of the problem (e.g., add a type guard or refine the input), **DO NOT** just annotate to silence it.

### Handling Unknown Types

- **IF** a value comes from a truly dynamic source (API response, user input, `JSON.parse`), **THEN** type it as `unknown`, **NOT** `any`.
- **IF** you need to operate on an `unknown` value, **THEN** narrow it using type guards (`typeof`, `instanceof`, custom predicates) before using it.
- **IF** you are certain about a value's type but TypeScript cannot infer it, **THEN** use `as` type assertion _only_ after validating it at runtime (prefer `satisfies` if applicable).
- **NEVER** use `any` – it disables all type checking and defeats the purpose of TypeScript.

### Generics

- **IF** a function, class, or interface needs to work with a variety of types while preserving the relationship between them, **THEN** use generics.
- **IF** a generic parameter is used only once and has no constraint, **THEN** prefer `unknown` or a specific union over a generic (over‑generalization is an anti‑pattern).
- **IF** a generic needs to access specific properties, **THEN** constrain it with an `extends` clause.
- **ALWAYS** name generic parameters with single letters for simple cases (`T`, `K`, `V`) or full descriptive names for complex cases (`TData`, `TError`).

### Null and Undefined

- **IF** a value can legitimately be absent, **THEN** model it as `T | null` or `T | undefined`, **NOT** as `T` with `!` non‑null assertions.
- **IF** you are checking for existence, **THEN** use a `null`/`undefined` check (`if (value != null)`) rather than `!` or `as`.
- **ALWAYS** enable `strictNullChecks` to catch accidental null/undefined errors.

---

## Best Practices

1. **Use `readonly` for immutability** – Mark array, tuple, and object properties as `readonly` where they are not meant to be mutated.
   ```ts
   const arr: readonly number[] = [1, 2, 3];
   ```
2. **Leverage discriminated unions** – For state machines or variant objects, use a common `type` field with literal values to create a discriminated union, enabling exhaustive checks with `switch`.
   ```ts
   type Result<T> = { kind: "ok"; value: T } | { kind: "error"; error: string };
   ```
3. **Prefer `satisfies` over type annotations** – Use `satisfies` to ensure an expression matches a type while preserving its most specific inferred type.
   ```ts
   const config = { theme: "dark", name: "app" } satisfies Config;
   ```
4. **Use utility types** – Prefer `Partial`, `Pick`, `Omit`, `Exclude`, `ReturnType`, `Parameters` from the standard library over manually writing mapped types.
5. **Enable `noUncheckedIndexedAccess`** – This forces you to handle potential `undefined` when indexing into objects and arrays, reducing runtime errors.
6. **Use `import type`** – For clear separation, use `import type { SomeType }` when importing only types to avoid runtime imports.
7. **Use `as const` for literal values** – To get the most precise type for constants:
   ```ts
   const colors = ["red", "green", "blue"] as const; // type: readonly ["red", "green", "blue"]
   ```
8. **Document public API types** – Use TSDoc (`/** */`) for exported interfaces, types, and functions to provide context.

---

## Anti‑Patterns

| Anti‑Pattern                         | Why it is wrong (official)                                                            | Correct approach                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Using `any`                          | Disables all type checking; defeats the safety guarantees.                            | Use `unknown` and narrow with type guards.                                   |
| Using `!` non‑null assertion         | Silences compiler errors and can cause runtime crashes if the value is actually null. | Use proper null checks or optional chaining (`?.`).                          |
| Using `as` cast for type coercion    | Subverts the type system; may lead to runtime mismatches.                             | Use type guards or refine the input.                                         |
| Over‑using explicit type annotations | Adds noise, reduces readability, and may hide inference bugs.                         | Let inference work; annotate only when needed (e.g., public API).            |
| Using `Function` as a type           | Disables type checking for call signatures.                                           | Use `(...args: unknown[]) => unknown` or a specific call signature.          |
| Using `{}` as a generic constraint   | Does not guarantee anything useful and can allow null/undefined.                      | Use `unknown` or a specific constraint.                                      |
| Using `object` type                  | Too broad; does not distinguish between different shapes.                             | Use `Record<string, unknown>` or a specific interface.                       |
| Mutating imported types              | `extends` can accidentally widen or mutate types unintentionally.                     | Use utility types (`Pick`, `Omit`) to create derived types without mutation. |

---

## Common Mistakes & Edge Cases

| Mistake                                                 | Symptom                                                               | Solution (official)                                                                 |
| ------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Forgetting `readonly` on arrays passed to functions     | Array is inadvertently mutated inside the function.                   | Use `ReadonlyArray<T>` or `readonly T[]` for parameters that should not be mutated. |
| Using `type` for a shape that needs declaration merging | Cannot add new properties later; consumers cannot extend it.          | Use `interface` if declaration merging is needed.                                   |
| Missing `exactOptionalPropertyTypes`                    | `foo?: string` allows `undefined` in addition to omission.            | Enable `exactOptionalPropertyTypes` to enforce strict optional handling.            |
| Using `keyof` on an interface with index signatures     | `keyof` includes the index signature and can be too broad.            | Use a mapped type or conditional type to filter.                                    |
| Type guard not handling `null` correctly                | `typeof val === 'object'` includes `null`.                            | Explicitly check `val != null && typeof val === 'object'`.                          |
| Over‑constrained generics                               | Function becomes too restrictive and cannot handle valid inputs.      | Remove unnecessary constraints; use a union if needed.                              |
| `never` appears unexpectedly                            | The type system has detected an impossible state, often due to a bug. | Use it to your advantage in exhaustive switch checks (`assertNever`).               |
| Using `@ts-ignore` instead of `@ts-expect-error`        | Ignores all errors, hides accidental regressions.                     | Use `@ts-expect-error` for expected errors; it will fail if the error disappears.   |

---

## Related Skills

- `react` – for applying TypeScript types to React components (props, state, hooks).
- `backend-api-development` – for typing request/response bodies and Express route handlers.
- `prisma` and `database-schema-design` – for generating TypeScript types from database models.
- `validation` – for using Zod to parse and validate external data into TypeScript types.

---

## Official References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Coding Guidelines](https://github.com/microsoft/TypeScript/wiki/Coding-guidelines)
- [TypeScript Compiler Options (tsconfig)](https://www.typescriptlang.org/tsconfig)
- [TypeScript Performance Wiki](https://github.com/microsoft/TypeScript/wiki/Performance)
- [TypeScript Design Goals](https://github.com/Microsoft/TypeScript/wiki/TypeScript-Design-Goals)
- [typescript-eslint Rules](https://typescript-eslint.io/rules/)
