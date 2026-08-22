import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });
  const adapter = new PrismaPg(pool);
  return { prisma: new PrismaClient({ adapter }), pool };
}

if (!globalForPrisma.prisma) {
  const { prisma, pool } = createPrismaClient();
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

export const prisma = globalForPrisma.prisma;