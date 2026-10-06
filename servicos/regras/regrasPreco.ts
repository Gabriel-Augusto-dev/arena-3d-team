import type { Configuracoes, Turma, Usuario } from "@/tipos";

/**
 * Quanto cada aluno paga. O associado paga os valores de associado
 * definidos em Ajustes; se o campo estiver em 0, paga o valor normal.
 * (As mesmas contas estão no firestore.rules.)
 */

type Precos = Pick<Configuracoes, "valorDayUse" | "valorDayUseAssociado" | "valorMensalidadeAssociado">;

export function valorDayUseDoAluno(aluno: Pick<Usuario, "associado"> | null | undefined, config: Precos): number {
  return aluno?.associado && config.valorDayUseAssociado > 0 ? config.valorDayUseAssociado : config.valorDayUse;
}

export function valorMensalidadeDoAluno(
  aluno: Pick<Usuario, "associado"> | null | undefined,
  turma: Pick<Turma, "valorMensalidade">,
  config: Precos,
): number {
  return aluno?.associado && config.valorMensalidadeAssociado > 0
    ? config.valorMensalidadeAssociado
    : turma.valorMensalidade;
}
