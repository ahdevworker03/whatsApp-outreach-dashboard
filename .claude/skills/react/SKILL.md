---
name: react
description: React component work in `apps/web`, including pages, layouts, hooks, and UI composition for the vehicle-rental frontend. Applicable when writing .tsx/.jsx files, designing UI components, managing local/global state, handling side-effects, or optimizing re-renders.
---

# React

## Purpose

This skill guides the agent in writing idiomatic, performant, and maintainable React code by applying the official React Rules and best practices. It focuses on decision‑making for state, side‑effects, memoisation, and component structure in a production‑quality TypeScript codebase.

---

## When to Load

- User is writing, reviewing, or refactoring any `.tsx` or `.jsx` file.
- User mentions: `component`, `hook`, `useState`, `useEffect`, `useMemo`, `useCallback`, `useReducer`, `memo`, `props`, `state`, `render`, `JSX`, `re-render`.
- User asks about UI layout, component decomposition, state sharing, or performance optimization.
- User is planning a new feature that includes a visual interface.

---

## When NOT to Load

- Pure backend logic (Express routes, database queries, Prisma schemas).
- Infrastructure scripts (Docker, CI/CD, monorepo tooling).
- SQL or database migration planning (unless UI‑adjacent).
- General TypeScript utility functions that do not involve React or JSX.

---

## Core Principles

1. **Declarative UI** – Define what the UI should look like for each state, not how to transition between them.
2. **Component Composition** – Build UIs from small, reusable, single‑purpose components. Prefer composition over configuration.
3. **Unidirectional Data Flow** – State flows down via props; events flow up via callbacks. Never mutate state directly.
4. **Hooks for Logic** – Encapsulate stateful logic in custom hooks. Follow the Rules of Hooks without exception.
5. **Purity & Predictability** – Components should be pure functions of props and state. Same inputs ⇒ same output.

---

## Decision Rules

### State Management

- **IF** a value is local to one component and is a primitive or simple object, **THEN** use `useState`.
- **IF** state logic involves multiple sub‑values, transitions, or complex dependencies, **THEN** prefer `useReducer` over multiple `useState` calls.
- **IF** state needs to be shared across many components in a subtree, **THEN** lift state up to the closest common ancestor and pass it down via props.
- **IF** prop‑drilling becomes excessive, **THEN** use React Context for coarse‑grained (e.g., theme, user) but **NOT** for fine‑grained frequent updates (optimise with `useMemo` or external state).
- **ELSE** (for complex global state), delegate to `state-management` skill (Zustand/Redux) – **do not** rely on Context alone for high‑frequency writes.

### Side‑Effects (`useEffect`)

- **IF** the action is a direct user interaction (click, submit, change), **THEN** handle it in an event handler – **do NOT** use `useEffect`.
- **IF** the action synchronises with an external system (fetch, DOM manipulation, timers, subscriptions), **THEN** use `useEffect`.
- **IF** a value can be derived from existing state or props, **THEN** compute it during rendering – **do NOT** store it in state and sync it with an effect.
- **ALWAYS** return a cleanup function for subscriptions, event listeners, or asynchronous operations that may outlive the component.

### Memoisation & Performance

- **IF** a computation is expensive (> ~1ms) and has stable inputs, **THEN** wrap it in `useMemo`.
- **IF** a function is passed as a prop to a child component that is wrapped in `memo`, **THEN** wrap that function in `useCallback` to preserve referential equality.
- **IF** a component receives the same props frequently and renders identically, **THEN** consider wrapping it in `memo`.
- **DO NOT** over‑memoise – use these only when you have observed a performance issue or when the dependency is in a hot path.
- **ALWAYS** verify that `useMemo`/`useCallback` dependencies are complete and correctly listed; missing deps cause stale closures.

### Component Design

- **IF** a component's logic is reusable across multiple files, **THEN** extract it into a custom hook (`useX`) or a component.
- **IF** you need to avoid prop‑drilling, **THEN** use composition (passing `children`, `render props`, or slots) rather than a global state unless the data is truly global.
- **NEVER** define a component inside another component – it will unmount/remount on every parent render and lose local state.

