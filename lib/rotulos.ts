import type { Tom } from "@/componentes/interface/Elementos";
import type { StatusMensalidade } from "@/servicos/regras/regrasMensalidade";
import type { SituacaoCobranca } from "@/servicos/regras/regrasPagamento";
import type { FormaPagamento, StatusPresenca, TipoPagamento } from "@/tipos";

/** Situação de um pagamento já considerando atraso (Day Use após a meia-noite) */
export const ROTULOS_SITUACAO_COBRANCA: Record<SituacaoCobranca, { rotulo: string; tom: Tom }> = {
  pago: { rotulo: "Confirmado", tom: "verde" },
  em_analise: { rotulo: "Pago", tom: "azul" },
  em_atraso: { rotulo: "Em atraso", tom: "vermelho" },
  a_pagar: { rotulo: "A pagar", tom: "amarelo" },
  recusado: { rotulo: "Recusado", tom: "vermelho" },
  cancelado: { rotulo: "Cancelado", tom: "cinza" },
};

export const ROTULOS_TIPO_PAGAMENTO: Record<TipoPagamento, string> = {
  mensalidade: "Mensalidade",
  day_use: "Day Use",
};

export const ROTULOS_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  outro: "Outro",
};

export const ROTULOS_STATUS_PRESENCA: Record<StatusPresenca, { rotulo: string; tom: Tom }> = {
  confirmada: { rotulo: "Presente", tom: "verde" },
  cancelada: { rotulo: "Desmarcada", tom: "cinza" },
};

export const TONS_MENSALIDADE: Record<StatusMensalidade, Tom> = {
  em_dia: "verde",
  vence_em_breve: "amarelo",
  atrasada: "vermelho",
  sem_pagamento: "vermelho",
  nao_se_aplica: "azul",
};
