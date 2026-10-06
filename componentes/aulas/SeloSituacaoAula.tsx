import { Selo } from "@/componentes/interface/Elementos";
import type { SituacaoPresenca } from "@/servicos/regras/regrasAula";
import { situacaoCobranca } from "@/servicos/regras/regrasPagamento";
import type { Pagamento } from "@/tipos";

/** Situação da presença do aluno numa aula */
export function SeloSituacaoAula({ situacao, cobranca }: { situacao: SituacaoPresenca; cobranca?: Pagamento }) {
  switch (situacao.tipo) {
    case "confirmada": {
      if (cobranca) {
        const s = situacaoCobranca(cobranca);
        if (s === "a_pagar") return <Selo tom="amarelo" ponto>Presente · a pagar</Selo>;
        if (s === "em_atraso") return <Selo tom="vermelho" ponto>Presente · em atraso</Selo>;
      }
      return (
        <Selo tom="verde" ponto>
          {situacao.presenca.tipo === "experimental" ? "Experimental" : "Presente"}
        </Selo>
      );
    }
    case "aula_cancelada":
      return <Selo tom="vermelho">Cancelada</Selo>;
    case "encerrada":
      return <Selo tom="cinza">Encerrada</Selo>;
    case "bloqueada":
      return situacao.emAtraso.length ? <Selo tom="vermelho">Bloqueada</Selo> : <Selo tom="amarelo">Aguardando confirmação</Selo>;
    case "mensalidade_pendente":
      return situacao.emAnalise ? <Selo tom="amarelo">Aguardando confirmação</Selo> : <Selo tom="vermelho">Bloqueada</Selo>;
    case "livre_mensalista":
      return null;
    case "day_use":
      return situacao.motivo === "dia_extra" ? <Selo tom="amarelo">Diária</Selo> : <Selo tom="cinza">Day Use</Selo>;
  }
}
