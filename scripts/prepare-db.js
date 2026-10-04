const fs = require("fs");
const path = require("path");

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

let dbUrl = process.env.DATABASE_URL || "";

if (!dbUrl) {
  const envFiles = [".env.local", ".env.production", ".env"];
  for (const file of envFiles) {
    const p = path.join(__dirname, "..", file);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf8");
      const match = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
      if (match) {
        dbUrl = match[1];
        break;
      }
    }
  }
}

const isPostgres = dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://");

if (isPostgres) {
  console.log("⚡ Configuring Prisma schema for PostgreSQL database...");
  schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  schema = schema.replace(/url\s*=\s*"file:\.\/dev\.db"/g, 'url      = env("DATABASE_URL")');
} else {
  console.log("📦 Configuring Prisma schema for SQLite database...");
  schema = schema.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  schema = schema.replace(/url\s*=\s*env\("DATABASE_URL"\)/g, 'url      = "file:./dev.db"');
}

fs.writeFileSync(schemaPath, schema);
console.log("✔ Prisma schema prepared successfully.");
