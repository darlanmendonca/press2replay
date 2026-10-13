// Cria (ou reaproveita) um funcionario ADMIN, pra conseguir o primeiro login -
// nao existe cadastro publico. Uso:
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... [ADMIN_FIRST_NAME=.. ADMIN_LAST_NAME=.. ADMIN_PHONE=..] npm run db:create-admin
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { venueStaff } from "../src/db/schema";
import { auth } from "../src/lib/auth";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error("Defina ADMIN_EMAIL e ADMIN_PASSWORD.");
  process.exit(1);
}

async function main(email: string, password: string) {
  const existing = await db.select().from(venueStaff).where(eq(venueStaff.email, email));
  if (existing.length > 0) {
    console.log(`Ja existe um funcionario com ${email}; nada a fazer.`);
    return;
  }

  // Usa o internalAdapter (sem passar pelo `disableSignUp`, que vale so pra
  // rota publica) e o hash de senha do proprio Better Auth.
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.createUser(
    {
      email,
      name: process.env.ADMIN_FIRST_NAME ?? "Admin",
      lastName: process.env.ADMIN_LAST_NAME ?? "Press2Replay",
      phoneNumber: process.env.ADMIN_PHONE ?? "",
      isAdmin: true,
      emailVerified: true,
    },
    { method: "admin" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash(password),
  });
  console.log(`Admin criado: ${email}`);
}

main(email, password)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
