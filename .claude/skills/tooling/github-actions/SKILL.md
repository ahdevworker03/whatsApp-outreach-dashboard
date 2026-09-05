---
name: github-actions
description: GitHub Actions CI/CD for this pnpm monorepo, including workflow files in `.github/workflows`, caching, test/build jobs, and deployment automation. Applicable when setting up CI/CD pipelines, automating build/test/deploy processes, optimizing workflow performance, or securing GitHub Actions workflows.
---

# GitHub Actions

## Purpose

This skill guides the agent in designing, implementing, and optimizing CI/CD pipelines using GitHub Actions following official GitHub documentation and security best practices. GitHub Actions is a platform that automates build, test, and deployment pipelines directly in your GitHub repository. Workflows are defined as YAML files stored in the `.github/workflows` directory. The skill covers workflow syntax, event triggers, job orchestration, caching, security hardening, reusable workflows, monorepo optimization, and deployment strategies.

---

## When to Load

- User is creating, modifying, or reviewing GitHub Actions workflow files (`.github/workflows/*.yml` or `.yaml`).
- User mentions: `GitHub Actions`, `workflow`, `CI/CD`, `pipeline`, `actions`, `runners`, `GITHUB_TOKEN`, `matrix`, `reusable workflow`, `composite action`, `cache`.
- User asks about automating build, test, or deployment processes.
- User is optimizing workflow performance or securing CI/CD pipelines.
- User is setting up monorepo CI/CD with Turborepo or Nx.

---

## When NOT to Load

- Writing application code without CI/CD implications.
- General architecture design without pipeline considerations.
- Infrastructure or deployment configuration unrelated to GitHub Actions.
- Code review without workflow context (see `code-review` skill).

---

## Core Principles

1. **Automate Everything** – All repetitive tasks (linting, testing, building, deploying) should be automated in workflows. Manual steps are error-prone and not repeatable.
2. **Fail Fast** – Run the fastest and most critical checks first (linting, type checking) before expensive operations (integration tests, builds).
3. **Cache Aggressively** – Cache dependencies, build outputs, and Turborepo artifacts to reduce workflow execution time. The official `actions/cache` is the recommended approach.
4. **Security First** – Apply least privilege to `GITHUB_TOKEN` permissions, use secrets for sensitive data, and never store secrets in plaintext.
5. **Reuse Workflows** – Use reusable workflows and composite actions to avoid duplication across repositories and workflows.
6. **Keep Workflows Fast** – Optimize for speed. Use matrix strategies for parallel execution, and avoid unnecessary jobs.

---

## Decision Rules

### Workflow Triggers

- **IF** you need to run on every push to any branch, **THEN** use `on: [push]`.
- **IF** you need to run on pull requests targeting specific branches, **THEN** use:
  ```yaml
  on:
    pull_request:
      branches: [main, develop]
  ```
- **IF** you need to run on a schedule, **THEN** use `on: schedule: - cron: '0 0 * * *'`.
- **IF** you need manual triggering, **THEN** use `on: workflow_dispatch` with inputs.
- **IF** you need to restrict which files trigger the workflow, **THEN** use `paths` and `paths-ignore` filters.

### Job Configuration

- **IF** jobs can run in parallel, **THEN** do not add dependencies between them. Jobs run in parallel by default.
- **IF** a job depends on another job completing successfully, **THEN** use `needs: [job-name]`.
- **IF** a job should run conditionally, **THEN** use `if: condition` (e.g., `if: github.ref == 'refs/heads/main'`).
- **IF** a job requires specific permissions, **THEN** set `permissions` at the job level, not globally:
  ```yaml
  jobs:
    deploy:
      permissions:
        contents: read
        deployments: write
  ```

### Matrix Strategies

- **IF** you need to test against multiple Node.js versions, operating systems, or configurations, **THEN** use `strategy.matrix`:
  ```yaml
  strategy:
    matrix:
      node-version: [18, 20, 22]
      os: [ubuntu-latest, windows-latest]
  ```
- **IF** the matrix creates too many jobs, **THEN** use `strategy.fail-fast: false` to allow other jobs to continue if one fails.
- **IF** you need to exclude specific combinations, **THEN** use `exclude` in the matrix.

### Caching

- **IF** you install dependencies (npm, pnpm, yarn), **THEN** use the built-in cache input on setup actions (e.g., `actions/setup-node@v4` with `cache: 'npm'`). This is the recommended method because GitHub manages the cache key automatically using the relevant lock file.
- **IF** you need custom caching (e.g., Turborepo `.turbo` directory), **THEN** use `actions/cache@v4` or `v5`. Use `v4` for Node.js 20 compatibility or `v5` for Node.js 24 with Actions Runner 2.327.1+.
- **IF** you need granular control over cache restore and save, **THEN** use `actions/cache/restore` and `actions/cache/save` actions.
- **IF** the cache key should fall back to previous commits when the exact key misses, **THEN** use `restore-keys`.
- **ALWAYS** base cache keys on lockfiles and relevant configuration files (e.g., `package-lock.json`, `pnpm-lock.yaml`, `turbo.json`).

