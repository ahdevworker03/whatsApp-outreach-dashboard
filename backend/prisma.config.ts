import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 moved the datasource connection URL out of schema.prisma and into
// this file. See https://pris.ly/d/config-datasource.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
