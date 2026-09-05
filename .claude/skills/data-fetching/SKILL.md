---
name: data-fetching
description: Data fetching in `apps/web`, especially TanStack Query hooks wired to the generated API client and live backend endpoints. Applicable when fetching data from APIs, managing server state, implementing mutations, handling loading and error states, or optimizing data synchronization.
---

# Data Fetching

## Purpose

This skill guides the agent in implementing data fetching in React applications using TanStack Query (React Query) as the recommended server-state management library. It covers when and how to fetch data, manage query and mutation states, handle caching, implement optimistic updates, and synchronize with API endpoints. The skill prioritizes declarative data fetching over imperative patterns and ensures a seamless user experience with background refetching and stale-while-revalidate strategies.

---

## When to Load

- User is writing, reviewing, or refactoring any `.tsx` or `.jsx` file that involves API calls.
- User mentions: `useQuery`, `useMutation`, `useQueryClient`, `queryKey`, `QueryClientProvider`, `fetch`, `axios`, `tanstack`, `react-query`, `data fetching`, `server state`, `cache`, `invalidate`, `optimistic update`.
- User asks about fetching data from APIs, caching responses, handling loading states, or implementing mutations.
- User is designing API client hooks or data synchronization patterns.

---

## When NOT to Load

- Pure UI styling or layout decisions without data fetching implications.
- Backend API design or Express route definitions (see `api-design` skill).
- Database operations or Prisma queries (see `database-development` and `prisma` skills).
- Infrastructure or deployment configuration.
- Offline-first synchronization logic (see `offline-first` architecture skill).

---

## Core Principles

1. **Server State is Not Client State** – Server state is remote, asynchronous, and shared across users. It requires caching, deduplication, background refetching, and invalidation. React Query is the dedicated tool for this layer.
2. **Declarative Data Fetching** – Define what data you need and how it should be fetched, loaded, and cached. Let React Query handle the orchestration—loading, error, and data states are derived automatically.
3. **Stale-While-Revalidate** – Serve cached data immediately while refetching in the background. This keeps the UI responsive while ensuring data freshness.
4. **Mutations as State Transitions** – Mutations should be treated as operations that alter server state. After a mutation, invalidate relevant queries to trigger automatic refetching.
5. **Optimistic Updates** – Improve perceived performance by updating the UI optimistically, then rolling back if the server request fails.

---

## Decision Rules

### When to Fetch Data

- **IF** the component renders and requires data from an API, **THEN** use `useQuery` with a unique `queryKey`.
- **IF** data fetching depends on a condition (e.g., a `userId` is defined), **THEN** use the `enabled` option to conditionally skip the query.
- **IF** you need to fetch data only when the user interacts (button click, form submit), **THEN** use `useMutation` or `useQuery` with `enabled: false` and `refetch`.

### Query Key Design

- **ALWAYS** make query keys deterministic and unique. Use an array with the resource name and all parameters.
- **IF** the query depends on a dynamic variable (e.g., `id`, `filter`), **THEN** include it in the query key array: `['todos', { userId: 5 }]`.
- **IF** the query depends on multiple variables, **THEN** use a structured array: `['todos', { userId, status }]`.

### Caching and Staleness

- **IF** the data is accessed frequently and changes rarely, **THEN** set a longer `staleTime` to reduce network requests.
- **IF** the data is real-time or frequently updated, **THEN** keep `staleTime` short (or `0`) and rely on `refetchInterval` for polling.
- **IF** you want data to be cached even after the component unmounts, **THEN** set `cacheTime` (default is 5 minutes).

### Mutations

- **IF** you need to create, update, or delete data, **THEN** use `useMutation` with `onSuccess` and `onError` callbacks.
- **IF** a mutation succeeds and you need to refresh affected data, **THEN** use `queryClient.invalidateQueries({ queryKey: [...] })` to trigger refetching.
- **IF** you want to optimistically update the UI before the server confirms, **THEN** use the `onMutate` callback to return the previous state for rollback.

### Offline-First Integration

- **IF** the app is offline-first with a local store (e.g., IndexedDB), **THEN** use React Query alongside the `offline-first` skill—React Query manages the API synchronization layer.
- **IF** offline mutations are supported, **THEN** persist the mutation queue and replay it when online.

---

## Best Practices