### Security Hardening

- **IF** using secrets, **THEN** store them as repository/organization secrets and reference them with `${{ secrets.SECRET_NAME }}`.
- **IF** setting `GITHUB_TOKEN` permissions, **THEN** use the principle of least privilege. Set default permissions to read-only for contents and increase per job as needed.
- **IF** you need to mask sensitive data that is not a GitHub secret, **THEN** use `::add-mask::VALUE` to redact it from logs.
- **IF** using `pull_request_target` event, **THEN** be extremely cautious. This event runs in the context of the base branch and can be exploited if not handled correctly. GitHub has hardened `actions/checkout` to block risky `pull_request_target` checkouts by default.
- **IF** using third-party actions, **THEN** pin them to specific commit SHAs for security, or use major version tags (e.g., `@v4`).
- **NEVER** store structured data (JSON, XML, YAML) as a secret. Use individual secrets for each sensitive value.

### Reusable Workflows

- **IF** you have identical workflows across multiple repositories, **THEN** create a reusable workflow in a central repository.
- **IF** calling a reusable workflow, **THEN** reference it with `jobs.<job_id>.uses: owner/repo/.github/workflows/workflow.yml@ref`.
- **IF** passing inputs to a reusable workflow, **THEN** use `with:`:
  ```yaml
  uses: ./.github/workflows/reusable-build.yml
  with:
    node-version: "20"
  secrets:
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
  ```
- **IF** a reusable workflow needs permissions, **THEN** the caller job must grant them.

### Composite Actions

- **IF** you need to reuse a sequence of steps within a single workflow or across workflows, **THEN** create a composite action.
- **IF** creating a composite action, **THEN** define it in `action.yml` with `runs: using: 'composite'` and a `steps` list.
- **IF** a composite action has inputs, **THEN** define them in `inputs:` and reference them with `${{ inputs.name }}`.

### Monorepo Optimization

- **IF** using Turborepo in a monorepo, **THEN** cache the `.turbo` directory between workflow runs.
- **IF** using Turborepo, **THEN** use `turbo run` in CI/CD workflows, not the bare `turbo` command.
- **IF** you need to deploy only affected applications, **THEN** use `turbo run build --filter=...[main]` or similar filtering.
- **IF** you need remote caching, **THEN** configure Turborepo remote cache with the Vercel integration or a custom server.

### Deployment Environments

- **IF** deploying to production, staging, or development, **THEN** use GitHub Environments.
- **IF** an environment requires manual approval, **THEN** configure protection rules in Settings > Environments.
- **IF** an environment should only accept deployments from specific branches, **THEN** set branch restrictions in the environment configuration.

### Concurrency

- **IF** multiple workflow runs or jobs should not run simultaneously (e.g., deployments to the same environment), **THEN** use `concurrency`:
  ```yaml
  concurrency:
    group: deploy-production
    cancel-in-progress: true
  ```
- **IF** you want to cancel in-progress runs when a new one starts, **THEN** set `cancel-in-progress: true`.

---

## Best Practices

### Workflow Structure

1. **Use descriptive `name` and `run-name`** – `name` appears in the Actions tab; `run-name` can include dynamic values like `${{ github.actor }}`.
2. **Keep workflows focused** – Each workflow should have a single responsibility (e.g., CI, deployment, linting).
3. **Use `env` at the workflow or job level** – Define environment variables that are reused across steps.
4. **Set `permissions` explicitly** – Never rely on default permissions. Set `permissions: read-all` or list specific permissions.
5. **Use `timeout-minutes`** – Prevent stuck jobs from running indefinitely. Set a realistic timeout for each job.

### Dependency Caching

1. **Use setup action's built-in cache** – `actions/setup-node@v4` with `cache: 'npm'` is the simplest and recommended approach.
2. **For custom caches, use `actions/cache`** – Use `v4` for Node.js 20 compatibility or `v5` for Node.js 24.
3. **Cache Turborepo outputs** – Cache `.turbo` directory to reuse build artifacts across runs.
4. **Use `restore-keys` fallback** – When the exact cache key misses, fall back to a partial match to reuse older caches.

### Security

1. **Never log secrets** – Secrets are automatically redacted, but structured data may not be.
2. **Rotate exposed secrets immediately** – If a secret appears in logs, delete the log and rotate the secret.
3. **Use `GITHUB_TOKEN` with minimal permissions** – Set `permissions: read-all` as default.
4. **Pin actions to specific versions** – Use `@v4` or commit SHAs, not `@main` or `@latest`.
5. **Be cautious with `pull_request_target`** – This event runs in the base branch context and can be exploited.

