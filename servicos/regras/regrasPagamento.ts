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

export type SituacaoCobranca = "pago" | "em_analise" | "em_atraso" | "a_pagar" | "cancelado" | "recusado";

/** Situação de uma cobrança para exibir na tela */
export function situacaoCobranca(pagamento: Pagamento, hoje: DataISO = hojeISO()): SituacaoCobranca {
  if (pagamento.status === "confirmado") return "pago";
  if (pagamento.status === "em_analise") return "em_analise";
  if (pagamento.status === "cancelado") return "cancelado";
  if (pagamento.status === "recusado") return "recusado";
  return estaEmAtraso(pagamento, hoje) ? "em_atraso" : "a_pagar";
}

export const somaValores = (pagamentos: Pagamento[]) => pagamentos.reduce((total, p) => total + p.valor, 0);
