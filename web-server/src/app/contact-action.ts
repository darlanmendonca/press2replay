"use server";

// Estado devolvido ao useActionState do formulario de contacto.
export type ContactState = { error?: string; sent?: boolean };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// Envia o pedido por e-mail via Resend (API REST, sem SDK). Pagina publica:
// nao ha sessao, so honeypot + validacao basica.
export async function sendContactAction(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Honeypot: um bot preenche o campo escondido; fingimos sucesso e nao enviamos.
  if (field(formData, "website")) return { sent: true };

  const name = field(formData, "name");
  const club = field(formData, "club");
  const email = field(formData, "email");
  const phone = field(formData, "phone");
  const message = field(formData, "message");

  if (!name || name.length > 120) return { error: "Indique o seu nome." };
  if (!club || club.length > 120) return { error: "Indique o nome do clube ou campo." };
  if (!EMAIL_PATTERN.test(email) || email.length > 200) return { error: "Indique um e-mail válido." };
  if (phone.length > 40) return { error: "Telemóvel inválido." };
  if (message.length > 3000) return { error: "A mensagem é demasiado longa (máx. 3000 caracteres)." };

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    console.error("contact: RESEND_API_KEY ou CONTACT_TO_EMAIL em falta");
    return { error: "Não foi possível enviar agora. Tente novamente mais tarde." };
  }

  const rows: [string, string][] = [
    ["Nome", name],
    ["Clube / campo", club],
    ["E-mail", email],
    ["Telemóvel", phone || "—"],
  ];
  const html =
    `<table cellpadding="4">${rows
      .map(([k, v]) => `<tr><td><b>${k}</b></td><td>${escapeHtml(v)}</td></tr>`)
      .join("")}</table>` +
    `<p style="white-space:pre-wrap">${escapeHtml(message || "(sem mensagem)")}</p>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL ?? "Press2Replay <onboarding@resend.dev>",
        to: to.split(",").map((a) => a.trim()),
        reply_to: email,
        subject: `Pedido de proposta: ${club}`,
        html,
      }),
    });
    if (!res.ok) {
      console.error("contact: Resend respondeu", res.status, await res.text());
      return { error: "Não foi possível enviar agora. Tente novamente mais tarde." };
    }
  } catch (err) {
    console.error("contact: falha ao chamar o Resend", err);
    return { error: "Não foi possível enviar agora. Tente novamente mais tarde." };
  }

  return { sent: true };
}
