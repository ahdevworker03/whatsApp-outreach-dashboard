---
name: git
description: Git workflow for this repository, including milestone-based commits, PR hygiene, branch management, and change isolation across the monorepo. Applicable when managing source code, collaborating on features, preparing releases, resolving merge conflicts, or setting up repository policies.
---

# Git

## Purpose

This skill guides the agent in using Git effectively for version control in a collaborative monorepo environment. Git is the foundation of modern software development, enabling teams to work concurrently, maintain history, and manage releases. The skill covers branching strategies, commit conventions, pull request workflows, merge strategies, conflict resolution, and integration with monorepo tooling. The goal is to maintain a clean, navigable history and enable smooth collaboration.

---

## When to Load

- User is managing Git branches, commits, or pull requests.
- User mentions: `git`, `commit`, `branch`, `merge`, `rebase`, `pull request`, `PR`, `conflict`, `stash`, `cherry-pick`, `tag`, `release`.
- User asks about branching strategies, commit message conventions, or merge workflows.
- User is resolving merge conflicts or reviewing PR history.
- User is setting up Git hooks, Git LFS, or repository policies.

---

## When NOT to Load

- Writing application code without version control operations.
- General architecture design or planning.
- Infrastructure or deployment configuration unrelated to Git.
- Code review without Git context (see `code-review` skill).

---

## Core Principles

1. **Commit Early, Commit Often** – Small, focused commits are easier to review, revert, and understand. Each commit represents one completed implementation step from the milestone plan.
2. **Write Meaningful Commit Messages** – Commit messages explain why a change was made, not just what was changed. They are the primary documentation for the codebase.
3. **Keep the Main Branch Stable** – The main branch (main/master) should always be deployable. Never commit directly to main; use feature branches and pull requests.
4. **Use Branches for Features** – Isolate work in feature branches. Each branch should correspond to a single feature, bug fix, or refactoring effort.
5. **Rebase Before Merging** – Keep your feature branch up-to-date with the main branch by rebasing before creating a pull request. This keeps history linear and avoids merge commits.
6. **Pull Requests Are for Collaboration** – Pull requests are not just for code review; they are an opportunity for discussion, knowledge sharing, and quality assurance.
7. **Atomic Commits** – Each commit should represent a self-contained change that does not break the application. No commit should leave the codebase in a broken state.

---

## Decision Rules

### Branching Strategy Selection

- **IF** the project has multiple active releases and follows semantic versioning, **THEN** use GitFlow (feature → develop → release → main) for structured release management.
- **IF** the project deploys continuously and has fast iteration cycles, **THEN** use GitHub Flow (feature → main → deploy) for simplicity.
- **IF** the project is a monorepo with multiple applications, **THEN** use a trunk-based development model with short-lived feature branches and frequent merges to main.
- **IF** the project has strict release windows, **THEN** use GitFlow with release branches for preparation and hotfix branches for critical fixes.

### Commit Message Convention

- **IF** following semantic versioning, **THEN** use Conventional Commits format:
  ```
  <type>(<scope>): <subject>
  <BLANK LINE>
  <body>
  <BLANK LINE>
  <footer>
  ```
