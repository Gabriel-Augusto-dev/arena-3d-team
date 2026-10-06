import { matriculasDoAluno } from "./regrasMensalidade";
import type { Aula, Pagamento, Presenca, Turma, Usuario } from "@/tipos";
import { ehDiaExtra } from "./regrasAula";

/**
 * Divisão do trabalho entre o professor administrador e os auxiliares.
 * Cada turma (e cada dia extra) tem um responsável: o uid do auxiliar,
 * ou null quando é o próprio administrador.
 */

/** Responsável pela aula: o que foi gravado nela ou, em aulas antigas, o da turma */
export function responsavelDaAula(aula: Aula, turmaPorId: Map<string, Turma>): string | null {
  if (aula.responsavelId !== undefined) return aula.responsavelId ?? null;
  if (ehDiaExtra(aula)) return null;
  return turmaPorId.get(aula.turmaId)?.responsavelId ?? null;
}

export const responsavelDaTurma = (turma: Turma | undefined): string | null => turma?.responsavelId ?? null;

export function aulasDoResponsavel(aulas: Aula[], turmaPorId: Map<string, Turma>, responsavelId: string | null) {
  return aulas.filter((a) => responsavelDaAula(a, turmaPorId) === responsavelId);
}

export function turmasDoResponsavel(turmas: Turma[], responsavelId: string | null) {
  return turmas.filter((t) => responsavelDaTurma(t) === responsavelId);
}

/**
 * Alunos de um responsável: mensalistas das turmas dele + quem marcou
 * presença nas aulas dele.
 */
export function alunosDoResponsavel(
  alunos: Usuario[],
  turmasIds: Set<string>,
  presencasDele: Presenca[],
): Usuario[] {
  const comPresenca = new Set(presencasDele.map((p) => p.alunoId));
  return alunos.filter(
    (a) => matriculasDoAluno(a).some((m) => turmasIds.has(m.turmaId)) || comPresenca.has(a.id),
  );
}

/**
 * Pagamentos ligados a um responsável:
 *  - Day Use das aulas dele
 *  - mensalidades das turmas dele
 */
export function pagamentosDoResponsavel(pagamentos: Pagamento[], aulasIds: Set<string>, turmasIds: Set<string>) {
  return pagamentos.filter((p) =>
    p.tipo === "day_use" ? !!p.aulaId && aulasIds.has(p.aulaId) : !!p.turmaId && turmasIds.has(p.turmaId),
  );
}

export interface ResumoRepasse {
  /** Day Use confirmados das presenças do período */
  dayUseConfirmado: number;
  /** Mensalidades confirmadas no período (turmas do responsável) */
  mensalidadeConfirmada: number;
  /** Base do cálculo: tudo que já foi confirmado */
  totalConfirmado: number;
  /** Ainda não confirmado (a pagar, em atraso ou aguardando conferência) */
  aReceber: number;
  percentual: number;
  /** Quanto passar para o auxiliar */
  repasse: number;
  /** Quanto fica com o administrador */
  ficaComVoce: number;
}

const arredondar = (valor: number) => Math.round(valor * 100) / 100;

export function calcularRepasse(
  pagamentosDayUse: Pagamento[],
  mensalidadesConfirmadas: Pagamento[],
  percentual: number,
): ResumoRepasse {
  const confirmados = pagamentosDayUse.filter((p) => p.status === "confirmado");
  const abertos = pagamentosDayUse.filter((p) => p.status === "pendente" || p.status === "em_analise");
  const dayUseConfirmado = arredondar(confirmados.reduce((t, p) => t + p.valor, 0));
  const mensalidadeConfirmada = arredondar(mensalidadesConfirmadas.reduce((t, p) => t + p.valor, 0));
  const totalConfirmado = arredondar(dayUseConfirmado + mensalidadeConfirmada);
  const pct = Math.min(100, Math.max(0, Number.isFinite(percentual) ? percentual : 0));
  const repasse = arredondar((totalConfirmado * pct) / 100);
  return {
    dayUseConfirmado,
    mensalidadeConfirmada,
    totalConfirmado,
    aReceber: arredondar(abertos.reduce((t, p) => t + p.valor, 0)),
    percentual: pct,
    repasse,
    ficaComVoce: arredondar(totalConfirmado - repasse),
  };
}
