This is the entry point for every task in this repository.

Read `docs/rules/project.md` first. Then read only the rule files relevant to the task below.

---

## Task Routing

| Task Type                 | Files to Read (in order)                                                                                                                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bug Fix                   | `docs/rules/project.md` → `docs/rules/development-workflow.md` → `docs/rules/coding-standards.md` → `docs/rules/testing.md`                                                                                            |
| New Feature               | `docs/rules/project.md` → `docs/rules/development-workflow.md` → `docs/rules/coding-standards.md` → `docs/rules/backend.md` _(if backend)_ → `docs/rules/database.md` _(if schema involved)_ → `docs/rules/testing.md` |
| Backend Work              | `docs/rules/project.md` → `docs/rules/backend.md` → `docs/rules/coding-standards.md` → `docs/rules/api-contracts.md` _(if endpoints change)_ → `docs/rules/testing.md`                                                 |
| Database / Schema Changes | `docs/rules/project.md` → `docs/rules/database.md` → `docs/rules/api-contracts.md` _(if API affected)_ → `docs/rules/testing.md`                                                                                       |
| API Contract Changes      | `docs/rules/project.md` → `docs/rules/api-contracts.md` → `docs/rules/backend.md`                                                                                                                                      |
| Documentation             | `docs/rules/project.md` → `docs/rules/development-workflow.md`                                                                                                                                                         |
| Testing                   | `docs/rules/project.md` → `docs/rules/testing.md`                                                                                                                                                                      |

---

## Rule Priority

When guidance conflicts, follow this order:

1. Explicit user instructions
2. `docs/rules/project.md`
3. `docs/architecture/` docs
4. Relevant rule file for the task
5. Existing code patterns
6. AI assumptions

Never let assumptions override the approved scope in `docs/contract/WhatsApp Outreach Dashboard.md`.

---

## Repository Truth

If documentation and implemented code disagree:

1. Report the inconsistency. Do not silently pick one.
2. Do not "fix" working code just to match stale docs.
3. Update documentation only when the current task requires it.

---

## Loading Principle

- Do not load every rule file by default. Load only what the task type above requires.
- Always use Context7 MCP when implementing against Express, Prisma, PostgreSQL, node-cron, or the Meta Cloud API — fetch current documentation before generating code, without waiting to be asked explicitly.