- **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`.
- **IF** the project is less formal, **THEN** use imperative, present tense: "Add user authentication" not "Added user authentication".
- **ALWAYS** keep the subject line under 50 characters.
- **ALWAYS** use the body to explain why the change was made, not what was changed.

### Merge Strategy

- **IF** you want a linear, clean history, **THEN** use `rebase` before merging (rebase + merge).
- **IF** you want to preserve the exact commit history of the feature branch, **THEN** use a standard `merge` commit.
- **IF** the feature branch has many small commits that don't add value individually, **THEN** use `squash` to combine them into a single commit before merging.
- **IF** merging a large feature branch with conflicting changes, **THEN** rebase the feature branch onto the target branch, resolve conflicts, and then merge.

### Conflict Resolution

- **IF** a conflict occurs during a merge or rebase, **THEN** examine the conflicting sections to understand the changes from both sides.
- **IF** both changes are valid, **THEN** choose the appropriate combination or manually edit to resolve the conflict.
- **IF** the conflict is complex and involves multiple contributors, **THEN** discuss with the team before resolving.
- **ALWAYS** test the code after resolving conflicts before committing the merge.
- **NEVER** use `--force` or `--force-with-lease` to overwrite remote history without team consensus.

### Monorepo Workflow

- **IF** making changes to shared packages, **THEN** ensure changes are backward-compatible or coordinate with consuming teams.
- **IF** making changes that affect multiple applications, **THEN** use a single branch for all changes and test all affected applications.
- **IF** using Turborepo or Nx, **THEN** leverage affected command to determine which parts of the repository are impacted by changes.

### Release Management

- **IF** preparing a release, **THEN** create a release branch or tag from the main branch.
- **IF** using Conventional Commits, **THEN** use a tool like `standard-version` or `semantic-release` to automatically generate changelogs and version bumps.
- **IF** the release is critical or has high impact, **THEN** use a release candidate (RC) tag for testing before the final release.

---

## Best Practices

### Commit Hygiene

1. **Stage changes logically** – Use `git add -p` to stage specific hunks of a file for granular commits.
2. **Review the diff before committing** – Use `git diff --staged` to ensure you are committing the right changes.
3. **Write descriptive commit messages** – The subject line should summarize the change. The body should explain why the change was made.
   ```
   feat(auth): add JWT refresh token rotation

   This adds refresh token rotation to improve security. When a refresh
   token is used, it is immediately revoked and a new one is issued.
   This prevents refresh token reuse attacks.
   ```
4. **Amend commits for small corrections** – Use `git commit --amend` to modify the last commit if you forgot to stage a file or want to update the message. Only do this if the commit has not been pushed.
5. **Squash commits before merging** – Combine related commits into a single, coherent commit to keep the history clean.

### Branch Naming Conventions

- **Feature branches**: `feature/description` or `feat/description` (e.g., `feature/user-authentication`)
- **Bug fixes**: `fix/description` or `bugfix/description` (e.g., `fix/login-error`)
- **Hotfixes**: `hotfix/description` (e.g., `hotfix/critical-security-patch`)
- **Release branches**: `release/v1.2.3`
- **Chore branches**: `chore/description` (e.g., `chore/update-dependencies`)

### Pull Request Workflow

1. **Create a branch** from the main branch for the feature/bug.
2. **Commit work** with descriptive messages.
3. **Rebase or merge** the main branch into your branch to keep it up-to-date.
4. **Push** the branch to the remote repository.
5. **Open a Pull Request** with a clear title and description.
6. **Request reviews** from team members.
7. **Address feedback** with additional commits or by amending existing commits.
8. **Merge** the branch once approved.
9. **Delete** the branch after merging to keep the repository clean.

### Pull Request Description Template

```markdown
## What does this PR do?

[Brief description of the changes]

## Why is this change needed?

[Context or reason for the change]

## How has this been tested?

[Description of testing performed]

## Related Issues

