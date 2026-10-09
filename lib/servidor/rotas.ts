import { authAdmin, bancoAdmin, ErroConfiguracao } from "./firebaseAdmin";
import { emailConfigurado, enviarEmail, type Mensagem } from "./email";
import type { Usuario } from "@/tipos";

/** Erro com status HTTP e mensagem pronta para a tela */
export class ErroHttp extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export const responder = (dados: unknown, status = 200) => Response.json(dados, { status });

export function tratarErro(erro: unknown): Response {
  if (erro instanceof ErroHttp) return responder({ erro: erro.message }, erro.status);
  if (erro instanceof ErroConfiguracao) {
    console.error("[api] configuração:", erro.message);
    return responder({ erro: erro.message }, 503);
  }
  console.error("[api] erro inesperado:", erro);
  // Código do erro (ex.: do Firebase) ajuda a descobrir a causa sem expor detalhes
  const codigo = (erro as { code?: unknown } | null)?.code;
  const sufixo = typeof codigo === "string" || typeof codigo === "number" ? ` (código ${codigo})` : "";
  return responder({ erro: `Não foi possível concluir. Tente novamente${sufixo}` }, 500);
}

export async function lerCorpo<T>(request: Request): Promise<Partial<T>> {
  try {
    return ((await request.json()) ?? {}) as Partial<T>;
  } catch {
    throw new ErroHttp(400, "Requisição inválida");
  }
}

/** Endereço público do app (links dos e-mails). URL_APP tem prioridade sobre o domínio da requisição */
export function urlDoApp(request: Request): string {
  const configurada = process.env.URL_APP?.trim().replace(/\/+$/, "");
  if (configurada) return configurada;
  // Endereço que o navegador está usando (no "npm run dev:celular" o servidor escuta em 0.0.0.0)
  const origem = request.headers.get("origin");
  if (origem && !origem.includes("0.0.0.0")) return origem;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host && !host.startsWith("0.0.0.0")) {
    const protocolo = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
    return `${protocolo}://${host}`;
  }
  return new URL(request.url).origin.replace("0.0.0.0", "localhost");
}

/** Confere o token do Firebase enviado pelo app e carrega o usuário */
export async function usuarioDaRequisicao(request: Request): Promise<Usuario> {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new ErroHttp(401, "Sua sessão expirou. Entre de novo");
  let uid: string;
  try {
    uid = (await authAdmin().verifyIdToken(token)).uid;
  } catch (erro) {
    if (erro instanceof ErroConfiguracao) throw erro;
    throw new ErroHttp(401, "Sua sessão expirou. Entre de novo");
  }
  const documento = await bancoAdmin().collection("usuarios").doc(uid).get();
  if (!documento.exists) throw new ErroHttp(403, "Conta sem cadastro na arena");
  const usuario = { ...(documento.data() as Omit<Usuario, "id">), id: uid };
  if (!usuario.ativo) throw new ErroHttp(403, "Sua conta está desativada");
  return usuario;
}

/** Só o professor administrador */
export async function exigirAdministrador(request: Request): Promise<Usuario> {
  const usuario = await usuarioDaRequisicao(request);
  if (usuario.perfil !== "professor") throw new ErroHttp(403, "Só o professor responsável pode fazer isso");
  return usuario;
}

export async function nomeDaArena(): Promise<string> {
  try {
    const config = await bancoAdmin().collection("configuracoes").doc("geral").get();
    return (config.data()?.nomeArena as string | undefined)?.trim() || "3D Team";
  } catch {
    return "3D Team";
  }
}

/**
 * Link para criar/trocar a senha. Gera o código pelo Firebase Admin e monta
 * o endereço da nossa própria tela (/criar-senha), com a cara do app.
 */
export async function linkCriarSenha(email: string, urlApp: string): Promise<string> {
  const linkFirebase = await authAdmin().generatePasswordResetLink(email);
  const codigo = new URL(linkFirebase).searchParams.get("oobCode");
  if (!codigo) return linkFirebase;
  return `${urlApp}/criar-senha?codigo=${encodeURIComponent(codigo)}`;
}

/**
 * Link para confirmar o e-mail do aluno que se cadastrou sozinho. Gera o código
 * pelo Firebase Admin e aponta para a nossa tela (/confirmar-email).
 */
export async function linkConfirmarEmail(email: string, urlApp: string): Promise<string> {
  const linkFirebase = await authAdmin().generateEmailVerificationLink(email);
  const codigo = new URL(linkFirebase).searchParams.get("oobCode");
  if (!codigo) return linkFirebase;
  return `${urlApp}/confirmar-email?codigo=${encodeURIComponent(codigo)}`;
}

/** Marca no cadastro que o e-mail foi confirmado (libera o acesso do aluno; no professor só mostra o selo) */
export async function marcarEmailConfirmado(uid: string): Promise<void> {
  const referencia = bancoAdmin().collection("usuarios").doc(uid);
  const documento = await referencia.get();
  if (documento.exists && documento.data()?.emailConfirmado !== true) {
    await referencia.update({ emailConfirmado: true, atualizadoEm: new Date().toISOString() });
  }
}

export interface ResultadoEnvio {
  emailEnviado: boolean;
  /** Só volta quando o e-mail não saiu, para o professor mandar pelo WhatsApp */
  linkSenha: string | null;
}

/** Tenta mandar o e-mail; se o Brevo não estiver configurado ou falhar, devolve o link */
export async function tentarEnviar(mensagem: Mensagem, nomeArena: string, linkReserva: string | null): Promise<ResultadoEnvio> {
  if (!emailConfigurado()) {
    console.warn("[email] Brevo não configurado: e-mail não enviado para", mensagem.para);
    return { emailEnviado: false, linkSenha: linkReserva };
  }
  try {
    await enviarEmail(mensagem, nomeArena);
    return { emailEnviado: true, linkSenha: null };
  } catch (erro) {
    console.error("[email] falha ao enviar para", mensagem.para, erro);
    return { emailEnviado: false, linkSenha: linkReserva };
  }
}
