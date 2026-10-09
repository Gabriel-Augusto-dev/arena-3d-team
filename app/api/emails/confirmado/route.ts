import { authAdmin } from "@/lib/servidor/firebaseAdmin";
import { ErroHttp, lerCorpo, marcarEmailConfirmado, responder, tratarErro } from "@/lib/servidor/rotas";

/**
 * POST /api/emails/confirmado — depois que o link do e-mail foi aberto, confere
 * no Firebase se o e-mail está mesmo confirmado e libera o acesso no cadastro.
 * Não precisa estar logado: o link pode ser aberto em outro aparelho.
 * Só muda algo quando o Firebase confirma, então não dá para burlar.
 */
export async function POST(request: Request) {
  try {
    const { email: bruto } = await lerCorpo<{ email: string }>(request);
    const email = typeof bruto === "string" ? bruto.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErroHttp(400, "E-mail inválido");

    let conta;
    try {
      conta = await authAdmin().getUserByEmail(email);
    } catch (erro) {
      if ((erro as { code?: string }).code === "auth/user-not-found") return responder({ confirmado: false });
      throw erro;
    }
    if (!conta.emailVerified) return responder({ confirmado: false });
    await marcarEmailConfirmado(conta.uid);
    return responder({ confirmado: true });
  } catch (erro) {
    return tratarErro(erro);
  }
}