[Fixes #123, Closes #456]

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Environment variables added/updated
- [ ] Backward-compatible changes
```

### Git Hooks

- **Pre-commit hook**: Run linters and formatters (e.g., `prettier`, `eslint`) on staged files.
- **Commit-msg hook**: Validate commit message format.
- **Pre-push hook**: Run tests before pushing to remote.
- **Use Husky** for managing Git hooks in Node.js projects.

### Git LFS (Large File Storage)

- **IF** storing large files (images, videos, binaries) in the repository, **THEN** use Git LFS to store them efficiently.
- **ALWAYS** track large file types with `.gitattributes` to enable LFS storage.
- **NEVER** commit large binary files directly to the repository (which would bloat the repository).

### Security Best Practices

- **NEVER** commit secrets (API keys, passwords, tokens) to the repository.
- **ALWAYS** use `.gitignore` to exclude sensitive files (`.env`, `.env.*`, `*.pem`, `*.key`, `*.log`).
- **IF** a secret is accidentally committed, **THEN** revoke it immediately and use `git filter-branch` or `BFG Repo-Cleaner` to remove it from history.

---

## Anti-Patterns

| Anti-Pattern                                | Why it is wrong                                                   | Correct approach                                                          |
| ------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Committing directly to main                 | Bypasses review; breaks the main branch; destabilizes production. | Always use feature branches and pull requests.                            |
| Large, monolithic commits                   | Hard to review, revert, and understand.                           | Commit small, focused changes.                                            |
| Vague commit messages (`"fix"`, `"update"`) | No context; hard to understand why a change was made.             | Use meaningful messages: `"fix(auth): handle expired tokens gracefully"`. |
| Force-pushing without consensus             | Overwrites remote history; breaks collaborators' work.            | Use `--force-with-lease` if needed; discuss with team first.              |
| Merging without testing                     | Broken code reaches main.                                         | Ensure tests pass and code is reviewed before merging.                    |
| Not cleaning up branches                    | Clutters the repository.                                          | Delete branches after merging.                                            |
| Using `git commit --amend` after pushing    | Rewrites history; breaks collaborators.                           | Only amend unpushed commits.                                              |
| Ignoring conflicts                          | Conflicts accumulate; harder to resolve later.                    | Resolve conflicts immediately.                                            |
| Storing large files directly                | Bloats repository; slow clones.                                   | Use Git LFS or exclude large files.                                       |

---

## Repository-Specific Workflow

Repo-specific Git workflow, commit format, milestone rules, and AI responsibilities are defined in `docs/rules/git.md`. Follow those rules for this repository.

---

## Common Mistakes & Edge Cases

| Mistake                                             | Symptom                                     | Solution                                                                                     |
| --------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Forgetting to stage a file                          | Committed changes are incomplete.           | Use `git add <file>` and `git commit --amend` to add it.                                     |
| Committing with `-m` only                           | Subject line too short; no body.            | Use `git commit` without `-m` to write a full message.                                       |
| Merge conflicts after rebase                        | Conflicts appear unexpectedly.              | Resolve conflicts carefully and test the result.                                             |
| Accidentally committing secrets                     | Secrets exposed in history.                 | Revoke the secret and remove it from history with `git filter-branch` or `BFG Repo-Cleaner`. |
| Running `git reset --hard HEAD^`                    | Loses changes.                              | Use `git reset --soft HEAD^` to keep changes staged.                                         |
| Not pulling before pushing                          | Push rejected due to new commits on remote. | Pull latest changes and rebase or merge before pushing.                                      |
| Using `git checkout` without understanding branches | Overwrites uncommitted changes.             | Use `git stash` to save changes before switching branches.                                   |
| Deleting a branch without merging                   | Changes are lost.                           | Merge or squash changes before deleting.                                                     |

---

## Related Skills

- `github-actions` – for integrating Git workflows with CI/CD.
- `monorepo` – for Git workflows in a monorepo with Turborepo/Nx.
- `deployment` – for using Git tags in deployment pipelines.
- `code-review` – for reviewing pull requests.
- `testing` – for pre-commit and pre-push hooks.

---

## Official References

- [Git Official Documentation](https://git-scm.com/doc)
- [Git Basics – Atlassian Git Tutorial](https://www.atlassian.com/git/tutorials/git-basics)
- [Git Flow Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
- [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Branching and Merging](https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell)
- [Rebasing – Git Documentation](https://git-scm.com/book/en/v2/Git-Branching-Rebasing)
- [Git Hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [Husky – Git Hooks for Node.js](https://typicode.github.io/husky/)
- [Git LFS Documentation](https://git-lfs.com/)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [Git Merge vs Rebase](https://www.atlassian.com/git/tutorials/merging-vs-rebasing)
- [Git Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [GitHub Pull Requests](https://docs.github.com/en/pull-requests)
