"use client";

import { useMemo, useState } from "react";
import { CircleCheck, Hourglass, Receipt, Search, TrendingUp, Wallet } from "lucide-react";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAbaDaUrl } from "@/ganchos/useAbaDaUrl";
import { CartaoPendencia } from "@/componentes/professor/CartaoPendencia";
import { CartaoCobranca } from "@/componentes/professor/CartaoCobranca";
import { ItemPagamento } from "@/componentes/pagamentos/ItemPagamento";
import { Botao } from "@/componentes/interface/Botao";
import { Campo } from "@/componentes/interface/Campos";
import { Abas, CartaoNumero, EsqueletoLista, EstadoVazio, FichasFiltro, TituloPagina } from "@/componentes/interface/Elementos";
import { adicionarDias, competencia, formatarCompetencia, formatarDataHora, hojeISO } from "@/lib/utilitarios/datas";
import { contemTexto, formatarMoeda } from "@/lib/utilitarios/formatadores";
import { ROTULOS_FORMA_PAGAMENTO } from "@/lib/rotulos";
import { cobrancasEmAtraso, somaValores } from "@/servicos/regras/regrasPagamento";
import { calcularSituacaoMensalidade } from "@/servicos/regras/regrasMensalidade";
import type { TipoPagamento } from "@/tipos";

const ABAS = ["conferir", "receber", "historico"] as const;
type Aba = (typeof ABAS)[number];
type FiltroTipo = "todos" | TipoPagamento;

