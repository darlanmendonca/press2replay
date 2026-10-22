"use server";

import { createHash } from "node:crypto";
import { and, count, eq, gte } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { contactRequest } from "@/db/schema";

// Estado devolvido ao useActionState do formulario de contacto.
export type ContactState = { error?: string; sent?: boolean };

// Sem `?`, `&`, aspas nem `<>`: o e-mail vira um link `mailto:` no admin, e esses
// caracteres deixariam injetar parametros (cc, body) no link.
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

// Limite por IP: no maximo 3 pedidos em 10 minutos.
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;

// Tira caracteres de controlo (um NUL faz o Postgres falhar) e os de direcao de texto
// (podem fazer um nome parecer outro no admin). Mantem \n e \t so na mensagem.
function clean(value: string, multiline = false) {
  const controls = multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return value.replace(controls, "").replace(/[‪-‮⁦-⁩‎‏]/g, "").trim();
}

function field(formData: FormData, name: string, multiline = false) {
  const value = formData.get(name);
  return typeof value === "string" ? clean(value, multiline) : "";
}

// Hash do IP com um segredo do servidor: serve so para limitar abusos e nao deixa
// o IP em claro na base de dados (dados pessoais, RGPD).
async function clientHash() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const salt = process.env.BETTER_AUTH_SECRET ?? "dev";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

// Guarda o pedido na base de dados (por agora nao envia e-mail; quem trata dos
// pedidos le-os em /admin/contactos). Pagina publica: nao ha sessao, so
// honeypot, validacao, limite por IP e retencao de 12 meses (cron de purge).
export async function sendContactAction(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Honeypot: um bot preenche o campo escondido; fingimos sucesso e nao guardamos.
  if (field(formData, "website")) return { sent: true };

  const name = field(formData, "name");
  const club = field(formData, "club");
  const email = field(formData, "email");
  const message = field(formData, "message", true);

  if (!name || name.length > 120) return { error: "Indique o seu nome." };
  if (!club || club.length > 120) return { error: "Indique o nome do clube ou campo." };
  if (!EMAIL_PATTERN.test(email) || email.length > 200) return { error: "Indique um e-mail válido." };
  if (message.length > 3000) return { error: "A mensagem é demasiado longa (máx. 3000 caracteres)." };

  try {
    const ipHash = await clientHash();
    const since = new Date(Date.now() - RATE_WINDOW_MS);
    const [{ recent }] = await db
      .select({ recent: count() })
      .from(contactRequest)
      .where(and(eq(contactRequest.ipHash, ipHash), gte(contactRequest.createdAt, since)));
    if (recent >= RATE_LIMIT) {
      return { error: "Recebemos vários pedidos seus. Tente novamente dentro de alguns minutos." };
    }
    await db.insert(contactRequest).values({ name, club, email, message, ipHash });
  } catch (err) {
    console.error("contact: falha ao guardar o pedido", err);
    return { error: "Não foi possível enviar agora. Tente novamente mais tarde." };
  }

  return { sent: true };
}
