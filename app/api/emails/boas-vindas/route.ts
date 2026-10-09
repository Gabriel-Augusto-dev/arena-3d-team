import { emailConfigurado } from "@/lib/servidor/email";
import { emailBoasVindas } from "@/lib/servidor/modelosEmail";
import {
  linkConfirmarEmail,
  marcarEmailConfirmado,
  nomeDaArena,
  responder,
  tentarEnviar,
  tratarErro,
  urlDoApp,
  usuarioDaRequisicao,
} from "@/lib/servidor/rotas";

/** Só manda para contas criadas há pouco (evita reenvio repetido) */
const JANELA_MINUTOS = 15;

/**
 * POST /api/emails/boas-vindas — o aluno que acabou de se cadastrar recebe as
 * boas-vindas com o link para confirmar o e-mail. Sem o Brevo configurado não
 * há como confirmar: a conta é liberada direto para ninguém ficar travado.
 */
export async function POST(request: Request) {
  try {
    const usuario = await usuarioDaRequisicao(request);
    const minutos = (Date.now() - new Date(usuario.criadoEm).getTime()) / 60000;
    if (usuario.perfil !== "aluno" || !(minutos >= 0 && minutos <= JANELA_MINUTOS)) {
      return responder({ emailEnviado: false });
    }
    if (!emailConfigurado()) {
      await marcarEmailConfirmado(usuario.id);
      return responder({ emailEnviado: false });
    }
    const urlApp = urlDoApp(request);
    const [arena, linkConfirmacao] = await Promise.all([
      nomeDaArena(),
      usuario.emailConfirmado === false ? linkConfirmarEmail(usuario.email, urlApp) : Promise.resolve(null),
    ]);
    const envio = await tentarEnviar(
      emailBoasVindas({ nome: usuario.nome, email: usuario.email, nomeArena: arena, urlApp, plano: usuario.plano, linkConfirmacao }),
      arena,
      null,
    );
    return responder({ emailEnviado: envio.emailEnviado });
  } catch (erro) {
    return tratarErro(erro);
  }
}
