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

export function calcularSituacaoMensalidade(aluno: Usuario, hoje: DataISO = hojeISO()): SituacaoMensalidade {
  if (aluno.perfil !== "aluno" || aluno.plano !== "mensalista") {
    return {
      status: "nao_se_aplica",
      acessoLiberado: false,
      diasRestantes: null,
      validade: null,
      rotulo: "Avulso",
      descricao: "Use Day Use ou a aula experimental",
    };
  }

  if (!aluno.validadeMensalidade) {
    return {
      status: "sem_pagamento",
      acessoLiberado: false,
      diasRestantes: null,
      validade: null,
      rotulo: "Aguardando 1º pagamento",
      descricao: "Pague a mensalidade para liberar suas aulas",
    };
  }

  const dias = diferencaEmDias(hoje, aluno.validadeMensalidade);

  if (dias < 0) {
    const atraso = Math.abs(dias);
    return {
      status: "atrasada",
      acessoLiberado: false,
      diasRestantes: dias,
      validade: aluno.validadeMensalidade,
      rotulo: "Atrasada",
      descricao: `Venceu há ${atraso} ${atraso === 1 ? "dia" : "dias"}. Enquanto isso, use Day Use`,
    };
  }

  if (dias <= DIAS_AVISO_VENCIMENTO) {
    return {
      status: "vence_em_breve",
      acessoLiberado: true,
      diasRestantes: dias,
      validade: aluno.validadeMensalidade,
      rotulo: dias === 0 ? "Vence hoje" : `Vence em ${dias} ${dias === 1 ? "dia" : "dias"}`,
      descricao: `Válida até ${formatarData(aluno.validadeMensalidade)}`,
    };
  }

  return {
    status: "em_dia",
    acessoLiberado: true,
    diasRestantes: dias,
    validade: aluno.validadeMensalidade,
    rotulo: "Em dia",
    descricao: `Válida até ${formatarData(aluno.validadeMensalidade)}`,
  };
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
