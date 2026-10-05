import { autenticacao, type DadosPerfilAluno } from "@/lib/autenticacao";
import { banco } from "@/lib/banco";
import type { Usuario } from "@/tipos";
import { somenteNumeros } from "@/lib/utilitarios/formatadores";

export type DadosAluno = Pick<
  Usuario,
  | "nome"
  | "email"
  | "cpf"
  | "dataNascimento"
  | "whatsapp"
  | "plano"
  | "turmaId"
  | "validadeMensalidade"
  | "usouExperimental"
  | "ativo"
  | "observacoes"
>;

function normalizar(dados: DadosAluno): DadosAluno {
  return {
    ...dados,
    nome: dados.nome.trim(),
    email: dados.email.trim().toLowerCase(),
    cpf: somenteNumeros(dados.cpf),
    whatsapp: somenteNumeros(dados.whatsapp),
    turmaId: dados.plano === "mensalista" ? dados.turmaId : null,
    validadeMensalidade: dados.plano === "mensalista" ? dados.validadeMensalidade || null : dados.validadeMensalidade,
  };
}

/** Professor cadastra um aluno (cria a conta de acesso com senha inicial) */
export async function cadastrarAluno(dados: DadosAluno, senhaInicial: string): Promise<string> {
  const perfil: DadosPerfilAluno = { ...normalizar(dados), perfil: "aluno" };
  const uid = await autenticacao.criarContaPeloProfessor(perfil, senhaInicial);
  return uid;
}

export async function atualizarAluno(anterior: Usuario, dados: DadosAluno) {
  const novos = normalizar(dados);
  // E-mail é a chave de login: alterar exige mudar também no Firebase Auth
  const { email: _email, ...semEmail } = novos;
  void _email;
  await banco.atualizar("usuarios", anterior.id, semEmail);
}

export async function alternarAlunoAtivo(aluno: Usuario) {
  await banco.atualizar("usuarios", aluno.id, { ativo: !aluno.ativo });
}

/** O próprio aluno edita seus dados básicos */
export async function atualizarMeuPerfil(
  aluno: Usuario,
  dados: Pick<Usuario, "nome" | "whatsapp" | "dataNascimento">,
) {
  await banco.atualizar("usuarios", aluno.id, {
    nome: dados.nome.trim(),
    whatsapp: somenteNumeros(dados.whatsapp),
    dataNascimento: dados.dataNascimento,
  });
}
