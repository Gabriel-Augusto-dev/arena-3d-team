import { authAdmin } from "@/lib/servidor/firebaseAdmin";
import { emailConfigurado } from "@/lib/servidor/email";
import { emailConfirmacao } from "@/lib/servidor/modelosEmail";
import {
  ErroHttp,
  linkConfirmarEmail,
  marcarEmailConfirmado,
  nomeDaArena,
  responder,
  tentarEnviar,
  tratarErro,
  urlDoApp,
  usuarioDaRequisicao,
} from "@/lib/servidor/rotas";

/** Um reenvio por conta a cada minuto (por instância do servidor) */
const ultimosPedidos = new Map<string, number>();
const INTERVALO_MS = 60_000;

/**
 * POST /api/emails/confirmacao — reenvia o link de confirmação para o aluno logado.
 * Se ele já confirmou (ou o e-mail não está configurado), libera o acesso.
 */
export async function POST(request: Request) {
  try {
    const usuario = await usuarioDaRequisicao(request);
    if (usuario.emailConfirmado !== false) return responder({ confirmado: true });

    const conta = await authAdmin().getUser(usuario.id);
    if (conta.emailVerified || !emailConfigurado()) {
      await marcarEmailConfirmado(usuario.id);
      return responder({ confirmado: true });
    }

    const agora = Date.now();
    if (agora - (ultimosPedidos.get(usuario.id) ?? 0) < INTERVALO_MS) {
      throw new ErroHttp(429, "Aguarde um minuto para pedir outro e-mail");
    }
    ultimosPedidos.set(usuario.id, agora);
    if (ultimosPedidos.size > 5000) ultimosPedidos.clear();

    const urlApp = urlDoApp(request);
    const [arena, linkConfirmacao] = await Promise.all([nomeDaArena(), linkConfirmarEmail(usuario.email, urlApp)]);
    const envio = await tentarEnviar(
      emailConfirmacao({ nome: usuario.nome, email: usuario.email, nomeArena: arena, urlApp, linkConfirmacao }),
      arena,
      null,
    );
    if (!envio.emailEnviado) throw new ErroHttp(502, "Não foi possível enviar o e-mail agora. Tente de novo em instantes");
    return responder({ confirmado: false, emailEnviado: true });
  } catch (erro) {
    return tratarErro(erro);
  }
}
