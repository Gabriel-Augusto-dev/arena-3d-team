import type { DataISO, Pagamento } from "@/tipos";
import { diferencaEmDias, hojeISO } from "@/lib/utilitarios/datas";

/**
 * Day Use pode ser pago depois da aula. Se chegar meia-noite (virar o dia
 * seguinte ao da aula) e ainda estiver "pendente", fica EM ATRASO.
 */
export function estaEmAtraso(pagamento: Pagamento, hoje: DataISO = hojeISO()): boolean {
  return (
    pagamento.tipo === "day_use" &&
    pagamento.status === "pendente" &&
    !!pagamento.vencimento &&
    pagamento.vencimento < hoje
  );
}

/** Dias de atraso (0 se não estiver atrasado) */
export function diasDeAtraso(pagamento: Pagamento, hoje: DataISO = hojeISO()): number {
  if (!estaEmAtraso(pagamento, hoje) || !pagamento.vencimento) return 0;
  return diferencaEmDias(pagamento.vencimento, hoje);
}

/** Cobranças que o aluno ainda precisa pagar (não inclui as que já avisou que pagou) */
export function cobrancasEmAberto(pagamentos: Pagamento[]): Pagamento[] {
  return pagamentos
    .filter((p) => p.tipo === "day_use" && p.status === "pendente")
    .sort((a, b) => (a.vencimento ?? "").localeCompare(b.vencimento ?? ""));
}

export function cobrancasEmAtraso(pagamentos: Pagamento[], hoje: DataISO = hojeISO()): Pagamento[] {
  return cobrancasEmAberto(pagamentos).filter((p) => estaEmAtraso(p, hoje));
}

/**
 * Day Use vencido que ainda segura novas presenças: o que não foi pago
 * ("pendente") e também o PIX avisado que o professor ainda não confirmou
 * ("em_analise"). Só libera depois da confirmação.
 */
export function cobrancasQueBloqueiam(pagamentos: Pagamento[], hoje: DataISO = hojeISO()) {
  const vencidas = pagamentos.filter(
    (p) => p.tipo === "day_use" && !!p.vencimento && p.vencimento < hoje,
  );
  return {
    emAtraso: cobrancasEmAtraso(vencidas, hoje),
    emAnalise: vencidas.filter((p) => p.status === "em_analise"),
  };
}

export type SituacaoCobranca =
  | "pago"
  | "em_analise"
  | "em_atraso"
  | "a_pagar"
  | "cancelado"
  | "recusado"
  | "reembolsado"
  | "em_credito"
  | "credito_usado";

/** Situação de uma cobrança para exibir na tela */
export function situacaoCobranca(pagamento: Pagamento, hoje: DataISO = hojeISO()): SituacaoCobranca {
  if (pagamento.status === "confirmado") return "pago";
  if (pagamento.status === "em_analise") return "em_analise";
  if (pagamento.status === "cancelado") return "cancelado";
  if (pagamento.status === "recusado") return "recusado";
  if (pagamento.status === "reembolsado") return "reembolsado";
  if (pagamento.status === "credito") return pagamento.creditoUsadoPor ? "credito_usado" : "em_credito";
  return estaEmAtraso(pagamento, hoje) ? "em_atraso" : "a_pagar";
}

/* ------------------------------------------------------------------ */
/* Crédito de aula cancelada                                           */
/* ------------------------------------------------------------------ */

/** Créditos que o aluno ainda pode usar (não vencem; o mais antigo é usado primeiro) */
export function creditosDisponiveis(pagamentos: Pagamento[]): Pagamento[] {
  return pagamentos
    .filter((p) => p.status === "credito" && !p.creditoUsadoPor)
    .sort((a, b) => (a.confirmadoEm ?? a.criadoEm).localeCompare(b.confirmadoEm ?? b.criadoEm));
}

/**
 * Dinheiro que de fato entrou (Financeiro, totais e repasse usam a mesma regra):
 *  - confirmado → conta (menos o pago com crédito: não é dinheiro novo)
 *  - virou crédito → continua contando no dia em que o PIX entrou
 *  - reembolsado, cancelado, a pagar, em análise → não conta
 */
export const contaComoRecebido = (p: Pagamento) =>
  (p.status === "confirmado" && p.forma !== "credito") || p.status === "credito";

/** Day Use pago com crédito (sem dinheiro novo) */
export const pagoComCredito = (p: Pagamento | undefined | null) =>
  !!p && p.forma === "credito" && p.status === "confirmado";

/** Day Use que tinha sido pago e foi cancelado junto com a aula (versão antiga do app) */
const pagoECanceladoComAula = (p: Pagamento) =>
  p.status === "cancelado" && !!p.confirmadoEm && p.motivoRecusa === "Aula cancelada";

/** Day Use pago de aula cancelada que pode virar reembolso ou crédito */
export const podeReembolsarOuCreditar = (p: Pagamento) =>
  p.tipo === "day_use" && (p.status === "confirmado" || pagoECanceladoComAula(p));

/**
 * Day Use de aula cancelada que o professor ainda precisa resolver:
 * pago (reembolsar ou virar crédito) ou PIX avisado (conferir antes).
 */
export const aguardaDecisaoDaAulaCancelada = (p: Pagamento) =>
  podeReembolsarOuCreditar(p) || (p.tipo === "day_use" && p.status === "em_analise");

export const somaValores = (pagamentos: Pagamento[]) => pagamentos.reduce((total, p) => total + p.valor, 0);
