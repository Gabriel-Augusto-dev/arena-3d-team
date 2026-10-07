import type { Mensagem } from "./email";

/**
 * Modelos dos e-mails transacionais (HTML simples com estilos inline,
 * que funciona no Gmail, Outlook e apps de celular).
 */

const CORES = {
  marinho: "#041533",
  azul: "#1e4589",
  laranja: "#ee510e",
  fundo: "#f0f2f6",
  tinta: "#0b1a33",
  suave: "#5a6780",
};

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? "";

interface Layout {
  nomeArena: string;
  urlApp: string;
  titulo: string;
  /** Parágrafos já escapados (podem ter <strong>) */
  paragrafos: string[];
  botao?: { texto: string; link: string };
  rodape?: string;
}

function layout({ nomeArena, urlApp, titulo, paragrafos, botao, rodape }: Layout): string {
  const arena = escapar(nomeArena);
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(titulo)}</title></head>
<body style="margin:0;padding:0;background:${CORES.fundo};font-family:Arial,Helvetica,sans-serif;color:${CORES.tinta}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CORES.fundo};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden">
        <tr><td style="background:${CORES.marinho};padding:20px 24px">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px"><img src="${urlApp}/apple-icon.png" width="44" height="44" alt="" style="display:block;border-radius:10px"></td>
            <td style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:.5px;text-transform:uppercase">${arena}</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 24px 8px">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${CORES.tinta}">${escapar(titulo)}</h1>
          ${paragrafos.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${CORES.tinta}">${p}</p>`).join("\n          ")}
        </td></tr>
        ${
          botao
            ? `<tr><td style="padding:8px 24px 24px">
          <a href="${botao.link}" style="display:inline-block;background:${CORES.laranja};color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:12px">${escapar(botao.texto)}</a>
          <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:${CORES.suave}">Se o botão não abrir, copie e cole no navegador:<br><a href="${botao.link}" style="color:${CORES.azul};word-break:break-all">${botao.link}</a></p>
        </td></tr>`
            : ""
        }
        <tr><td style="padding:16px 24px 24px;border-top:1px solid ${CORES.fundo}">
          <p style="margin:0;font-size:12px;line-height:1.5;color:${CORES.suave}">${rodape ? `${rodape}<br>` : ""}${arena} · <a href="${urlApp}" style="color:${CORES.azul}">${escapar(urlApp.replace(/^https?:\/\//, ""))}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

interface Base {
  nome: string;
  email: string;
  nomeArena: string;
  urlApp: string;
}

/** Conta criada pelo professor: link para a pessoa criar a própria senha */
export function emailConvite({
  nome,
  email,
  nomeArena,
  urlApp,
  perfil,
  linkSenha,
}: Base & { perfil: "aluno" | "auxiliar"; linkSenha: string }): Mensagem {
  const arena = escapar(nomeArena);
  const oQueFaz =
    perfil === "auxiliar"
      ? `Você foi cadastrado como <strong>professor auxiliar</strong> no app da ${arena}. Por lá você acompanha os alunos, as aulas, a lista de presença e quem já pagou.`
      : `Seu cadastro na <strong>${arena}</strong> está pronto. Pelo app você marca presença nas aulas e paga pelo PIX.`;
  return {
    para: email,
    nomeDestinatario: nome,
    assunto: `Seu acesso ao app da ${nomeArena}`,
    html: layout({
      nomeArena,
      urlApp,
      titulo: `Bem-vindo, ${primeiroNome(nome)}!`,
      paragrafos: [
        oQueFaz,
        `Para entrar, crie sua senha no botão abaixo. Seu login é <strong>${escapar(email)}</strong>.`,
      ],
      botao: { texto: "Criar minha senha", link: linkSenha },
      rodape:
        "O link vale por 1 hora. Se expirar, abra o app e toque em “Esqueci minha senha” para receber outro.",
    }),
    texto:
      `Bem-vindo, ${primeiroNome(nome)}!\n\n` +
      (perfil === "auxiliar"
        ? `Você foi cadastrado como professor auxiliar no app da ${nomeArena}.\n`
        : `Seu cadastro na ${nomeArena} está pronto.\n`) +
      `Seu login é ${email}. Crie sua senha por este link (vale por 1 hora):\n${linkSenha}\n\n` +
      `Se expirar, abra ${urlApp} e toque em "Esqueci minha senha".`,
  };
}

/** Aluno que se cadastrou sozinho */
export function emailBoasVindas({
  nome,
  email,
  nomeArena,
  urlApp,
  plano,
}: Base & { plano: "mensalista" | "avulso" }): Mensagem {
  const arena = escapar(nomeArena);
  const comoFunciona =
    plano === "mensalista"
      ? "Você escolheu ser <strong>mensalista</strong>. Assim que o professor confirmar o primeiro pagamento, suas aulas da turma ficam liberadas sem custo. Até lá, dá para treinar pagando o Day Use."
      : "Você vai treinar com <strong>Day Use</strong>: marca presença na aula que quiser e paga pelo PIX até a meia-noite do dia da aula.";
  return {
    para: email,
    nomeDestinatario: nome,
    assunto: `Bem-vindo à ${nomeArena}!`,
    html: layout({
      nomeArena,
      urlApp,
      titulo: `Bem-vindo, ${primeiroNome(nome)}!`,
      paragrafos: [
        `Sua conta na <strong>${arena}</strong> foi criada.`,
        comoFunciona,
        "Antes de cada treino, abra o app e toque em <strong>Vou</strong> para marcar presença.",
      ],
      botao: { texto: "Abrir o app", link: `${urlApp}/entrar` },
    }),
    texto:
      `Bem-vindo, ${primeiroNome(nome)}!\n\nSua conta na ${nomeArena} foi criada.\n` +
      (plano === "mensalista"
        ? "Assim que o professor confirmar o primeiro pagamento, suas aulas da turma ficam liberadas.\n"
        : "Marque presença na aula que quiser e pague o Day Use pelo PIX até a meia-noite do dia da aula.\n") +
      `\nAbra o app: ${urlApp}/entrar`,
  };
}

/** "Esqueci minha senha" */
export function emailRedefinirSenha({ nome, email, nomeArena, urlApp, linkSenha }: Base & { linkSenha: string }): Mensagem {
  return {
    para: email,
    nomeDestinatario: nome,
    assunto: `Crie uma senha nova — ${nomeArena}`,
    html: layout({
      nomeArena,
      urlApp,
      titulo: "Senha nova",
      paragrafos: [
        `Oi${nome.trim() ? `, ${escapar(primeiroNome(nome))}` : ""}! Recebemos um pedido para criar uma senha nova para <strong>${escapar(email)}</strong>.`,
        "Se foi você, toque no botão abaixo. Se não foi, pode ignorar este e-mail: sua senha atual continua valendo.",
      ],
      botao: { texto: "Criar senha nova", link: linkSenha },
      rodape: "O link vale por 1 hora.",
    }),
    texto:
      `Oi${nome.trim() ? `, ${primeiroNome(nome)}` : ""}! Recebemos um pedido para criar uma senha nova para ${email}.\n\n` +
      `Crie sua senha por este link (vale por 1 hora):\n${linkSenha}\n\n` +
      "Se não foi você, ignore este e-mail.",
  };
}
