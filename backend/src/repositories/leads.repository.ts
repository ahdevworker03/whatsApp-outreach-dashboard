import { LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";

// Lead-specific persistence, split out of webhook.repository.ts now that
// import (this milestone) is a second consumer of Lead persistence — see
// docs/development-milestones/03-lead-management-import.md's intro. Only
// webhook.repository.ts's upsertLeadByPhone still owns the webhook-driven
// upsert path; this file owns everything the leads API needs.

export interface NewLeadInput {
  phone: string; // already normalized E.164 — see src/lib/phone.ts
  name?: string;
  businessName?: string;
  sourceFile?: string;
}

export interface ListLeadsParams {
  status?: LeadStatus;
  skip: number;
  take: number;
}

// Application-level dedup (Step 4) already excludes rows whose phone exists
// or repeats in-file, so this shouldn't hit the unique constraint in normal
// use — skipDuplicates is a backstop, not the primary dedup mechanism (per
// docs/rules/database.md's Integrity section).
export function createManyLeads(leads: NewLeadInput[]): Promise<{ count: number }> {
  if (leads.length === 0) {
    return Promise.resolve({ count: 0 });
  }

  return prisma.lead.createMany({
    data: leads.map((lead) => ({
      phone: lead.phone,
      name: lead.name,
      businessName: lead.businessName,
      sourceFile: lead.sourceFile,
      status: "NEW",
    })),
    skipDuplicates: true,
  });
}

// Feeds Step 4's validateLeadRows(rows, existingPhones) the set of phones
// already in the table, so it can flag "already exists" duplicates.
export async function findExistingPhones(phones: string[]): Promise<Set<string>> {
  if (phones.length === 0) {
    return new Set();
  }

  const rows = await prisma.lead.findMany({
    where: { phone: { in: phones } },
    select: { phone: true },
  });
  return new Set(rows.map((row) => row.phone));
}

export function listLeads(params: ListLeadsParams) {
  const where: Prisma.LeadWhereInput = params.status ? { status: params.status } : {};

  return Promise.all([
    prisma.lead.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.lead.count({ where }),
  ]);
}

export function findLeadById(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export function deleteLeadById(id: string) {
  return prisma.lead.delete({ where: { id } });
}
