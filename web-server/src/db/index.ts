import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Serverless (Vercel): cada instancia da funcao abre poucas conexoes, entao
// `max: 1`, e usamos a URL *com pooling* do provedor (Neon: host `-pooler`).
// `prepare: false` e necessario atras de um pooler em modo transaction
// (PgBouncer). TLS vem do `?sslmode=require` da URL do Neon; o Postgres local
// nao usa TLS.
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL nao configurada (ver web-server/.env.example)");
  }
  return drizzle(postgres(url, { max: 1, prepare: false }), { schema });
}

type Db = ReturnType<typeof createDb>;

// Em dev o hot reload reavalia este modulo; sem cache cada reload deixaria
// uma conexao aberta no Postgres.
const globalForDb = globalThis as unknown as { drizzleDb?: Db };

function getDb(): Db {
  if (globalForDb.drizzleDb) return globalForDb.drizzleDb;
  const instance = createDb();
  globalForDb.drizzleDb = instance; // tambem em prod: reaproveita entre invocacoes da mesma instancia
  return instance;
}

// Conexao preguicosa: so valida a DATABASE_URL e conecta na primeira consulta.
// Assim o `next build` (que importa as rotas) nao exige banco - importante
// enquanto o Postgres da Vercel ainda nao foi provisionado.
export const db = new Proxy({} as Db, {
  get: (_target, prop) => Reflect.get(getDb(), prop),
});
