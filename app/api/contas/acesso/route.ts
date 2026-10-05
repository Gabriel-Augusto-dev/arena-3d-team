import { bancoAdmin } from "@/lib/servidor/firebaseAdmin";
import { emailConvite } from "@/lib/servidor/modelosEmail";
import {
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
import type { Usuario } from "@/tipos";

/** POST /api/contas/acesso — o administrador reenvia o e-mail de acesso de um aluno ou auxiliar */
export async function POST(request: Request) {
  try {
    await exigirAdministrador(request);
    const { uid } = await lerCorpo<{ uid: string }>(request);
    if (typeof uid !== "string" || !uid) throw new ErroHttp(400, "Conta não informada");

    const documento = await bancoAdmin().collection("usuarios").doc(uid).get();
    const usuario = documento.data() as Usuario | undefined;
    if (!usuario || (usuario.perfil !== "aluno" && usuario.perfil !== "auxiliar")) {
      throw new ErroHttp(404, "Conta não encontrada");
    }
    if (!usuario.ativo) throw new ErroHttp(400, "Reative a conta antes de reenviar o acesso");

    const urlApp = urlDoApp(request);
    const [arena, linkSenha] = await Promise.all([nomeDaArena(), linkCriarSenha(usuario.email, urlApp)]);
    const envio = await tentarEnviar(
      emailConvite({ nome: usuario.nome, email: usuario.email, nomeArena: arena, urlApp, perfil: usuario.perfil, linkSenha }),
      arena,
      linkSenha,
    );
    return responder({ uid, ...envio });
  } catch (erro) {
    return tratarErro(erro);
  }
}
