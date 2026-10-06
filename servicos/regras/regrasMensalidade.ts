import type { DataISO, Pagamento, Usuario } from "@/tipos";
import { adicionarDias, diferencaEmDias, formatarData, hojeISO } from "@/lib/utilitarios/datas";

export type StatusMensalidade =
  | "em_dia"
  | "vence_em_breve"
  | "atrasada"
  | "sem_pagamento"
  | "nao_se_aplica";

export interface SituacaoMensalidade {
  status: StatusMensalidade;
  /** true = mensalista com acesso liberado às aulas da turma */
  acessoLiberado: boolean;
  /** Dias até o vencimento (negativo = dias em atraso) */
  diasRestantes: number | null;
  validade: DataISO | null;
  rotulo: string;
  descricao: string;
}

/** A partir de quantos dias antes do vencimento avisamos o aluno */
export const DIAS_AVISO_VENCIMENTO = 5;

/** Uma turma em que o aluno é mensalista, com a validade da mensalidade dela */
export interface Matricula {
  turmaId: string;
  validade: DataISO | null;
}

type AlunoMensalidade = Pick<Usuario, "plano" | "turmaId" | "validadeMensalidade" | "turmasIds" | "validades">;

/** Validade da mensalidade do aluno em uma turma */
export function validadeNaTurma(aluno: AlunoMensalidade, turmaId: string): DataISO | null {
  if (aluno.validades && turmaId in aluno.validades) return aluno.validades[turmaId] ?? null;
  return turmaId === aluno.turmaId ? aluno.validadeMensalidade : null;
}

/** Turmas em que o aluno é mensalista (a principal primeiro) */
export function matriculasDoAluno(aluno: AlunoMensalidade): Matricula[] {
  if (aluno.plano !== "mensalista") return [];
  const ids = [...new Set([aluno.turmaId, ...(aluno.turmasIds ?? [])].filter((id): id is string => !!id))];
  return ids.map((turmaId) => ({ turmaId, validade: validadeNaTurma(aluno, turmaId) }));
}

export const ehMensalistaDaTurma = (aluno: AlunoMensalidade, turmaId: string) =>
  matriculasDoAluno(aluno).some((m) => m.turmaId === turmaId);

/** Campos do cadastro que guardam as turmas e as validades */
export function camposDasMatriculas(lista: Matricula[]) {
  const unicas = lista.filter((m, i) => m.turmaId && lista.findIndex((o) => o.turmaId === m.turmaId) === i);
  const principal = unicas[0] ?? null;
  return {
    turmaId: principal?.turmaId ?? null,
    validadeMensalidade: principal?.validade ?? null,
    turmasIds: unicas.map((m) => m.turmaId),
    validades: Object.fromEntries(unicas.map((m) => [m.turmaId, m.validade ?? null])) as Record<string, DataISO | null>,
  };
}

const NAO_SE_APLICA: SituacaoMensalidade = {
  status: "nao_se_aplica",
  acessoLiberado: false,
  diasRestantes: null,
  validade: null,
  rotulo: "Avulso",
  descricao: "Use Day Use ou a aula experimental",
};

/** Situação de uma mensalidade a partir da validade */
export function situacaoDaValidade(validade: DataISO | null, hoje: DataISO = hojeISO()): SituacaoMensalidade {
  if (!validade) {
    return {
      status: "sem_pagamento",
      acessoLiberado: false,
      diasRestantes: null,
      validade: null,
      rotulo: "Aguardando 1º pagamento",
      descricao: "Pague a mensalidade para liberar suas aulas",
    };
  }

  const dias = diferencaEmDias(hoje, validade);

  if (dias < 0) {
    const atraso = Math.abs(dias);
    return {
      status: "atrasada",
      acessoLiberado: false,
      diasRestantes: dias,
      validade,
      rotulo: "Atrasada",
      descricao: `Venceu há ${atraso} ${atraso === 1 ? "dia" : "dias"}. Pague para voltar a marcar presença`,
    };
  }

  if (dias <= DIAS_AVISO_VENCIMENTO) {
    return {
      status: "vence_em_breve",
      acessoLiberado: true,
      diasRestantes: dias,
      validade,
      rotulo: dias === 0 ? "Vence hoje" : `Vence em ${dias} ${dias === 1 ? "dia" : "dias"}`,
      descricao: `Válida até ${formatarData(validade)}`,
    };
  }

  return {
    status: "em_dia",
    acessoLiberado: true,
    diasRestantes: dias,
    validade,
    rotulo: "Em dia",
    descricao: `Válida até ${formatarData(validade)}`,
  };
}

/**
 * Situação da mensalidade. Com `turmaId`, a daquela turma; sem, um resumo
 * (a que mais precisa de atenção, quando o aluno é mensalista de várias turmas).
 */
export function calcularSituacaoMensalidade(
  aluno: Usuario,
  turmaId?: string | null,
  hoje: DataISO = hojeISO(),
): SituacaoMensalidade {
  if (aluno.perfil !== "aluno") return NAO_SE_APLICA;
  const matriculas = matriculasDoAluno(aluno);
  if (!matriculas.length) return NAO_SE_APLICA;
  if (turmaId) {
    const matricula = matriculas.find((m) => m.turmaId === turmaId);
    return matricula ? situacaoDaValidade(matricula.validade, hoje) : NAO_SE_APLICA;
  }
  const situacoes = matriculas.map((m) => situacaoDaValidade(m.validade, hoje));
  const ordem = (s: SituacaoMensalidade) =>
    s.acessoLiberado ? 1_000 + (s.diasRestantes ?? 0) : s.status === "atrasada" ? (s.diasRestantes ?? 0) : 0;
  return situacoes.sort((a, b) => ordem(a) - ordem(b))[0];
}

/**
 * Novo ciclo após confirmação: se ainda estava em dia, emenda no fim do
 * ciclo atual; se estava atrasado ou nunca pagou, começa hoje.
 */
export function calcularNovoCiclo(
  validadeAtual: DataISO | null,
  diasCiclo: number,
  hoje: DataISO = hojeISO(),
): { cicloInicio: DataISO; cicloFim: DataISO } {
  const cicloInicio = validadeAtual && validadeAtual >= hoje ? adicionarDias(validadeAtual, 1) : hoje;
  return { cicloInicio, cicloFim: adicionarDias(cicloInicio, diasCiclo - 1) };
}

export function temMensalidadeEmAnalise(pagamentos: Pagamento[], alunoId: string): boolean {
  return pagamentos.some((p) => p.alunoId === alunoId && p.tipo === "mensalidade" && p.status === "em_analise");
}
