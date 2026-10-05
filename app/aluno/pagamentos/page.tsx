"use client";

import { useMemo, useState } from "react";
import { Receipt, Search } from "lucide-react";
import { useDadosAluno } from "@/contextos/ContextoDadosAluno";
import { CartaoMensalidade } from "@/componentes/pagamentos/CartaoMensalidade";
import { FolhaPagarCobrancas } from "@/componentes/pagamentos/FolhaPagarCobrancas";
import { ItemPagamento } from "@/componentes/pagamentos/ItemPagamento";
import { Botao } from "@/componentes/interface/Botao";
import { EsqueletoLista, EstadoVazio, FichasFiltro, TituloPagina, TituloSecao } from "@/componentes/interface/Elementos";
import { formatarDataRelativa } from "@/lib/utilitarios/datas";
import { formatarMoeda } from "@/lib/utilitarios/formatadores";
import { somaValores } from "@/servicos/regras/regrasPagamento";
import type { Pagamento, TipoPagamento } from "@/tipos";

type Filtro = "todos" | TipoPagamento;

export default function PagamentosAluno() {
  const { meusPagamentos, cobrancasAbertas, cobrancasAtrasadas, aulas, turmaPorId, carregando } = useDadosAluno();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [pagando, setPagando] = useState<Pagamento[] | null>(null);
  const [verHistorico, setVerHistorico] = useState(false);

  const emAnalise = meusPagamentos.filter((p) => p.status === "em_analise");
  const historico = meusPagamentos.filter(
    (p) => (p.status === "confirmado" || p.status === "recusado") && (filtro === "todos" || p.tipo === filtro),
  );

  const anoAtual = String(new Date().getFullYear());
  const totalAno = useMemo(
    () =>
      meusPagamentos
        .filter((p) => p.status === "confirmado" && (p.confirmadoEm ?? p.criadoEm).startsWith(anoAtual))
        .reduce((total, p) => total + p.valor, 0),
    [meusPagamentos, anoAtual],
  );

  const detalheDayUse = (p: Pagamento) => {
    const aula = aulas.find((a) => a.id === p.aulaId);
    const turma = turmaPorId.get(p.turmaId ?? "");
    const data = aula?.data ?? p.vencimento;
    return data ? `${turma?.nome ?? "Aula"} de ${formatarDataRelativa(data).toLowerCase()}` : undefined;
  };

  return (
    <>
      <TituloPagina titulo="Pagamentos" subtitulo={`${formatarMoeda(totalAno)} pagos em ${anoAtual}`} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-start">
        <div className="flex flex-col gap-6">
          {cobrancasAbertas.length > 0 && (
            <section>
              <TituloSecao
                titulo="A pagar"
                acao={
                  <Botao variante={cobrancasAtrasadas.length ? "primario" : "destaque"} tamanho="pequeno" onClick={() => setPagando(cobrancasAbertas)}>
                    Pagar {formatarMoeda(somaValores(cobrancasAbertas))}
                  </Botao>
                }
              />
              {cobrancasAtrasadas.length > 0 && (
                <p className="mb-2.5 text-sm text-erro">
                  Day Use em atraso bloqueia novas presenças até ser pago.
                </p>
              )}
              <ul className="flex flex-col gap-2">
                {cobrancasAbertas.map((p) => (
                  <li key={p.id}>
                    <ItemPagamento
                      pagamento={p}
                      detalhe={detalheDayUse(p)}
                      acoes={
                        cobrancasAbertas.length > 1 && (
                          <Botao variante="fantasma" tamanho="pequeno" onClick={() => setPagando([p])}>
                            Pagar só este
                          </Botao>
                        )
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <CartaoMensalidade />

          {emAnalise.length > 0 && (
            <section>
              <TituloSecao titulo="Aguardando o professor conferir" />
              <ul className="flex flex-col gap-2">
                {emAnalise.map((p) => (
                  <li key={p.id}>
                    <ItemPagamento pagamento={p} detalhe={p.tipo === "day_use" ? detalheDayUse(p) : undefined} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <section>
          <TituloSecao
            titulo="Histórico · últimos 12 meses"
            acao={
              verHistorico && (
                <Botao variante="fantasma" tamanho="pequeno" onClick={() => setVerHistorico(false)}>
                  Ocultar
                </Botao>
              )
            }
          />
          {!verHistorico ? (
            <Botao variante="secundario" larguraTotal icone={Search} onClick={() => setVerHistorico(true)}>
              Buscar histórico de pagamentos
            </Botao>
          ) : (
          <>
          <div className="mb-3">
            <FichasFiltro<Filtro>
              opcoes={[
                { valor: "todos", rotulo: "Todos" },
                { valor: "mensalidade", rotulo: "Mensalidades" },
                { valor: "day_use", rotulo: "Day Use" },
              ]}
              ativa={filtro}
              aoMudar={setFiltro}
            />
          </div>
          {carregando ? (
            <EsqueletoLista />
          ) : historico.length ? (
            <ul className="flex flex-col gap-2">
              {historico.map((p) => (
                <li key={p.id}>
                  <ItemPagamento pagamento={p} detalhe={p.tipo === "day_use" ? detalheDayUse(p) : undefined} />
                </li>
              ))}
            </ul>
          ) : (
            <EstadoVazio
              icone={Receipt}
              titulo="Nenhum pagamento ainda"
              descricao="Mensalidades e Day Use pagos aparecem aqui."
              compacto
            />
          )}
          </>
          )}
        </section>
      </div>

      {pagando && <FolhaPagarCobrancas cobrancas={pagando} aoFechar={() => setPagando(null)} />}
    </>
  );
}