1. **Set up QueryClient at the root** – Always wrap your app with a `QueryClientProvider` and provide a `QueryClient` instance.
2. **Use `useQuery` for reads, `useMutation` for writes** – This separation of concerns keeps your logic clean and maintainable.
3. **Use `queryKey` as the primary cache key** – Every query must have a unique key for caching and invalidation.
4. **Enable `staleTime` judiciously** – Set `staleTime: 1000 * 60 * 5` (5 minutes) for most read-only data to avoid unnecessary refetches.
5. **Use `refetchOnWindowFocus` to sync** – This ensures user data is fresh when returning to the tab. It is enabled by default and generally recommended.
6. **Handle errors gracefully** – Use `onError` for mutations and the `error` state from `useQuery` to display user-friendly error messages.
7. **Use `suspense` for data loading (with suspense-boundaries)** – If your project uses Suspense, set `suspense: true` to integrate with React Suspense.
8. **Avoid manual `fetch` or `axios` inside components** – Always use `useQuery` or `useMutation` to manage the data lifecycle automatically.
9. **Abstract API calls into service functions** – Keep API logic separate from components. Example: `api.getTodos()`, `api.createTodo(payload)`.
10. **Implement Optimistic Updates for UI responsiveness** – Use `onMutate` to apply the update optimistically and set up rollback in `onError`.

---

## Anti-Patterns

| Anti-Pattern                                            | Why it is wrong                                                                 | Correct approach                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Using `useEffect` to fetch data manually                | Escapes the benefits of React Query (caching, deduping, background refetching). | Use `useQuery`.                                                             |
| Using `useState` for loading/error states               | Adds unnecessary state; React Query provides these values automatically.        | Use `isLoading`, `isError`, `data`, `error` from `useQuery`.                |
| Not using `queryKey` for caching                        | Queries are not cached or deduplicated; same data is fetched multiple times.    | Always provide a unique query key array.                                    |
| Not invalidating queries after mutations                | Data becomes stale and users see outdated information.                          | Use `queryClient.invalidateQueries({ queryKey: [...] })`.                   |
| Using `fetch` directly inside components                | Duplicates fetching logic, bypasses caching and error handling.                 | Abstract `fetch` into service functions and use `useQuery`.                 |
| Ignoring errors from `useMutation`                      | Users are unaware of failures; UI stays in a bad state.                         | Handle `onError` and show feedback.                                         |
| Over-fetching by not using `select` or `initialData`    | Unnecessary network requests and re-renders.                                    | Use `select` to transform data or `initialData` for stale-while-revalidate. |
| Calling `useQuery` conditionally without `enabled`      | Breaks the rules of hooks; cannot conditionally call hooks.                     | Use the `enabled` option to conditionally fetch.                            |
| Not using `queryKey` invalidation with precise matching | Invalidates too many queries, causing over-fetching.                            | Use exact queryKey match or partial match with `queryKey`.                  |

---

## Common Mistakes & Edge Cases

| Mistake                                                    | Symptom                                              | Solution                                                                              |
| ---------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Query key missing parameters                               | Data from different parameters overwrite each other. | Include all dependencies in the queryKey array.                                       |
| `staleTime` too long                                       | Users see stale data for too long.                   | Set appropriate staleTime based on data volatility.                                   |
| `cacheTime` too short                                      | Cached data expires before the component remounts.   | Keep cacheTime at least 5 minutes for most use cases.                                 |
| Not handling `isFetching` vs `isLoading`                   | Confusing initial load with background refetch.      | Use `isLoading` for initial load spinner; use `isFetching` for background indicators. |
| Optimistic update rollback failing                         | UI stuck in an incorrect state.                      | Always return the previous state in `onMutate` and restore it in `onError`.           |
| Mutations that depend on previous data                     | Race conditions with stale closures.                 | Use the `onMutate` callback's context to store previous state.                        |
| Multiple queries with overlapping data                     | Duplicate data in cache, memory overhead.            | Use `useQuery` with a common queryKey for the same endpoint.                          |
| Infinite scroll or pagination not using `useInfiniteQuery` | Manual offset management, duplicate loading states.  | Use `useInfiniteQuery` for paginated data.                                            |

---

## Related Skills

- `react` – for component structure and hooks usage.
- `state-management` – for distinguishing server state from client state.
- `offline-first` – for integrating React Query with offline synchronization.
- `api-design` – for consistent API endpoint structure.
- `authentication` – for handling authenticated API calls with tokens.
- `typescript` – for strongly typing query data, variables, and error types.

---

## Official References

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Queries – Overview](https://tanstack.com/query/latest/docs/framework/react/guides/queries)
- [Query Keys – Structure](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [Mutations – Usage](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
- [Optimistic Updates – Guide](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [Caching – Overview](https://tanstack.com/query/latest/docs/framework/react/guides/caching)
- [React Docs – Data Fetching](https://react.dev/learn/start-a-new-react-project#data-fetching)
- [React Docs – Suspense for Data Fetching](https://react.dev/reference/react/Suspense)