export default function FinanceiroProfessor() {
  const { pagamentos, paraConferir, aReceber, alunos, carregando } = useDadosProfessor();
  const [aba, setAba] = useAbaDaUrl<Aba>(ABAS, "conferir");
  const [tipo, setTipo] = useState<FiltroTipo>("todos");
  const [mes, setMes] = useState(competencia(hojeISO()));
  const [busca, setBusca] = useState("");
  const [buscou, setBuscou] = useState(false);

  const emAtraso = cobrancasEmAtraso(aReceber);
  const noPrazo = aReceber.filter((p) => !emAtraso.includes(p));
  const mensalidadesAtrasadas = alunos.filter(
    (a) => a.ativo && a.plano === "mensalista" && !calcularSituacaoMensalidade(a).acessoLiberado,
  );

  const meses = useMemo(() => {
    const lista: string[] = [];
    let data = `${competencia(hojeISO())}-15`;
    for (let i = 0; i < 12; i++) {
      lista.push(competencia(data));
      data = adicionarDias(data, -30);
    }
    return [...new Set(lista)];
  }, []);

  const recebidoNoMes = useMemo(
    () =>
      pagamentos
        .filter((p) => p.status === "confirmado" && (p.confirmadoEm ?? p.criadoEm).startsWith(mes))
        .reduce((t, p) => t + p.valor, 0),
    [pagamentos, mes],
  );

  const historico = pagamentos.filter(
    (p) =>
      (p.status === "confirmado" || p.status === "recusado") &&
      (p.confirmadoEm ?? p.criadoEm).startsWith(mes) &&
      (tipo === "todos" || p.tipo === tipo) &&
      (!busca.trim() || contemTexto(p.alunoNome, busca)),
  );

  return (
    <>
      <TituloPagina titulo="Financeiro" />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <CartaoNumero
          realce={paraConferir.length > 0}
          rotulo="Conferir"
          valor={paraConferir.length}
          detalhe="PIX avisados"
          icone={Hourglass}
        />
        <CartaoNumero
          rotulo="A receber"
          valor={formatarMoeda(somaValores(aReceber))}
          detalhe={emAtraso.length ? `${emAtraso.length} em atraso` : "Day Use"}
          icone={Wallet}
        />
        <div className="col-span-2 sm:col-span-1">
          <CartaoNumero
            rotulo="Recebido"
            valor={formatarMoeda(recebidoNoMes)}
            detalhe={`Pagamentos confirmados em ${formatarCompetencia(`${mes}-01`).split(" ")[0].toLowerCase()}`}
            icone={TrendingUp}
          />
        </div>
      </div>

      <div className="mt-7">
        <Abas<Aba>
          className="mb-5 max-w-md"
          abas={[
            { valor: "conferir", rotulo: "Conferir", contador: paraConferir.length },
            { valor: "receber", rotulo: "A receber", contador: aReceber.length },
            { valor: "historico", rotulo: "Histórico" },
          ]}
          ativa={aba}
          aoMudar={(a) => { setAba(a); setBuscou(false); }}
        />

        {carregando ? (
          <EsqueletoLista />
        ) : aba === "conferir" ? (
          paraConferir.length ? (
            <ul className="grid gap-3 lg:grid-cols-2">
              {paraConferir.map((p) => (
                <li key={p.id}>
                  <CartaoPendencia pagamento={p} />
                </li>
              ))}
            </ul>
          ) : (
            <EstadoVazio
              icone={CircleCheck}
              titulo="Tudo conferido"
              descricao="Quando um aluno avisar que fez o PIX, aparece aqui."
            />
          )
        ) : aba === "receber" ? (
          <div className="flex flex-col gap-6">
            {emAtraso.length > 0 && (
              <section>
                <h2 className="mb-2.5 font-titulo text-xl font-bold text-erro">Em atraso ({emAtraso.length})</h2>
                <ul className="grid gap-3 lg:grid-cols-2">
                  {emAtraso.map((p) => (
                    <li key={p.id}>
                      <CartaoCobranca pagamento={p} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {noPrazo.length > 0 && (
              <section>
                <h2 className="mb-1 font-titulo text-xl font-bold">No prazo ({noPrazo.length})</h2>
                <p className="mb-2.5 text-sm text-suave">Podem pagar até a meia-noite do dia da aula.</p>
                <ul className="grid gap-3 lg:grid-cols-2">
                  {noPrazo.map((p) => (
                    <li key={p.id}>
                      <CartaoCobranca pagamento={p} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {mensalidadesAtrasadas.length > 0 && (
              <section>
                <h2 className="mb-1 font-titulo text-xl font-bold">
                  Mensalidades atrasadas ({mensalidadesAtrasadas.length})
                </h2>
                <p className="text-sm leading-relaxed text-suave">
                  {mensalidadesAtrasadas.map((a) => a.nome).join(", ")}. Continuam treinando pagando Day Use.
                </p>
              </section>
            )}
            {!aReceber.length && !mensalidadesAtrasadas.length && (
              <EstadoVazio icone={CircleCheck} titulo="Nada a receber" descricao="Todos os Day Use estão pagos." />
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex gap-2">
                <Campo
                  className="flex-1"
                  icone={Search}
                  type="search"
                  placeholder="Buscar aluno"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") setBuscou(true); }}
                  aria-label="Buscar aluno"
                />
                <select
                  value={mes}
                  onChange={(e) => { setMes(e.target.value); setBuscou(true); }}
                  aria-label="Mês"
                  className="h-12 rounded-xl bg-white px-3 text-sm font-semibold ring-1 ring-inset ring-linha focus:outline-none focus:ring-2 focus:ring-marinho-500"
                >
                  {meses.map((m) => (
                    <option key={m} value={m}>
                      {formatarCompetencia(`${m}-01`)}
                    </option>
                  ))}
                </select>
              </div>
              <FichasFiltro<FiltroTipo>
                opcoes={[
                  { valor: "todos", rotulo: "Tudo" },
                  { valor: "mensalidade", rotulo: "Mensalidades" },
                  { valor: "day_use", rotulo: "Day Use" },
                ]}
                ativa={tipo}
                aoMudar={(t) => { setTipo(t); setBuscou(true); }}
              />
              {!buscou && (
                <Botao
                  variante="destaque"
                  tamanho="grande"
                  larguraTotal
                  icone={Search}
                  onClick={() => setBuscou(true)}
                >
                  Buscar histórico
                </Botao>
              )}
            </div>
            {buscou && (historico.length ? (
              <ul className="grid gap-2 lg:grid-cols-2">
                {historico.map((p) => (
                  <li key={p.id}>
                    <ItemPagamento
                      pagamento={p}
                      mostrarAluno
                      detalhe={`${ROTULOS_FORMA_PAGAMENTO[p.forma]} · ${formatarDataHora(p.confirmadoEm ?? p.criadoEm)}`}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <EstadoVazio icone={Receipt} titulo="Nada neste mês" descricao="Troque o mês ou os filtros." compacto />
            ))}
          </>
        )}
      </div>
    </>
  );
}