---

## Best Practices

1. **Functional updates for state** – Always use the updater function form when the new state depends on the previous state:
   ```ts
   setCount((prev) => prev + 1);
   ```
2. **Exhaustive dependencies** – Always include all values from the component scope that are used inside `useEffect`/`useMemo`/`useCallback` in the dependency array.
3. **Stable keys for lists** – Use a stable, unique identifier (e.g., `id` from the data) as the `key` prop. Never use array `index` unless the list is static and never reorders.
4. **Destructure props early** – Destructure props at the function signature level for clarity and to avoid repeated `props.` access.
5. **Default props via destructuring** – Use default values in destructuring for required‑with‑fallback props:
   ```ts
   const Button = ({ size = 'md', ...rest }: ButtonProps) => ...
   ```
6. **Clean up side‑effects** – Every `setInterval`, `addEventListener`, or external subscription must be cleaned up in the `useEffect` return function.
7. **Custom hook naming** – Prefix custom hooks with `use`. Keep them focused on one piece of logic.

---

## Anti‑Patterns

| Anti‑Pattern                                              | Why it is wrong (official)                                                         | Correct approach                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Mutating state directly (`state.count = 5`)               | Breaks reactivity and batching; React cannot detect changes.                       | Use setter functions (`setState(prev => ...)`) or `dispatch`.             |
| Calling hooks conditionally or inside loops               | Violates the Rules of Hooks; order of hooks must be stable across renders.         | Always call hooks at the top level of the component or custom hook.       |
| Using `index` as key in lists                             | Causes incorrect component identity, leading to buggy UI and performance issues.   | Use a stable unique identifier from the data.                             |
| Creating components inside render                         | React treats them as new components, causing full unmount/remount on every render. | Define components at the top level of the file.                           |
| Spreading all props indiscriminately (`<div {...props}>`) | Can silently pass unintended attributes; reduces type safety.                      | Explicitly pass down only the props needed.                               |
| Using `useEffect` for calculations that could be derived  | Causes extra renders and complexity.                                               | Derive the value during render (`const computed = ...`) or use `useMemo`. |

---

## Common Mistakes & Edge Cases

| Mistake                                                  | Symptom                                                                      | Solution (official)                                                                                         |
| -------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Missing dependencies in `useEffect`                      | Stale closures – effect uses outdated props/state.                           | Enable `eslint-plugin-react-hooks/exhaustive-deps` and follow its fixes.                                    |
| Infinite loops in `useEffect`                            | Updating state inside effect without deps or with incorrectly changing deps. | Ensure the dependency array includes only values that change infrequently; move updaters to event handlers. |
| Forgetting cleanup                                       | Memory leaks, duplicate subscriptions, old timeouts firing.                  | Always return a cleanup function that removes the subscription/listener.                                    |
| Passing a new object literal as a prop to a `memo` child | Child re‑renders because reference changes every parent render.              | Use `useMemo` for objects and `useCallback` for functions passed to `memo` children.                        |
| `useState` setter called after component unmounts        | React warning about memory leak.                                             | Use an abort controller or a mounted flag (but prefer cancelling the async operation itself).               |
| Using Context for high‑frequency updates                 | Unnecessary re‑renders of all consumers.                                     | Split Context by domain (e.g., `ThemeContext`, `UserContext`) or use `useMemo` + `memo` on consumers.       |

---

## Related Skills

- `typescript` – for strong typing of props, hooks, and state.
- `frontend-ui-engineering` – for UI styling with Tailwind/shadcn.
- `state-management` – for global state (Zustand/Redux) decisions beyond local Context.
- `data-fetching` – for integrating with TanStack Query / SWR and managing server‑state.

---

## Official References

- [React Docs – Learn](https://react.dev/learn)
- [React Docs – Reference](https://react.dev/reference/react)
- [Rules of React](https://react.dev/reference/rules)
- [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [Rules of JSX](https://react.dev/reference/rules/rules-of-jsx)
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [React Performance Optimizations](https://react.dev/learn/render-and-commit)
- [ESLint Plugin React Hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks)
