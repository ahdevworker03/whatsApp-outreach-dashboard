import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env";

// Single shared Prisma client instance — import this everywhere instead of
// instantiating PrismaClient per file (docs/architecture/03-backend-architecture.md).
// Prisma 7 requires a driver adapter; see https://pris.ly/d/prisma7-client-config.
const adapter = new PrismaPg({ connectionString: env.databaseUrl });

export const prisma = new PrismaClient({ adapter });
