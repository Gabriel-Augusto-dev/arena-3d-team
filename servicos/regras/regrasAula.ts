import type { Aula, Configuracoes, Pagamento, Presenca, Turma, Usuario } from "@/tipos";
import { adicionarDias, aulaJaComecou, diaDaSemana, hojeISO } from "@/lib/utilitarios/datas";
import { ehMensalistaDaTurma, matriculasDoAluno, situacaoDaValidade } from "./regrasMensalidade";
import { cobrancasQueBloqueiam } from "./regrasPagamento";

/**
 * Regras de presença:
 *  - Não há limite de vagas. O aluno marca presença em cada aula que vai.
 *  - Mensalista em dia: presença livre e sem custo (na própria turma, ou em
 *    qualquer turma se o professor liberar nos Ajustes).
 *  - Day Use: marca presença e paga o valor (pode ser depois da aula).
 *  - Day Use não pago até a meia-noite do dia da aula fica em atraso e
 *    BLOQUEIA novas presenças até o professor confirmar o pagamento.
 *  - Mensalista sem a mensalidade em dia não marca presença: só depois que
 *    o professor confirmar o pagamento (PIX avisado ainda não libera).
 *  - Dia extra (criado pelo professor quando quiser): TODOS pagam diária,
 *    inclusive mensalistas.
 */

/** Turma "virtual" das aulas de dia extra (não existe documento no banco) */
export const TURMA_DIA_EXTRA = "dia_extra";

export const ehDiaExtra = (aula: Pick<Aula, "turmaId">) => aula.turmaId === TURMA_DIA_EXTRA;

export const TURMA_VIRTUAL_DIA_EXTRA: Turma = {
  id: TURMA_DIA_EXTRA,
  nome: "Dia extra",
  nivel: "livre",
  diasSemana: [],
  horarioInicio: "",
  horarioFim: "",
  valorMensalidade: 0,
  local: "",
  ativa: true,
  criadoEm: "",
  atualizadoEm: "",
};

/** Mapa de turmas incluindo a turma virtual do dia extra */
export function mapaDeTurmas(turmas: Turma[]): Map<string, Turma> {
  const mapa = new Map(turmas.map((t) => [t.id, t]));
  mapa.set(TURMA_DIA_EXTRA, TURMA_VIRTUAL_DIA_EXTRA);
  return mapa;
}

/**
 * Último dia em que o aluno pode marcar presença: o domingo desta semana
 * (semana de segunda a domingo). No domingo, só o próprio domingo.
 */
export function fimDaSemana(hoje: string = hojeISO()): string {
  return adicionarDias(hoje, (7 - diaDaSemana(hoje)) % 7);
}

/** A aula está aberta para marcar presença? (semana atual; dia extra sempre) */
export const aulaDaSemana = (aula: Pick<Aula, "data" | "turmaId">, hoje: string = hojeISO()) =>
  ehDiaExtra(aula) || aula.data <= fimDaSemana(hoje);

/** Local da turma para mostrar: só o número vira "Quadra 2" */
export function descreverQuadra(local: string | undefined | null): string {
  const texto = (local ?? "").trim();
  return /^\d+$/.test(texto) ? `Quadra ${texto}` : texto;
}

/** Professor responsável pela aula (nome copiado na aula ou na turma) */
export function nomeDoProfessor(aula: Pick<Aula, "responsavelNome">, turma: Pick<Turma, "responsavelNome"> | undefined) {
  return aula.responsavelNome || turma?.responsavelNome || null;
}

/** Link que leva o aluno direto para marcar presença nesta aula */
export function linkPresencaDaAula(aulaId: string): string {
  const origem = typeof window === "undefined" ? "" : window.location.origin;
  return `${origem}/aluno?aula=${encodeURIComponent(aulaId)}`;
}

const presencaAtiva = (p: Presenca) => p.status === "confirmada";

export type MotivoDayUse = "avulso" | "mensalidade_atrasada" | "outra_turma" | "dia_extra";

export type SituacaoPresenca =
  | { tipo: "confirmada"; presenca: Presenca; podeDesmarcar: boolean }
  | { tipo: "aula_cancelada"; motivo: string }
  | { tipo: "encerrada" }
  /** Day Use vencido: emAtraso = falta pagar; emAnalise = PIX avisado, falta o professor confirmar */
  | { tipo: "bloqueada"; emAtraso: Pagamento[]; emAnalise: Pagamento[] }
  /** Mensalista com a mensalidade atrasada (ou sem o 1º pagamento): só marca depois da confirmação */
  | { tipo: "mensalidade_pendente"; primeiroPagamento: boolean; emAnalise: boolean }
  | { tipo: "livre_mensalista" }
  | { tipo: "day_use"; motivo: MotivoDayUse };

/** Até quando dá para marcar presença: até a aula terminar */
export const aulaEncerrada = (aula: Aula) => aulaJaComecou(aula.data, aula.horarioFim);

