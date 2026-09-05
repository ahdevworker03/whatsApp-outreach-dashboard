---
name: environment-config
description: Environment configuration for this repository, including `.env.example`, `apps/api` and `apps/web` env vars, Vercel/Docker secrets, and Codex/MCP config values. Applicable when setting up environment variables, validating configuration at startup, managing secrets, or structuring environment-specific settings.
---

# Environment Configuration

## Purpose

This skill guides the agent in managing environment configuration across development, staging, and production environments following the Twelve-Factor App principles and Node.js best practices. Environment configuration includes all settings that vary between environments—database URLs, API keys, feature flags, service endpoints, and security credentials. The skill covers dotenv loading, validation, environment-specific overrides, secret management, and structured configuration modules.

---

## When to Load

- User is setting up or updating environment variables, `.env` files, or configuration modules.
- User mentions: `environment`, `config`, `env`, `dotenv`, `process.env`, `configuration`, `.env`, `environment variables`, `secret`, `validation`, `NODE_ENV`.
- User asks about managing multiple environments, loading configuration, or validating environment variables.
- User is setting up CI/CD pipelines or deployment configurations.
- User is implementing configuration modules or refactoring existing configuration.

---

## When NOT to Load

- General application code without configuration changes.
- Frontend or React component development without environment variables.
- Database schema design or migrations.
- Infrastructure or deployment configuration unrelated to configuration management.

---

## Core Principles

1. **Config in the Environment** – Store configuration in environment variables, not in code. This enables deployment to different environments without changing code.
2. **Fail Fast on Invalid Configuration** – Validate all required environment variables at application startup. If configuration is invalid, exit immediately with a clear error.
3. **Keep Development and Production Consistent** – Use the same configuration patterns across all environments; only the values differ. Minimize environment-specific code paths.
4. **Never Hardcode Secrets** – Secrets (passwords, tokens, API keys) must never be hardcoded in source code. Use environment variables and secret management services.
5. **Separate Configuration from Code** – Configuration values may change between deployments; code should not change between environments.
6. **Document All Variables** – Maintain a `.env.example` file with all required variables and descriptions.
7. **Validate at Startup, Not at Runtime** – Validate configuration when the application starts, not when the configuration is used. This catches issues early.

---

## Decision Rules

### Loading Environment Variables

- **IF** using Node.js, **THEN** use `dotenv` to load environment variables from `.env` files in development.
- **IF** in production, **THEN** environment variables should be set by the deployment platform (Vercel, Docker, Kubernetes, systemd) rather than loaded from a file.
- **IF** using multiple `.env` files (e.g., `.env.development`, `.env.production`), **THEN** use `dotenv-flow` or `dotenv-expand` to manage them.
- **ALWAYS** load environment variables at the very beginning of the application entry point before any other code runs.

### Validation

- **IF** a variable is required, **THEN** validate it exists and has a non-empty value.
- **IF** a variable has a specific format (URL, port, boolean, number), **THEN** validate the format and type.
- **IF** validation fails, **THEN** throw an error and exit the process with a clear message listing all missing/invalid variables.
- **IF** using TypeScript, **THEN** export a typed configuration object derived from the validated environment.

### Environment-Specific Overrides

- **IF** a variable should have different values in different environments, **THEN** define it in environment-specific `.env` files or use a configuration module with conditional logic.
- **IF** using a single `.env` file, **THEN** set `NODE_ENV` and use conditional logic in code to vary behavior.
- **IF** a value should not be overridden by environment (e.g., application name), **THEN** hardcode it in the configuration module, not in the environment.

### Secret Management

- **IF** using Docker, **THEN** pass secrets via environment variables or Docker secrets (not via `.env` files in production).
- **IF** using cloud platforms, **THEN** use platform-specific secret management (Vercel Secrets, AWS Secrets Manager, Azure Key Vault).
- **IF** using CI/CD, **THEN** store secrets in CI/CD environment variables (GitHub Actions secrets, GitLab CI variables).
- **NEVER** commit `.env` files with real secrets to version control.

### Default Values

- **IF** a variable has a safe default (e.g., `PORT=3000`), **THEN** provide it and note that it can be overridden.
- **IF** a variable is optional, **THEN** provide a default and document the default behavior.
- **IF** a variable is sensitive, **THEN** do not provide a default; force explicit setting.

---

## Best Practices

### Structure of Configuration Module

1. **Create a dedicated `config` directory** – Place all configuration-related files in `src/config/`.
2. **Use a single source of truth** – Define all environment variables in a central configuration module that exports a typed object.
3. **Validate on import** – Run validation when the module is imported, before the application starts.
4. **Use TypeScript for type safety** – Export a type for the configuration object.
5. **Group related variables** – Group variables by domain (e.g., `database`, `auth`, `api`, `logging`).

### Example Configuration Module

```ts
// src/config/index.ts
import dotenv from "dotenv";
import { z } from "zod";

// Load .env file in development
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// Define schema
const configSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGINS: z.string().optional(),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
});

// Validate
const result = configSchema.safeParse(process.env);
if (!result.success) {
  console.error("❌ Invalid environment configuration:");
  result.error.errors.forEach((err) => {
    console.error(`  ${err.path.join(".")}: ${err.message}`);
  });
  process.exit(1);
}

const env = result.data;

// Build typed config object
export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  isDevelopment: env.NODE_ENV === "development",
  isTest: env.NODE_ENV === "test",
  port: env.PORT,
  database: {
    url: env.DATABASE_URL,
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
  },
  cors: {
    origins: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(",") : [],
  },
  logging: {
    level: env.LOG_LEVEL,
  },
} as const;

export type Config = typeof config;
```

