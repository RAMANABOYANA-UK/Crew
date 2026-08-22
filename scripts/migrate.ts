import "dotenv/config";
import { Client } from "pg";

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Supabase PostgreSQL.");

  const sql = `
    ALTER TABLE "Employee" ALTER COLUMN "basicSalary" TYPE DECIMAL(10, 2);
    ALTER TABLE "Employee" ALTER COLUMN "hra" TYPE DECIMAL(10, 2);
    ALTER TABLE "Employee" ALTER COLUMN "allowances" TYPE DECIMAL(10, 2);

    ALTER TABLE "Payroll" ALTER COLUMN "wage" TYPE DECIMAL(10, 2);
    ALTER TABLE "Payroll" ALTER COLUMN "basicSalary" TYPE DECIMAL(10, 2);
    ALTER TABLE "Payroll" ALTER COLUMN "hra" TYPE DECIMAL(10, 2);
    ALTER TABLE "Payroll" ALTER COLUMN "standardAllowance" TYPE DECIMAL(10, 2);
    ALTER TABLE "Payroll" ALTER COLUMN "performanceBonus" TYPE DECIMAL(10, 2);
    ALTER TABLE "Payroll" ALTER COLUMN "lta" TYPE DECIMAL(10, 2);
    ALTER TABLE "Payroll" ALTER COLUMN "fixedAllowance" TYPE DECIMAL(10, 2);
    ALTER TABLE "Payroll" ALTER COLUMN "pfEmployee" TYPE DECIMAL(10, 2);
    ALTER TABLE "Payroll" ALTER COLUMN "pfEmployer" TYPE DECIMAL(10, 2);
    ALTER TABLE "Payroll" ALTER COLUMN "professionalTax" TYPE DECIMAL(10, 2);
    ALTER TABLE "Payroll" ALTER COLUMN "netPayable" TYPE DECIMAL(10, 2);

    ALTER TABLE "SalaryConfig" ALTER COLUMN "pfEmployeeRate" TYPE DECIMAL(5, 4);
    ALTER TABLE "SalaryConfig" ALTER COLUMN "pfEmployerRate" TYPE DECIMAL(5, 4);
    ALTER TABLE "SalaryConfig" ALTER COLUMN "professionalTax" TYPE DECIMAL(10, 2);
    ALTER TABLE "SalaryConfig" ALTER COLUMN "standardAllowance" TYPE DECIMAL(10, 2);
    ALTER TABLE "SalaryConfig" ALTER COLUMN "performanceBonusRate" TYPE DECIMAL(5, 4);
    ALTER TABLE "SalaryConfig" ALTER COLUMN "ltaRate" TYPE DECIMAL(5, 4);

    CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT PRIMARY KEY,
      "actorId" TEXT,
      "actorEmail" TEXT,
      "action" TEXT NOT NULL,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT,
      "oldValues" JSONB,
      "newValues" JSONB,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId");
    CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
    CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
    CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

    DO $$ BEGIN
      CREATE TYPE "AnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "PayrollAnomaly" (
      "id" TEXT PRIMARY KEY,
      "employeeId" TEXT NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
      "payrollId" TEXT,
      "ruleCode" TEXT NOT NULL,
      "severity" "AnomalySeverity" NOT NULL DEFAULT 'MEDIUM',
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "details" JSONB,
      "isResolved" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS "PayrollAnomaly_employeeId_idx" ON "PayrollAnomaly"("employeeId");
    CREATE INDEX IF NOT EXISTS "PayrollAnomaly_ruleCode_idx" ON "PayrollAnomaly"("ruleCode");
    CREATE INDEX IF NOT EXISTS "PayrollAnomaly_isResolved_idx" ON "PayrollAnomaly"("isResolved");
  `;

  await client.query(sql);
  console.log("✅ SQL migration executed successfully.");
  await client.end();
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
