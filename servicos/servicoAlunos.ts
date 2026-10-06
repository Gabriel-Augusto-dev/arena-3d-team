import { autenticacao, type DadosPerfilConta, type ResultadoNovaConta } from "@/lib/autenticacao";
import { banco } from "@/lib/banco";
import { chamarApi } from "@/lib/api/cliente";
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
  | "associado"
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
    associado: !!dados.associado,
    validadeMensalidade: dados.plano === "mensalista" ? dados.validadeMensalidade || null : dados.validadeMensalidade,
  };
}

/**
 * Professor cadastra um aluno. A conta é criada pelo servidor e o aluno
 * recebe um e-mail (Brevo) com o link para criar a própria senha.
 */
export async function cadastrarAluno(dados: DadosAluno): Promise<ResultadoNovaConta> {
  const perfil: DadosPerfilConta = { ...normalizar(dados), perfil: "aluno" };
  return autenticacao.criarContaPeloProfessor(perfil);
}

/** Manda de novo o e-mail com o link para criar/trocar a senha */
export async function reenviarAcesso(uid: string): Promise<ResultadoNovaConta> {
  return autenticacao.reenviarAcesso(uid);
}

export async function atualizarAluno(anterior: Usuario, dados: DadosAluno) {
  const novos = normalizar(dados);
  // E-mail é a chave de login: alterar exige mudar também no Firebase Auth
  const { email: _email, ...semEmail } = novos;
  void _email;
  await banco.atualizar("usuarios", anterior.id, semEmail);
}

/** Ativa/desativa a conta (aluno ou professor auxiliar). Desativado não entra mais */
export async function alternarAlunoAtivo(usuario: Usuario) {
  await banco.atualizar("usuarios", usuario.id, { ativo: !usuario.ativo });
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

/**
 * Marca/desmarca o aluno como associado. O administrador muda qualquer
 * aluno; o professor auxiliar só os alunos dele (o servidor confere).
 */
export async function definirAssociado(aluno: Usuario, associado: boolean) {
  await chamarApi("/api/alunos/associado", { alunoId: aluno.id, associado });
}
