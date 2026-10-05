import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from "firebase/auth";
import { banco } from "@/lib/banco";
import { obterAppFirebase, obterAppFirebaseSecundario } from "@/lib/firebase/configuracao";
import { somenteNumeros } from "@/lib/utilitarios/formatadores";
import { ErroAutenticacao, type AdaptadorAutenticacao } from "./tiposAutenticacao";

/** Traduz os códigos de erro do Firebase Auth */
function traduzirErro(erro: unknown): ErroAutenticacao {
  const codigo = (erro as { code?: string })?.code ?? "";
  const mensagens: Record<string, string> = {
    "auth/invalid-credential": "E-mail ou senha incorretos",
    "auth/wrong-password": "E-mail ou senha incorretos",
    "auth/user-not-found": "Nenhuma conta com este e-mail",
    "auth/invalid-email": "E-mail inválido",
    "auth/email-already-in-use": "Este e-mail já está cadastrado",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos",
    "auth/network-request-failed": "Sem conexão com a internet",
  };
  return new ErroAutenticacao(mensagens[codigo] ?? "Não foi possível concluir. Tente novamente");
}

export function criarAutenticacaoFirebase(): AdaptadorAutenticacao {
  let instancia: Auth | null = null;
  const auth = () => (instancia ??= getAuth(obterAppFirebase()));

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
          usouExperimental: false,
          ativo: true,
          observacoes: "",
        });
        return uid;
      } catch (erro) {
        throw erro instanceof ErroAutenticacao ? erro : traduzirErro(erro);
      }
    },

    async criarContaPeloProfessor(perfil, senhaInicial) {
      try {
        const authSecundario = getAuth(obterAppFirebaseSecundario());
        const credencial = await createUserWithEmailAndPassword(authSecundario, perfil.email.trim(), senhaInicial);
        await signOut(authSecundario);
        // Gravado com a sessão do professor (regras do Firestore permitem)
        await banco.definir("usuarios", credencial.user.uid, {
          ...perfil,
          email: perfil.email.trim().toLowerCase(),
        });
        return credencial.user.uid;
      } catch (erro) {
        throw traduzirErro(erro);
      }
    },

    async sair() {
      await signOut(auth());
    },

    async enviarRedefinicaoSenha(email) {
      try {
        await sendPasswordResetEmail(auth(), email.trim());
      } catch (erro) {
        throw traduzirErro(erro);
      }
    },

    observarSessao(aoMudar) {
      return onAuthStateChanged(auth(), (usuario) => aoMudar(usuario?.uid ?? null));
    },
  };
}