### Dotenv Files

1. **Use `.env.example`** – Keep an example file in the repository with all variables and placeholder values.
2. **Add `.env` to `.gitignore`** – Never commit real `.env` files with secrets.
3. **Use environment-specific files for complex setups** – `.env.development`, `.env.test`, `.env.production` can be loaded conditionally.
4. **In production, use native environment variables** – Do not rely on `.env` files in production; set variables in the deployment environment.

### Validation Tools

1. **Use Zod for validation** – Zod provides type inference, custom validation, and rich error messages.
2. **Use Joi for validation** – Joi is a powerful alternative with extensive validation rules.
3. **Use `env-var` for simpler cases** – `env-var` provides a lightweight validation and transformation API.
4. **For pure validation without type inference, use `yup` or `ajv`** – These are also valid but less integrated with TypeScript.

### Environment Detection

1. **Use `NODE_ENV` to determine environment** – Always set `NODE_ENV` in production.
2. **Avoid using custom environment names** – Stick to `development`, `test`, `production` for compatibility with tooling.
3. **Derive booleans from `NODE_ENV`** – Create helpers like `isProduction = NODE_ENV === 'production'`.

### Secrets in CI/CD

1. **Store secrets in CI/CD environment variables** – GitHub Actions secrets, GitLab CI variables, CircleCI context variables.
2. **Use `env` or `env-file` options** – In Docker Compose, use `env_file` to pass secrets from a file outside the repository.
3. **Never log secrets** – Ensure logs do not contain configuration values, especially secrets.

---

## Anti-Patterns

| Anti-Pattern                                                            | Why it is wrong                                                            | Correct approach                                                                  |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Hardcoding configuration values in code                                 | Cannot change without code change; environment-specific values impossible. | Use environment variables.                                                        |
| Committing `.env` to version control                                    | Exposes secrets to the repository.                                         | Add `.env` to `.gitignore`; use `.env.example`.                                   |
| Not validating environment variables                                    | Application fails at runtime with cryptic errors.                          | Validate at startup and fail fast.                                                |
| Using environment variables directly across codebase                    | Tight coupling; hard to test; no type safety.                              | Centralize in a config module.                                                    |
| Using `NODE_ENV` for feature toggles                                    | Feature flags should be separate; `NODE_ENV` is for environment only.      | Use dedicated feature-flag variables.                                             |
| Loading `.env` in production                                            | Slower startup; may expose secrets; not recommended.                       | Set environment variables natively.                                               |
| Not providing defaults for optional variables                           | Application fails if optional variable is not set.                         | Provide reasonable defaults.                                                      |
| Overwriting environment variables in code                               | Bypasses environment; confusing debugging.                                 | Never overwrite environment variables after loading.                              |
| Using environment variables in frontend code without NEXT_PUBLIC prefix | Frontend code cannot access process.env in browser.                        | Use platform-specific prefix (e.g., `NEXT_PUBLIC_`) for client-exposed variables. |

---

## Common Mistakes & Edge Cases

| Mistake                                 | Symptom                                                       | Solution                                                  |
| --------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| Forgetting to load `.env` in tests      | Tests fail due to missing environment variables.              | Use `dotenv.config({ path: '.env.test' })` in test setup. |
| Using `process.env` directly in modules | Hard to test; config values change unpredictably.             | Import from a central config module.                      |
| Not handling booleans properly          | `'false'` is truthy in JavaScript.                            | Use `z.coerce.boolean()` or explicit comparison.          |
| Environment variable names with hyphens | Not valid in many shells.                                     | Use underscores (`DATABASE_URL`, not `DATABASE-URL`).     |
| Not setting `NODE_ENV` in production    | Many libraries behave differently; performance degraded.      | Always set `NODE_ENV=production`.                         |
| Using `process.cwd()` for config paths  | File paths change if app is run from different directory.     | Use `__dirname` or absolute paths.                        |
| Overriding variables in multiple places | Hard to reason about final values.                            | Use a single source of truth.                             |
| Not validating at startup in serverless | Cold starts become slower; but validation should happen once. | Validate once when the module loads.                      |
| Including secrets in debug logs         | Secrets exposed.                                              | Never log configuration values.                           |

---

## Related Skills

- `deployment` – for integrating environment configuration into deployment pipelines.
- `docker` – for passing environment variables to containers.
- `github-actions` – for managing secrets in CI/CD.
- `logging-monitoring` – for logging configuration validation and errors.
- `security` – for secure handling of secrets.
- `testing` – for testing configuration and environment variations.

---

## Official References

- [Twelve-Factor App – Config](https://12factor.net/config)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [Zod Documentation – Environment Variables](https://zod.dev/)
- [Node.js process.env Documentation](https://nodejs.org/api/process.html#processenv)
- [Docker Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [OCI Configuration Management](https://docs.docker.com/engine/swarm/secrets/)
- [NODE_ENV Explained](https://nodejs.dev/en/learn/nodejs-the-difference-between-development-and-production/)
- [npm dotenv-expand](https://github.com/motdotla/dotenv-expand)
- [env-var Documentation](https://github.com/evanshortiss/env-var)
