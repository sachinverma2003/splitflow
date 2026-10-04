import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

function setupDatabase(): string {
  // If an external database URL is provided (e.g. Postgres / Supabase / Neon), use it directly
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && !envUrl.startsWith("file:")) {
    return envUrl;
  }

  // When deployed to Vercel/AWS Lambda, the root filesystem is read-only.
  // The only writable directory is /tmp.
  if (process.env.VERCEL) {
    const tmpDbPath = path.join("/tmp", "splitflow.db");
    const possibleSeedPaths = [
      path.join(process.cwd(), "prisma", "dev.db"),
      path.join(__dirname, "prisma", "dev.db"),
      path.join(process.cwd(), ".next", "server", "prisma", "dev.db"),
    ];

    try {
      if (!fs.existsSync(tmpDbPath)) {
        let copied = false;
        for (const seedPath of possibleSeedPaths) {
          if (fs.existsSync(seedPath)) {
            fs.copyFileSync(seedPath, tmpDbPath);
            copied = true;
            break;
          }
        }
        if (!copied) {
          // Fallback: create empty file if not found
          fs.writeFileSync(tmpDbPath, "");
        }
      }
      return `file:${tmpDbPath}`;
    } catch (e) {
      console.error("Error setting up /tmp SQLite database:", e);
    }
  }

  return envUrl || "file:./dev.db";
}

const resolvedUrl = setupDatabase();
process.env.DATABASE_URL = resolvedUrl;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: resolvedUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
