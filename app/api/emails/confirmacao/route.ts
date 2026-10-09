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
 * POST /api/emails/confirmacao — envia o link de confirmação para quem está logado:
 * o aluno que se cadastrou sozinho (bloqueado até confirmar) ou o professor,
 * pela tela "Meus dados". Se o e-mail já está confirmado no Firebase, só marca.
 */
export async function POST(request: Request) {
  try {
    const usuario = await usuarioDaRequisicao(request);
    const aluno = usuario.perfil === "aluno";
    // Aluno sem o campo foi cadastrado pelo professor: não precisa confirmar
    if (usuario.emailConfirmado === true || (aluno && usuario.emailConfirmado === undefined)) {
      return responder({ confirmado: true });
    }

    const conta = await authAdmin().getUser(usuario.id);
    // Sem o Brevo configurado o aluno não ficaria preso: libera direto
    if (conta.emailVerified || (aluno && !emailConfigurado())) {
      await marcarEmailConfirmado(usuario.id);
      return responder({ confirmado: true });
    }
    if (!emailConfigurado()) {
      throw new ErroHttp(503, "O envio de e-mails ainda não está configurado (EMAIL_REMETENTE e SMTP na Vercel)");
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
