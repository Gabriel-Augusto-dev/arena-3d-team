"use client";

import { useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import { onde } from "@/lib/banco";
import { useColecao } from "@/ganchos/useColecao";
import { useUsuarioLogado } from "@/contextos/ContextoAutenticacao";
import { useDadosAluno } from "@/contextos/ContextoDadosAluno";
import { CartaoMensalidade } from "@/componentes/pagamentos/CartaoMensalidade";
import { FolhaPagarCobrancas } from "@/componentes/pagamentos/FolhaPagarCobrancas";
import { ItemPagamento } from "@/componentes/pagamentos/ItemPagamento";
import { Botao } from "@/componentes/interface/Botao";
import { CampoData } from "@/componentes/interface/Campos";
import { EsqueletoLista, EstadoVazio, FichasFiltro, TituloPagina, TituloSecao } from "@/componentes/interface/Elementos";
import { adicionarDias, formatarDataRelativa, hojeISO } from "@/lib/utilitarios/datas";
import { formatarMoeda } from "@/lib/utilitarios/formatadores";
import { somaValores } from "@/servicos/regras/regrasPagamento";
import type { Pagamento, TipoPagamento } from "@/tipos";

type Filtro = "todos" | TipoPagamento;

export default function PagamentosAluno() {
  const { meusPagamentos, cobrancasAbertas, cobrancasAtrasadas, aulas, turmaPorId, carregando } = useDadosAluno();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [pagando, setPagando] = useState<Pagamento[] | null>(null);
  const aluno = useUsuarioLogado();
  const hoje = hojeISO();
  const anoAtual = hoje.slice(0, 4);
  // Histórico: o aluno escolhe o período (começa no ano atual)
  const [de, setDe] = useState(`${anoAtual}-01-01`);
  const [ate, setAte] = useState(hoje);
  const periodoValido = !!de && !!ate && de <= ate;
  const pagamentosPeriodo = useColecao(
    "pagamentos",
    [
      onde("alunoId", "==", aluno.id),
      onde("criadoEm", ">=", new Date(`${de || hoje}T00:00:00`).toISOString()),
      onde("criadoEm", "<", new Date(`${adicionarDias(ate || hoje, 1)}T00:00:00`).toISOString()),
    ],
    periodoValido,
  );

  const emAnalise = meusPagamentos.filter((p) => p.status === "em_analise");
  const historico = pagamentosPeriodo.dados
    .filter((p) => (p.status === "confirmado" || p.status === "recusado") && (filtro === "todos" || p.tipo === filtro))
    .sort((a, b) => (b.confirmadoEm ?? b.criadoEm).localeCompare(a.confirmadoEm ?? a.criadoEm));
  const totalPeriodo = historico.filter((p) => p.status === "confirmado").reduce((t, p) => t + p.valor, 0);

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
          <TituloSecao titulo="Histórico" />
          <div className="mb-3 grid grid-cols-2 gap-3">
            <CampoData rotulo="De" valor={de} aoMudar={setDe} max={ate || hoje} autoComplete="off" />
            <CampoData rotulo="Até" valor={ate} aoMudar={setAte} min={de || undefined} max={hoje} autoComplete="off" />
          </div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <FichasFiltro<Filtro>
              opcoes={[
                { valor: "todos", rotulo: "Todos" },
                { valor: "mensalidade", rotulo: "Mensalidades" },
                { valor: "day_use", rotulo: "Day Use" },
              ]}
              ativa={filtro}
              aoMudar={setFiltro}
            />
            {periodoValido && historico.length > 0 && (
              <p className="text-sm text-suave">
                Total pago: <strong className="numeros text-tinta">{formatarMoeda(totalPeriodo)}</strong>
              </p>
            )}
          </div>
          {!periodoValido ? (
            <p className="text-sm text-suave">Escolha as datas de início e fim.</p>
          ) : carregando || pagamentosPeriodo.carregando ? (
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
            <EstadoVazio icone={Receipt} titulo="Nenhum pagamento neste período" compacto />
          )}
        </section>
      </div>

      {pagando && <FolhaPagarCobrancas cobrancas={pagando} aoFechar={() => setPagando(null)} />}
    </>
  );
}
