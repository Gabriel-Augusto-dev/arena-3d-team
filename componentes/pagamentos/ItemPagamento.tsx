import { CalendarDays, Receipt, Ticket } from "lucide-react";
import type { Pagamento } from "@/tipos";
import { Selo } from "@/componentes/interface/Elementos";
import { formatarData, formatarDataHora, formatarDataRelativa } from "@/lib/utilitarios/datas";
import { formatarMoeda } from "@/lib/utilitarios/formatadores";
import { ROTULOS_SITUACAO_COBRANCA, ROTULOS_TIPO_PAGAMENTO } from "@/lib/rotulos";
import { diasDeAtraso, situacaoCobranca } from "@/servicos/regras/regrasPagamento";

/** Linha de pagamento usada no histórico do aluno e do professor */
export function ItemPagamento({
  pagamento,
  mostrarAluno = false,
  detalhe,
  acoes,
}: {
  pagamento: Pagamento;
  mostrarAluno?: boolean;
  detalhe?: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  const situacao = situacaoCobranca(pagamento);
  const rotulo = ROTULOS_SITUACAO_COBRANCA[situacao];
  const Icone = pagamento.tipo === "mensalidade" ? CalendarDays : Ticket;
  const atraso = diasDeAtraso(pagamento);

  let descricao = formatarDataHora(pagamento.criadoEm);
  if (pagamento.tipo === "mensalidade" && pagamento.cicloInicio && pagamento.cicloFim) {
    descricao = `Ciclo ${formatarData(pagamento.cicloInicio)} a ${formatarData(pagamento.cicloFim)}`;
  } else if (pagamento.tipo === "day_use" && pagamento.vencimento) {
    descricao = `Aula de ${formatarDataRelativa(pagamento.vencimento).toLowerCase()}`;
  }

  return (
    <div className={`rounded-2xl bg-white p-3.5 ring-1 ${situacao === "em_atraso" ? "ring-erro/40" : "ring-linha/70"}`}>
      <div className="flex items-center gap-3">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-xl ${
            pagamento.tipo === "mensalidade" ? "bg-marinho-100 text-marinho-700" : "bg-areia-100 text-marinho-900"
          }`}
        >
          <Icone className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">
            {mostrarAluno ? pagamento.alunoNome : ROTULOS_TIPO_PAGAMENTO[pagamento.tipo]}
          </p>
          <p className="truncate text-[13px] text-suave">
            {mostrarAluno ? `${ROTULOS_TIPO_PAGAMENTO[pagamento.tipo]} · ` : ""}
            {detalhe ?? descricao}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="numeros font-titulo text-lg font-bold">{formatarMoeda(pagamento.valor)}</span>
          <Selo tom={rotulo.tom}>{situacao === "em_atraso" && atraso > 1 ? `${atraso} dias de atraso` : rotulo.rotulo}</Selo>
        </div>
      </div>
      {pagamento.motivoRecusa && (situacao === "recusado" || situacao === "a_pagar" || situacao === "em_atraso") && (
        <p className="mt-2.5 flex gap-2 rounded-xl bg-erro-fundo px-3 py-2 text-[13px] text-erro">
          <Receipt className="mt-0.5 size-4 shrink-0" />
          {pagamento.motivoRecusa}
        </p>
      )}
      {acoes && <div className="mt-3 flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}
