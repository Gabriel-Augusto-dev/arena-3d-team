import { authAdmin, bancoAdmin } from "@/lib/servidor/firebaseAdmin";
import { emailConfigurado } from "@/lib/servidor/email";
import { emailRedefinirSenha } from "@/lib/servidor/modelosEmail";
import { ErroHttp, lerCorpo, linkCriarSenha, nomeDaArena, responder, tentarEnviar, tratarErro, urlDoApp } from "@/lib/servidor/rotas";

/** Um pedido por e-mail a cada minuto (por instância do servidor) */
const ultimosPedidos = new Map<string, number>();
const INTERVALO_MS = 60_000;

/**
 * POST /api/senha — "Esqueci minha senha". Responde sempre igual, exista
 * a conta ou não (não revela quem é cadastrado). Sem Brevo configurado
 * responde 503 e o app usa o e-mail padrão do Firebase.
 */
export async function POST(request: Request) {
  try {
    const { email: bruto } = await lerCorpo<{ email: string }>(request);
    const email = typeof bruto === "string" ? bruto.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErroHttp(400, "E-mail inválido");
    if (!emailConfigurado()) return responder({ erro: "E-mail não configurado" }, 503);

    const agora = Date.now();
    if (agora - (ultimosPedidos.get(email) ?? 0) < INTERVALO_MS) return responder({ ok: true });
    ultimosPedidos.set(email, agora);
    if (ultimosPedidos.size > 5000) ultimosPedidos.clear();

    let uid: string;
    try {
      const conta = await authAdmin().getUserByEmail(email);
      if (conta.disabled) return responder({ ok: true });
      uid = conta.uid;
    } catch (erro) {
      if ((erro as { code?: string }).code === "auth/user-not-found") return responder({ ok: true });
      throw erro;
    }

    const cadastro = (await bancoAdmin().collection("usuarios").doc(uid).get()).data();
    if (cadastro && cadastro.ativo === false) return responder({ ok: true });

    const urlApp = urlDoApp(request);
    const [arena, linkSenha] = await Promise.all([nomeDaArena(), linkCriarSenha(email, urlApp)]);
    await tentarEnviar(
      emailRedefinirSenha({ nome: (cadastro?.nome as string) || "", email, nomeArena: arena, urlApp, linkSenha }),
      arena,
      null,
    );
    return responder({ ok: true });
  } catch (erro) {
    return tratarErro(erro);
  }
}
