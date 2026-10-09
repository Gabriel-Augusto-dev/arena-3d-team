import { authAdmin, bancoAdmin } from "@/lib/servidor/firebaseAdmin";
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

const texto = (valor: unknown, maximo = 200) => (typeof valor === "string" ? valor.trim().slice(0, maximo) : "");

/**
 * POST /api/contas/meus-dados — o professor administrador edita os próprios
 * dados (nome, e-mail, WhatsApp). Se o e-mail mudar, o login passa a ser o
 * novo e-mail: a sessão atual é encerrada e o dono do novo e-mail recebe o
 * link para criar a própria senha (a senha antiga deixa de valer).
 */
export async function POST(request: Request) {
  try {
    const professor = await exigirAdministrador(request);
    const corpo = await lerCorpo<{ nome: unknown; email: unknown; whatsapp: unknown }>(request);

    const nome = texto(corpo.nome, 120);
    const email = texto(corpo.email).toLowerCase();
    const whatsapp = texto(corpo.whatsapp, 40).replace(/\D/g, "");
    if (nome.split(/\s+/).length < 2) throw new ErroHttp(400, "Informe nome e sobrenome");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErroHttp(400, "E-mail inválido");
    if (whatsapp && whatsapp.length !== 10 && whatsapp.length !== 11) throw new ErroHttp(400, "WhatsApp com DDD");

    const emailMudou = email !== professor.email.trim().toLowerCase();

    try {
      await authAdmin().updateUser(professor.id, {
        displayName: nome,
        ...(emailMudou ? { email, emailVerified: false } : {}),
      });
    } catch (erro) {
      const codigo = (erro as { code?: string }).code;
      if (codigo === "auth/email-already-exists") throw new ErroHttp(409, "Este e-mail já está em outra conta");
      if (codigo === "auth/invalid-email") throw new ErroHttp(400, "E-mail inválido");
      throw erro;
    }

    await bancoAdmin()
      .collection("usuarios")
      .doc(professor.id)
      .update({ nome, email, whatsapp, atualizadoEm: new Date().toISOString() });

    if (!emailMudou) return responder({ emailMudou: false, emailEnviado: false, linkSenha: null });

    // Troca a senha por uma aleatória: só quem tem acesso ao novo e-mail consegue entrar
    await authAdmin().updateUser(professor.id, { password: crypto.randomUUID() + crypto.randomUUID() });
    await authAdmin().revokeRefreshTokens(professor.id);

    const urlApp = urlDoApp(request);
    const [arena, linkSenha] = await Promise.all([nomeDaArena(), linkCriarSenha(email, urlApp)]);
    const envio = await tentarEnviar(
      emailConvite({ nome, email, nomeArena: arena, urlApp, perfil: "professor", linkSenha }),
      arena,
      linkSenha,
    );
    return responder({ emailMudou: true, ...envio });
  } catch (erro) {
    return tratarErro(erro);
  }
}
