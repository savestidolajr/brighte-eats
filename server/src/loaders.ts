import DataLoader from "dataloader";
import type { PrismaClient, Service } from "@prisma/client";

// Batches "services for these leadIds" into one query → avoids N+1.
export function createServicesByLeadLoader(prisma: PrismaClient) {
  return new DataLoader<string, Service[]>(async (leadIds) => {
    const rows = await prisma.leadService.findMany({
      where: { leadId: { in: [...leadIds] } },
      include: { service: true },
    });
    const byLead = new Map<string, Service[]>();
    for (const id of leadIds) byLead.set(id, []);
    for (const row of rows) byLead.get(row.leadId)!.push(row.service);
    return leadIds.map((id) => byLead.get(id)!);
  });
}