export function avaliarPresenca(
  aula: Aula,
  aluno: Usuario,
  minhasPresencas: Presenca[],
  meusPagamentos: Pagamento[],
  configuracoes: Pick<Configuracoes, "mensalistaQualquerTurma">,
): SituacaoPresenca {
  const minha = minhasPresencas.find((p) => p.aulaId === aula.id && presencaAtiva(p));

  if (aula.status === "cancelada") return { tipo: "aula_cancelada", motivo: aula.motivoCancelamento };

  if (minha) {
    // Desmarcar só antes da aula começar; Day Use já pago não desmarca pelo app
    const pagamento = minha.pagamentoId ? meusPagamentos.find((p) => p.id === minha.pagamentoId) : undefined;
    const pago = !!pagamento && pagamento.status !== "pendente" && pagamento.status !== "cancelado";
    return {
      tipo: "confirmada",
      presenca: minha,
      podeDesmarcar: !aulaJaComecou(aula.data, aula.horarioInicio) && !pago,
    };
  }

  if (aulaEncerrada(aula)) return { tipo: "encerrada" };

  const bloqueios = cobrancasQueBloqueiam(meusPagamentos);
  if (bloqueios.emAtraso.length || bloqueios.emAnalise.length) return { tipo: "bloqueada", ...bloqueios };

  // Mensalista de uma ou mais turmas: cada turma tem a própria mensalidade.
  // Nas aulas de uma turma dele, só marca com a mensalidade DAQUELA turma em dia
  // (o PIX avisado fica "em análise" e só libera quando o professor confirmar).
  const matriculas = matriculasDoAluno(aluno);
  const ehMensalista = matriculas.length > 0;
  const daTurma = matriculas.find((m) => m.turmaId === aula.turmaId);
  if (daTurma && !situacaoDaValidade(daTurma.validade).acessoLiberado) {
    return {
      tipo: "mensalidade_pendente",
      primeiroPagamento: !daTurma.validade,
      emAnalise: meusPagamentos.some(
        (p) => p.tipo === "mensalidade" && p.status === "em_analise" && (p.turmaId ?? aluno.turmaId) === aula.turmaId,
      ),
    };
  }

  // Dia extra: todo mundo paga diária, mensalista ou não
  if (ehDiaExtra(aula)) return { tipo: "day_use", motivo: "dia_extra" };

  if (daTurma) return { tipo: "livre_mensalista" };

  // Aula de outra turma (ex.: de outro professor): Day Use, a não ser que o
  // professor libere nos Ajustes que mensalista em dia vai em qualquer turma
  const algumaEmDia = matriculas.some((m) => situacaoDaValidade(m.validade).acessoLiberado);
  if (algumaEmDia && configuracoes.mensalistaQualquerTurma) return { tipo: "livre_mensalista" };

  return { tipo: "day_use", motivo: !ehMensalista ? "avulso" : "outra_turma" };
}

/**
 * Professor colocando um aluno na lista (chegou sem marcar pelo app).
 * Não bloqueia por atraso nem por horário: quem decide é o professor.
 * Só entra sem custo o mensalista com a mensalidade em dia daquela turma
 * (ou de qualquer turma, se liberado nos Ajustes); no dia extra todos pagam.
 */
export function tipoPresencaPeloProfessor(
  aula: Aula,
  aluno: Usuario,
  configuracoes: Pick<Configuracoes, "mensalistaQualquerTurma">,
): Presenca["tipo"] {
  if (ehDiaExtra(aula)) return "day_use";
  const matriculas = matriculasDoAluno(aluno);
  const daTurma = matriculas.find((m) => m.turmaId === aula.turmaId);
  if (daTurma) return situacaoDaValidade(daTurma.validade).acessoLiberado ? "mensalista" : "day_use";
  const algumaEmDia = matriculas.some((m) => situacaoDaValidade(m.validade).acessoLiberado);
  return algumaEmDia && configuracoes.mensalistaQualquerTurma ? "mensalista" : "day_use";
}

/** Presenças confirmadas de uma aula (lista do professor) */
export function presencasDaAula(aula: Aula, presencas: Presenca[]): Presenca[] {
  return presencas
    .filter((p) => p.aulaId === aula.id && presencaAtiva(p))
    .sort((a, b) => a.alunoNome.localeCompare(b.alunoNome, "pt-BR"));
}

/** Mensalistas da turma que ainda não marcaram presença nesta aula */
export function mensalistasSemPresenca(aula: Aula, presencas: Presenca[], alunos: Usuario[]): Usuario[] {
  const marcaram = new Set(presencasDaAula(aula, presencas).map((p) => p.alunoId));
  return alunos.filter(
    (a) => a.ativo && ehMensalistaDaTurma(a, aula.turmaId) && !marcaram.has(a.id),
  );
}

export const ROTULOS_NIVEL: Record<Turma["nivel"], string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
  livre: "Todos os níveis",
};

export const ROTULOS_TIPO_PRESENCA: Record<Presenca["tipo"], string> = {
  mensalista: "Mensalista",
  day_use: "Day Use",
};
