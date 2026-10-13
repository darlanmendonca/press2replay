import { defineConfig } from "drizzle-kit";

// drizzle-kit roda fora do Next, entao carrega o .env.local aqui.
try {
  process.loadEnvFile(".env.local");
} catch {
  // sem .env.local: usa o que ja estiver no ambiente (Docker, Vercel)
}

// Migrations usam a URL *sem pooling* (conexao direta) quando existir - a
// Vercel/Neon a expoe como DATABASE_URL_UNPOOLED. Em runtime o app usa a
// DATABASE_URL (com pooling).
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL nao configurada (ver web-server/.env.example)");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
