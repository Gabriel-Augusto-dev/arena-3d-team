import type { Configuracoes, Turma, Usuario } from "@/tipos";

/**
 * Quanto o mensalista paga. O associado (só existe para mensalista) paga a
 * mensalidade de associado definida em Ajustes; se o campo estiver em 0,
 * paga o valor normal da turma. O Day Use é igual para todos.
 * (A mesma conta está no firestore.rules.)
 */
export function valorMensalidadeDoAluno(
  aluno: Pick<Usuario, "associado" | "plano"> | null | undefined,
  turma: Pick<Turma, "valorMensalidade">,
  config: Pick<Configuracoes, "valorMensalidadeAssociado">,
): number {
  return aluno?.plano === "mensalista" && aluno.associado && config.valorMensalidadeAssociado > 0
    ? config.valorMensalidadeAssociado
    : turma.valorMensalidade;
}