### Performance Optimization

1. **Run fast checks first** – Linting and type checking before expensive builds and tests.
2. **Use matrix for parallel testing** – Test across multiple Node versions or operating systems in parallel.
3. **Skip unnecessary jobs** – Use `paths` and `paths-ignore` to skip workflows when only documentation changes.
4. **Use `continue-on-error` for non-critical jobs** – Allow optional checks to fail without blocking the workflow.

### Monitoring and Debugging

1. **Use `github.event_name` and `github.ref` in conditions** – Control when jobs run based on event type or branch.
2. **Add debug logging** – Use `run: echo "::debug::Debug message"` or set `ACTIONS_STEP_DEBUG` to `true` in secrets.
3. **Use `actions/upload-artifact`** – Upload test reports, build logs, or screenshots for debugging.
4. **Monitor workflow run duration** – Track trends to identify performance regressions.

---

## Anti-Patterns

| Anti-Pattern                                              | Why it is wrong                                                  | Correct approach                                                                            |
| --------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Storing secrets in workflow files                         | Secrets exposed in version control.                              | Use GitHub Secrets and reference with `${{ secrets.NAME }}`.                                |
| Using `GITHUB_TOKEN` with write permissions unnecessarily | Increases attack surface; principle of least privilege violated. | Set `permissions: read-all` and increase per job.                                           |
| Not caching dependencies                                  | Slow workflows; wasted resources.                                | Use setup action cache or `actions/cache`.                                                  |
| Using `pull_request_target` without understanding risks   | Can execute malicious code from PRs with full privileges.        | Use `pull_request` for untrusted code; use `pull_request_target` only with extreme caution. |
| Pinning actions to `@main` or `@latest`                   | Unpredictable; may break workflows unexpectedly.                 | Pin to major version tags (`@v4`) or commit SHAs.                                           |
| Long-running monolithic workflows                         | Hard to debug; slow feedback.                                    | Break into focused, fast workflows.                                                         |
| Not using `concurrency` for deployments                   | Multiple deployments to same environment conflict.               | Use `concurrency` to prevent concurrent deployments.                                        |
| Hardcoding Node.js versions                               | Inconsistent across runs.                                        | Use matrix strategies or environment variables.                                             |

---

## Common Mistakes & Edge Cases

| Mistake                                             | Symptom                                          | Solution                                                   |
| --------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| Forgetting to set `permissions`                     | Workflow fails with permission errors.           | Set explicit permissions for the workflow or job.          |
| Cache key not matching                              | Cache miss on every run; slow workflows.         | Ensure cache key is based on lockfile and relevant config. |
| Using `actions/cache@v3` after deprecation          | Workflow fails after February 2025.              | Upgrade to `v4` or `v5`.                                   |
| Not setting `timeout-minutes`                       | Jobs hang indefinitely.                          | Set `timeout-minutes: 10` or appropriate value.            |
| Matrix strategy too large                           | Exceeds GitHub Actions limits; workflow fails.   | Limit matrix combinations or use `exclude`.                |
| `pull_request_target` checkout checking out PR code | Security vulnerability.                          | GitHub now blocks risky checkouts by default.              |
| Not using `continue-on-error` for optional jobs     | Non-critical failures block the entire workflow. | Use `continue-on-error: true` for optional checks.         |
| Environment protection rules blocking deployments   | Deployments stuck waiting for approval.          | Configure protection rules appropriately.                  |

---

## Related Skills

- `deployment` – for integrating GitHub Actions with deployment pipelines.
- `docker` – for building and pushing Docker images in workflows.
- `monorepo` – for monorepo-specific CI/CD patterns with Turborepo.
- `testing` – for running tests in CI/CD pipelines.
- `security` – for comprehensive security considerations.
- `git` – for branch management and commit conventions.
- `environment-config` – for environment variables in CI/CD.

---

## Official References

- [Workflow syntax for GitHub Actions – Official Docs](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [Workflows – Official Docs](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows)
- [Creating an example workflow – Official Docs](https://docs.github.com/en/actions/tutorials/create-an-example-workflow)
- [Security hardening for GitHub Actions – Official Docs](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)
- [Caching dependencies to speed up workflows – Official Docs](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [actions/cache – GitHub Repository](https://github.com/actions/cache)
- [Reusable workflows – Official Docs](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
- [Composite actions – Official Docs](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action)
- [Matrix strategies – Official Docs](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs)
- [Self-hosted runners – Official Docs](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Using environments for deployment – Official Docs](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Concurrency – Official Docs](https://docs.github.com/en/actions/using-jobs/using-concurrency)
