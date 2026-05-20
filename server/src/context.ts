import type { PrismaClient, Service } from "@prisma/client";
import type DataLoader from "dataloader";
import { createServicesByLeadLoader } from "./loaders.js";

export interface Context {
  prisma: PrismaClient;
  ip: string;
  loaders: { servicesByLead: DataLoader<string, Service[]> };
}

export function buildContext(prisma: PrismaClient, ip: string): Context {
  return {
    prisma,
    ip,
    loaders: { servicesByLead: createServicesByLeadLoader(prisma) },
  };
}
