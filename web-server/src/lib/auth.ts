import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

// `venue_staff` (funcionarios da quadra) e a tabela de usuarios do Better
// Auth: o `name` dele e a coluna `first_name`; o resto entra como campos
// extras. Nao existe cadastro publico - so um admin cria funcionarios.
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { ...schema, user: schema.venueStaff },
  }),
  user: {
    modelName: "venueStaff",
    fields: { name: "firstName" },
    additionalFields: {
      lastName: { type: "string", required: true },
      phoneNumber: { type: "string", required: true },
      // Servidor-only: nunca vem do input do cliente.
      isAdmin: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  // O mesmo deployment responde no dominio proprio e no *.vercel.app: aceita os
  // dois pra o login nao falhar por origem diferente do BETTER_AUTH_URL.
  trustedOrigins: ["https://press2replay.com", "https://press2replay.vercel.app"],
  advanced: {
    database: { generateId: () => crypto.randomUUID() },
  },
  plugins: [nextCookies()], // sempre o ultimo
});
