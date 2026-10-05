import { emailBoasVindas } from "@/lib/servidor/modelosEmail";
import { nomeDaArena, responder, tentarEnviar, tratarErro, urlDoApp, usuarioDaRequisicao } from "@/lib/servidor/rotas";

/** Só manda para contas criadas há pouco (evita reenvio repetido) */
const JANELA_MINUTOS = 15;

/** POST /api/emails/boas-vindas — o aluno que acabou de se cadastrar recebe as boas-vindas */
export async function POST(request: Request) {
  try {
    const usuario = await usuarioDaRequisicao(request);
    const minutos = (Date.now() - new Date(usuario.criadoEm).getTime()) / 60000;
    if (usuario.perfil !== "aluno" || !(minutos >= 0 && minutos <= JANELA_MINUTOS)) {
      return responder({ emailEnviado: false });
    }
    const urlApp = urlDoApp(request);
    const arena = await nomeDaArena();
    const envio = await tentarEnviar(
      emailBoasVindas({ nome: usuario.nome, email: usuario.email, nomeArena: arena, urlApp, plano: usuario.plano }),
      arena,
      null,
    );
    return responder({ emailEnviado: envio.emailEnviado });
  } catch (erro) {
    return tratarErro(erro);
  }
}
