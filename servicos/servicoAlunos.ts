import { autenticacao, type DadosPerfilConta, type ResultadoNovaConta } from "@/lib/autenticacao";
import { banco, onde } from "@/lib/banco";
import { chamarApi } from "@/lib/api/cliente";
import type { Usuario } from "@/tipos";
import { somenteNumeros } from "@/lib/utilitarios/formatadores";
import { calcularNovoCiclo, camposDasMatriculas, matriculasDoAluno } from "./regras/regrasMensalidade";
import { hojeISO } from "@/lib/utilitarios/datas";

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
  | "turmasIds"
  | "validades"
  | "associado"
  | "ativo"
  | "observacoes"
>;

function normalizar(dados: DadosAluno): DadosAluno {
  const mensalista = dados.plano === "mensalista";
  // Turmas do mensalista (pode ser mais de uma) com a validade de cada mensalidade
  const matriculas = mensalista
    ? matriculasDoAluno({ ...dados, plano: "mensalista" }).map((m) => ({ ...m, validade: m.validade || null }))
    : [];
  if (mensalista && !matriculas.length) throw new Error("Escolha pelo menos uma turma do mensalista");
  return {
    ...dados,
    nome: dados.nome.trim(),
    email: dados.email.trim().toLowerCase(),
    cpf: somenteNumeros(dados.cpf),
    whatsapp: somenteNumeros(dados.whatsapp),
    associado: mensalista && !!dados.associado,
    ...camposDasMatriculas(matriculas),
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
  if (novos.cpf && novos.cpf !== anterior.cpf) {
    const iguais = await banco.listar("usuarios", [onde("cpf", "==", novos.cpf)]);
    if (iguais.some((u) => u.id !== anterior.id)) throw new Error("Este CPF já está cadastrado em outra conta");
  }
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
/**
 * Marca/desmarca o mensalista como associado.
 * Administrador grava direto (como no Editar); o auxiliar passa pelo
 * servidor, que confere se o aluno é das turmas dele.
 */
export async function definirAssociado(aluno: Usuario, associado: boolean, comoAdministrador: boolean) {
  if (associado && aluno.plano !== "mensalista") throw new Error("Associado é só para mensalista");
  if (comoAdministrador) {
    await banco.atualizar("usuarios", aluno.id, { associado: associado && aluno.plano === "mensalista" });
    return;
  }
  await chamarApi("/api/alunos/associado", { alunoId: aluno.id, associado });
}

/**
 * Aluno que já pagava antes do app: o professor informa o dia do último pagamento
 * e a mensalidade daquela turma passa a valer pelo ciclo a partir desse dia
 * (mesma conta de um pagamento confirmado). Com isso a presença já libera.
 * Retorna até quando ficou válida.
 */
export async function definirUltimoPagamento(alunoId: string, turmaId: string, dataPagamento: string, diasCiclo: number) {
  if (!dataPagamento) throw new Error("Informe a data do último pagamento");
  if (dataPagamento > hojeISO()) throw new Error("A data do último pagamento não pode ser no futuro");
  const aluno = await banco.obter("usuarios", alunoId);
  if (!aluno) throw new Error("Aluno não encontrado");
  const matriculas = matriculasDoAluno(aluno);
  if (!matriculas.some((m) => m.turmaId === turmaId)) throw new Error("O aluno não é mensalista desta turma");
  // Mesma regra do ciclo normal, começando no dia em que ele pagou
  const { cicloFim } = calcularNovoCiclo(null, diasCiclo, dataPagamento);
  const novas = matriculas.map((m) => (m.turmaId === turmaId ? { ...m, validade: cicloFim } : m));
  await banco.atualizar("usuarios", aluno.id, camposDasMatriculas(novas));
  return cicloFim;
}
