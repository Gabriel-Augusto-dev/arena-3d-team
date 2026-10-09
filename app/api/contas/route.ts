import { authAdmin, bancoAdmin } from "@/lib/servidor/firebaseAdmin";
import { emailConvite } from "@/lib/servidor/modelosEmail";
import {
  cpfEmUso,
  ErroHttp,
  exigirAdministrador,
  lerCorpo,
  linkCriarSenha,
  nomeDaArena,
  responder,
  tentarEnviar,
  tratarErro,
  urlDoApp,
} from "@/lib/servidor/rotas";
import { validarNovaConta } from "@/lib/servidor/validacaoConta";

/**
 * POST /api/contas — o professor administrador cadastra um aluno ou um
 * professor auxiliar. Cria a conta no Firebase Auth (sem senha), grava
 * `usuarios/{uid}` e manda pelo Brevo o e-mail com o link para criar a senha.
 */
export async function POST(request: Request) {
  try {
    await exigirAdministrador(request);
    const corpo = await lerCorpo<{ perfil: unknown }>(request);
    const perfil = validarNovaConta(corpo.perfil);

    if (perfil.perfil === "aluno" && (await cpfEmUso(perfil.cpf))) {
      throw new ErroHttp(409, "Este CPF já está cadastrado em outra conta");
    }

    if (perfil.perfil === "aluno" && perfil.turmaId) {
      const turma = await bancoAdmin().collection("turmas").doc(perfil.turmaId).get();
      if (!turma.exists) throw new ErroHttp(400, "Turma não encontrada");
    }

    let uid: string;
    try {
      uid = (await authAdmin().createUser({ email: perfil.email, displayName: perfil.nome })).uid;
    } catch (erro) {
      const codigo = (erro as { code?: string }).code;
      if (codigo === "auth/email-already-exists") throw new ErroHttp(409, "Este e-mail já está cadastrado");
      if (codigo === "auth/invalid-email") throw new ErroHttp(400, "E-mail inválido");
      throw erro;
    }

    try {
      const agora = new Date().toISOString();
      await bancoAdmin().collection("usuarios").doc(uid).set({ ...perfil, criadoEm: agora, atualizadoEm: agora });
    } catch (erro) {
      // Não deixa conta "fantasma" no Auth sem o cadastro no banco
      await authAdmin().deleteUser(uid).catch(() => undefined);
      throw erro;
    }

    const urlApp = urlDoApp(request);
    const [arena, linkSenha] = await Promise.all([nomeDaArena(), linkCriarSenha(perfil.email, urlApp)]);
    const envio = await tentarEnviar(
      emailConvite({ nome: perfil.nome, email: perfil.email, nomeArena: arena, urlApp, perfil: perfil.perfil, linkSenha }),
      arena,
      linkSenha,
    );
    return responder({ uid, ...envio }, 201);
  } catch (erro) {
    return tratarErro(erro);
  }
}
