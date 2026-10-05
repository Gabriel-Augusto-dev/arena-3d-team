import type { Aula, Configuracoes, Pagamento, Presenca, Turma, Usuario } from "@/tipos";
import { aulaJaComecou } from "@/lib/utilitarios/datas";
import { calcularSituacaoMensalidade } from "./regrasMensalidade";
import { cobrancasEmAtraso } from "./regrasPagamento";

/**
 * Regras de presença:
 *  - Não há limite de vagas. O aluno marca presença em cada aula que vai.
 *  - Mensalista em dia: presença livre e sem custo (na própria turma, ou em
 *    qualquer turma se o professor liberar nos Ajustes).
 *  - Day Use: marca presença e paga o valor (pode ser depois da aula).
 *  - Day Use não pago até a meia-noite do dia da aula fica em atraso e
 *    BLOQUEIA novas presenças até ser pago.
 *  - Experimental: gratuita, uma única vez.
 *  - Mensalista com mensalidade atrasada marca como Day Use.
 */

const presencaAtiva = (p: Presenca) => p.status === "confirmada";

export type MotivoDayUse = "avulso" | "mensalidade_atrasada" | "outra_turma";

export type SituacaoPresenca =
  | { tipo: "confirmada"; presenca: Presenca; podeDesmarcar: boolean }
  | { tipo: "aula_cancelada"; motivo: string }
  | { tipo: "encerrada" }
  | { tipo: "bloqueada"; emAtraso: Pagamento[] }
  | { tipo: "livre_mensalista" }
  | { tipo: "day_use"; motivo: MotivoDayUse; podeExperimental: boolean };

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

  const emAtraso = cobrancasEmAtraso(meusPagamentos);
  if (emAtraso.length) return { tipo: "bloqueada", emAtraso };

  const mensalidade = calcularSituacaoMensalidade(aluno);
  const ehMensalista = aluno.plano === "mensalista";
  const turmaPermitida = configuracoes.mensalistaQualquerTurma || aluno.turmaId === aula.turmaId;

  if (ehMensalista && mensalidade.acessoLiberado && turmaPermitida) return { tipo: "livre_mensalista" };

  const experimentalEmAberto = minhasPresencas.some((p) => p.tipo === "experimental" && presencaAtiva(p));
  return {
    tipo: "day_use",
    motivo: !ehMensalista ? "avulso" : !mensalidade.acessoLiberado ? "mensalidade_atrasada" : "outra_turma",
    podeExperimental: !aluno.usouExperimental && !experimentalEmAberto,
  };
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
    (a) => a.ativo && a.plano === "mensalista" && a.turmaId === aula.turmaId && !marcaram.has(a.id),
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
  experimental: "Experimental",
};
