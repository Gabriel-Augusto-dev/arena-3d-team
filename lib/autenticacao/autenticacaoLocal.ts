import { banco } from "@/lib/banco";
import { gerarDadosIniciais } from "@/lib/dados/dadosIniciais";
import { gerarId } from "@/lib/utilitarios/identificadores";
import { somenteNumeros } from "@/lib/utilitarios/formatadores";
import { ErroAutenticacao, type AdaptadorAutenticacao } from "./tiposAutenticacao";

/**
 * Autenticação de demonstração. As contas ficam no localStorage e a
 * sessão no sessionStorage (cada aba pode ter um usuário diferente —
 * dá para testar professor e aluno lado a lado).
 *
 * ATENÇÃO: senhas em texto puro, apenas para demonstração. Com o
 * Firebase ativado, quem cuida disso é o Firebase Auth.
 */

const CHAVE_CONTAS = "arena3d:contas:v2";
const CHAVE_SESSAO = "arena3d:sessao";

interface ContaLocal {
  uid: string;
  email: string;
  senha: string;
}

const ouvintes = new Set<(uid: string | null) => void>();

function lerContas(): ContaLocal[] {
  const salvo = window.localStorage.getItem(CHAVE_CONTAS);
  if (salvo) return JSON.parse(salvo) as ContaLocal[];
  const contas = gerarDadosIniciais().contas;
  window.localStorage.setItem(CHAVE_CONTAS, JSON.stringify(contas));
  return contas;
}

function salvarContas(contas: ContaLocal[]) {
  window.localStorage.setItem(CHAVE_CONTAS, JSON.stringify(contas));
}

function definirSessao(uid: string | null) {
  if (uid) window.sessionStorage.setItem(CHAVE_SESSAO, uid);
  else window.sessionStorage.removeItem(CHAVE_SESSAO);
  ouvintes.forEach((avisar) => avisar(uid));
}

const normalizarEmail = (email: string) => email.trim().toLowerCase();

function garantirEmailLivre(email: string) {
  if (lerContas().some((c) => c.email === normalizarEmail(email))) {
    throw new ErroAutenticacao("Este e-mail já está cadastrado");
  }
}

export function criarAutenticacaoLocal(): AdaptadorAutenticacao {
  return {
    async entrar(email, senha) {
      await new Promise((r) => setTimeout(r, 350));
      const conta = lerContas().find((c) => c.email === normalizarEmail(email));
      if (!conta || conta.senha !== senha) throw new ErroAutenticacao("E-mail ou senha incorretos");
      definirSessao(conta.uid);
      return conta.uid;
    },

    async cadastrarAluno(dados) {
      garantirEmailLivre(dados.email);
      const uid = gerarId();
      await banco.definir("usuarios", uid, {
        perfil: "aluno",
        nome: dados.nome.trim(),
        email: normalizarEmail(dados.email),
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
      salvarContas([...lerContas(), { uid, email: normalizarEmail(dados.email), senha: dados.senha }]);
      definirSessao(uid);
      return uid;
    },

    async criarContaPeloProfessor(perfil, senhaInicial) {
      garantirEmailLivre(perfil.email);
      const uid = gerarId();
      await banco.definir("usuarios", uid, { ...perfil, email: normalizarEmail(perfil.email) });
      salvarContas([...lerContas(), { uid, email: normalizarEmail(perfil.email), senha: senhaInicial }]);
      return uid;
    },

    async sair() {
      definirSessao(null);
    },

    async enviarRedefinicaoSenha(email) {
      await new Promise((r) => setTimeout(r, 300));
      if (!lerContas().some((c) => c.email === normalizarEmail(email))) {
        throw new ErroAutenticacao("Nenhuma conta com este e-mail");
      }
    },

    observarSessao(aoMudar) {
      ouvintes.add(aoMudar);
      queueMicrotask(() => aoMudar(window.sessionStorage.getItem(CHAVE_SESSAO)));
      return () => ouvintes.delete(aoMudar);
    },
  };
}

export function apagarContasLocais() {
  window.localStorage.removeItem(CHAVE_CONTAS);
}
