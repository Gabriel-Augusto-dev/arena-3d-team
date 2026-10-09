import nodemailer, { type Transporter } from "nodemailer";

/**
 * Envio de e-mails pelo SMTP do Brevo (smtp-relay.brevo.com, porta 587).
 *
 * No Brevo: Configurações → SMTP e API → aba SMTP
 *  - SMTP_USER (ou BREVO_SMTP_USUARIO) → "Login" (algo como 9a1b2c001@smtp-brevo.com)
 *  - SMTP_PASS (ou BREVO_SMTP_CHAVE)   → uma "Chave SMTP" gerada ali
 *  - EMAIL_REMETENTE                   → remetente VALIDADO em Remetentes, domínios e IPs
 *  - SMTP_HOST / SMTP_PORT             → opcionais (padrão smtp-relay.brevo.com:587)
 */

/** Lê a primeira variável preenchida (aceita os dois jeitos de nomear) */
const env = (...nomes: string[]) => nomes.map((n) => process.env[n]?.trim()).find((v) => !!v) ?? "";

export class ErroEmailNaoConfigurado extends Error {}

let transporte: Transporter | null = null;

function configuracao() {
  return {
    host: env("SMTP_HOST", "BREVO_SMTP_HOST") || "smtp-relay.brevo.com",
    porta: Number(env("SMTP_PORT", "BREVO_SMTP_PORTA") || 587),
    usuario: env("SMTP_USER", "BREVO_SMTP_USUARIO"),
    chave: env("SMTP_PASS", "BREVO_SMTP_CHAVE"),
    remetente: env("EMAIL_REMETENTE"),
    nomeRemetente: env("EMAIL_REMETENTE_NOME"),
  };
}

export function emailConfigurado(): boolean {
  const c = configuracao();
  return !!(c.usuario && c.chave && c.remetente);
}

function obterTransporte(): Transporter {
  if (transporte) return transporte;
  const c = configuracao();
  if (!emailConfigurado()) {
    throw new ErroEmailNaoConfigurado("E-mail não configurado (SMTP_USER, SMTP_PASS, EMAIL_REMETENTE)");
  }
  transporte = nodemailer.createTransport({
    host: c.host,
    port: c.porta,
    secure: c.porta === 465,
    auth: { user: c.usuario, pass: c.chave },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transporte;
}

export interface Mensagem {
  para: string;
  nomeDestinatario?: string;
  assunto: string;
  html: string;
  texto: string;
}

/** Envia um e-mail. `nomeArena` vira o nome do remetente se EMAIL_REMETENTE_NOME estiver vazio */
export async function enviarEmail(mensagem: Mensagem, nomeArena: string): Promise<void> {
  const c = configuracao();
  await obterTransporte().sendMail({
    from: { name: c.nomeRemetente || nomeArena, address: c.remetente },
    to: mensagem.nomeDestinatario ? { name: mensagem.nomeDestinatario, address: mensagem.para } : mensagem.para,
    subject: mensagem.assunto,
    html: mensagem.html,
    text: mensagem.texto,
  });
}
