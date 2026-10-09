import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  verifyPasswordResetCode,
} from "firebase/auth";
import { banco } from "@/lib/banco";
import { chamarApi, ErroApi } from "@/lib/api/cliente";
import { obterAuth } from "@/lib/firebase/clientes";
import { somenteNumeros } from "@/lib/utilitarios/formatadores";
import { ErroAutenticacao, type AdaptadorAutenticacao, type ResultadoNovaConta } from "./tiposAutenticacao";

/** Traduz os códigos de erro do Firebase Auth */
function traduzirErro(erro: unknown): ErroAutenticacao {
  if (erro instanceof ErroAutenticacao) return erro;
  if (erro instanceof ErroApi) return new ErroAutenticacao(erro.message);
  const codigo = (erro as { code?: string })?.code ?? "";
  const mensagens: Record<string, string> = {
    "auth/invalid-credential": "E-mail ou senha incorretos",
    "auth/wrong-password": "E-mail ou senha incorretos",
    "auth/user-not-found": "E-mail ou senha incorretos",
    "auth/invalid-email": "E-mail inválido",
    "auth/email-already-in-use": "Este e-mail já está cadastrado. Use “Esqueci minha senha” para entrar",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos",
    "auth/network-request-failed": "Sem conexão com a internet",
    "auth/user-disabled": "Sua conta está desativada. Fale com o professor",
    "auth/expired-action-code": "Este link expirou. Peça um novo em “Esqueci minha senha”",
    "auth/invalid-action-code": "Este link não vale mais. Peça um novo em “Esqueci minha senha”",
  };
  return new ErroAutenticacao(mensagens[codigo] ?? "Não foi possível concluir. Tente novamente");
}

export function criarAutenticacaoFirebase(): AdaptadorAutenticacao {
  const auth = obterAuth;

  return {
    async entrar(email, senha) {
      try {
        const credencial = await signInWithEmailAndPassword(auth(), email.trim(), senha);
        return credencial.user.uid;
      } catch (erro) {
        throw traduzirErro(erro);
      }
    },

    async cadastrarAluno(dados) {
      try {
        const credencial = await createUserWithEmailAndPassword(auth(), dados.email.trim(), dados.senha);
        const uid = credencial.user.uid;
        await banco.definir("usuarios", uid, {
          perfil: "aluno",
          nome: dados.nome.trim(),
          email: dados.email.trim().toLowerCase(),
          cpf: somenteNumeros(dados.cpf),
          dataNascimento: dados.dataNascimento,
          whatsapp: somenteNumeros(dados.whatsapp),
          plano: dados.plano,
          turmaId: dados.plano === "mensalista" ? dados.turmaId : null,
          validadeMensalidade: null,
          turmasIds: dados.plano === "mensalista" && dados.turmaId ? [dados.turmaId] : [],
          validades: {},
          ativo: true,
          emailConfirmado: false,
          observacoes: "",
        });
        return uid;
      } catch (erro) {
        throw traduzirErro(erro);
      }
    },

    async criarContaPeloProfessor(perfil) {
      try {
        return await chamarApi<ResultadoNovaConta>("/api/contas", { perfil });
      } catch (erro) {
        throw traduzirErro(erro);
      }
    },

    async reenviarAcesso(uid) {
      try {
        return await chamarApi<ResultadoNovaConta>("/api/contas/acesso", { uid });
      } catch (erro) {
        throw traduzirErro(erro);
      }
    },

    async sair() {
      await signOut(auth());
    },

    async enviarRedefinicaoSenha(email) {
      try {
        // E-mail com a cara da arena, enviado pelo Brevo
        await chamarApi("/api/senha", { email: email.trim() }, { autenticado: false });
      } catch (erro) {
        // Servidor sem Brevo/Admin configurado: usa o e-mail padrão do Firebase
        if (erro instanceof ErroApi && erro.status === 503) {
          try {
            await sendPasswordResetEmail(auth(), email.trim());
            return;
          } catch (erroFirebase) {
            if ((erroFirebase as { code?: string })?.code === "auth/user-not-found") return;
            throw traduzirErro(erroFirebase);
          }
        }
        throw traduzirErro(erro);
      }
    },

    async verificarCodigoSenha(codigo) {
      try {
        return await verifyPasswordResetCode(auth(), codigo);
      } catch (erro) {
        throw traduzirErro(erro);
      }
    },

    async definirSenha(codigo, novaSenha) {
      try {
        await confirmPasswordReset(auth(), codigo, novaSenha);
      } catch (erro) {
        throw traduzirErro(erro);
      }
    },

    async confirmarEmail(codigo) {
      try {
        const info = await checkActionCode(auth(), codigo);
        await applyActionCode(auth(), codigo);
        return info.data.email ?? "";
      } catch (erro) {
        const codigoErro = (erro as { code?: string })?.code ?? "";
        if (codigoErro === "auth/expired-action-code" || codigoErro === "auth/invalid-action-code") {
          throw new ErroAutenticacao("Este link não vale mais. Entre no app e toque em “Reenviar e-mail”");
        }
        throw traduzirErro(erro);
      }
    },

    observarSessao(aoMudar) {
      return onAuthStateChanged(auth(), (usuario) => aoMudar(usuario?.uid ?? null));
    },
  };
}
