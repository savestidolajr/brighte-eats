import type { PrismaClient, Service } from "@prisma/client";
import type DataLoader from "dataloader";
import { createServicesByLeadLoader } from "./loaders.js";

export interface Context {
  prisma: PrismaClient;
  ip: string;
  isAdmin: boolean;
  loaders: { servicesByLead: DataLoader<string, Service[]> };
}

export function buildContext(
  prisma: PrismaClient,
  ip: string,
  isAdmin = false
): Context {
  return {
    prisma,
    ip,
    isAdmin,
    loaders: { servicesByLead: createServicesByLeadLoader(prisma) },
  };
}
