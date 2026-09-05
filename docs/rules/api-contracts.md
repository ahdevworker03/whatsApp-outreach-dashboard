# API Contract & Generated Code Rules

## Table of Contents

| # | Section |
| - | ------- |
| 1 | [Source of Truth](#source-of-truth) |
| 2 | [Contract First](#contract-first) |
| 3 | [Generated Artifacts](#generated-artifacts) |
| 4 | [Compatibility](#compatibility) |
| 5 | [Shared Types](#shared-types) |
| 6 | [Validation](#validation) |

These rules govern API contracts and all generated code and artifacts throughout the repository.

## Source of Truth

- The API specification is the single source of truth for all API contracts.
- Backend implementations, generated clients, validation schemas, and documentation must remain consistent with the API specification.
- Never duplicate API definitions outside their authoritative source.

## Contract First

- Define or update the API contract before implementing backend or frontend changes.
- Backend and frontend development should follow the approved API contract.
- API changes requiring architectural or product decisions must follow `design-decisions.md`.

## Generated Artifacts

Generated code is never the source of truth; always modify the source and regenerate.

- Generated clients, schemas, and related artifacts must be regenerated from the API specification.
- Never manually edit generated files; treat them as read-only outputs.
- If generated code is incorrect, fix the generator input rather than the generated result.
- Do not duplicate generated logic elsewhere in the repository.
- Keep generated artifacts synchronized with their source.
- Regenerate affected outputs after approved changes to the source.
- Do not leave generated packages in a partially updated state.
- Do not move, rename, or reorganize generated outputs unless the generation process changes.
- Preserve existing generation workflows.
- Generated artifacts must remain compatible with the repository architecture.

## Compatibility

- Preserve backward compatibility whenever practical.
- Do not introduce breaking API changes without explicit approval.
- Update all affected consumers when contract changes are approved.

## Shared Types

- Request and response models should have a single source of truth.
- Do not manually duplicate API types across packages.
- Reuse generated contracts wherever possible.

## Validation

Before completing API or generated-code work:

- Verify the implementation matches the API contract.
- Ensure generated artifacts are up to date and synchronized with their source.
- Confirm generated code is not manually modified.
- Confirm documentation reflects the current contract when required.
