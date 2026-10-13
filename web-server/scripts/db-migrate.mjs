// Aplica as migrations (drizzle/*.sql) no banco apontado por
// DATABASE_URL_UNPOOLED ou DATABASE_URL. Usado no dev (Docker) e no build da
// Vercel (script `vercel-build`).
import { execSync } from "node:child_process";

try {
  process.loadEnvFile(".env.local");
} catch {}

if (!process.env.DATABASE_URL_UNPOOLED && !process.env.DATABASE_URL) {
  // Antes do Postgres da Vercel ser provisionado nao ha banco: nao derruba o
  // build, mas avisa alto. Depois de provisionar, isto passa a migrar.
  console.warn("[db-migrate] ATENCAO: nenhuma DATABASE_URL definida, migrations puladas.");
  process.exit(0);
}

execSync("npx drizzle-kit migrate", { stdio: "inherit" });
