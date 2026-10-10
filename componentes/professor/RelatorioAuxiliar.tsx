"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Percent, Receipt, Users } from "lucide-react";
import { banco, onde } from "@/lib/banco";
import { useColecao } from "@/ganchos/useColecao";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { ItemPagamento } from "@/componentes/pagamentos/ItemPagamento";
import { Campo } from "@/componentes/interface/Campos";
import { Abas, Avatar, Cartao, EsqueletoLista, EstadoVazio, Selo } from "@/componentes/interface/Elementos";
import {
  adicionarDias,
  deDataISO,
  formatarData,
  formatarDataCurta,
  formatarDataExtenso,
  hojeISO,
  paraDataISO,
} from "@/lib/utilitarios/datas";
import { formatarMoeda, primeiroNome } from "@/lib/utilitarios/formatadores";
import { ROTULOS_SITUACAO_COBRANCA } from "@/lib/rotulos";
import { ehDiaExtra, ROTULOS_TIPO_PRESENCA } from "@/servicos/regras/regrasAula";
import { situacaoCobranca } from "@/servicos/regras/regrasPagamento";
import { aulasDoResponsavel, calcularRepasse, turmasDoResponsavel } from "@/servicos/regras/regrasEquipe";
import type { Aula, Pagamento, Presenca, Usuario } from "@/tipos";

/**
 * Relatório de um professor auxiliar em um período: aulas, presenças,
 * alunos, valores confirmados e o cálculo da porcentagem.
 *  - visao "administrador": página Equipe (quanto passar para o auxiliar)
 *  - visao "auxiliar": área Ganhos do próprio auxiliar (quanto ele recebe)
 */

type TipoPeriodo = "mes" | "periodo";
type Aba = "aulas" | "alunos" | "pagamentos";

function intervalo(tipo: TipoPeriodo, referencia: string, de: string, ate: string): [string, string] {
  if (tipo === "mes") {
    const data = deDataISO(referencia);
    return [
      paraDataISO(new Date(data.getFullYear(), data.getMonth(), 1)),
      paraDataISO(new Date(data.getFullYear(), data.getMonth() + 1, 0)),
    ];
  }
  return de <= ate ? [de, ate] : [ate, de];
}

function mover(referencia: string, passo: number): string {
  const data = deDataISO(referencia);
  return paraDataISO(new Date(data.getFullYear(), data.getMonth() + passo, 1));
}

function descreverPeriodo(tipo: TipoPeriodo, inicio: string, fim: string): string {
  if (tipo === "mes") {
    const texto = deDataISO(inicio).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
  return `${formatarDataCurta(inicio)} a ${formatarDataCurta(fim)}`;
}

/** Data (no fuso do aparelho) em que o pagamento foi confirmado */
const diaDaConfirmacao = (p: Pagamento) => (p.confirmadoEm ? paraDataISO(new Date(p.confirmadoEm)) : "");

export function RelatorioAuxiliar({
  auxiliar,
  visao = "administrador",
}: {
  auxiliar: Usuario;
  visao?: "administrador" | "auxiliar";
}) {
  const doAdministrador = visao === "administrador";
  const campoPercentual = doAdministrador ? "percentualRepasse" : "percentualProprio";
  const { turmas, turmaPorId } = useDadosProfessor();
  const avisos = useAvisos();
  const hoje = hojeISO();
  const [tipo, setTipo] = useState<TipoPeriodo>("mes");
  const [referencia, setReferencia] = useState(hoje);
  const [de, setDe] = useState(adicionarDias(hoje, -30));
  const [ate, setAte] = useState(hoje);
  const [aba, setAba] = useState<Aba>("aulas");
  const [verDetalhes, setVerDetalhes] = useState(false);
  // O auxiliar começa com a porcentagem que o administrador usou (se houver)
  const percentualSalvo = doAdministrador
    ? auxiliar.percentualRepasse
    : (auxiliar.percentualProprio ?? auxiliar.percentualRepasse);
  const [percentualTexto, setPercentualTexto] = useState(percentualSalvo !== undefined ? String(percentualSalvo) : "");
  const [inicio, fim] = intervalo(tipo, referencia, de, ate);

  // Aulas e presenças do período (busca no banco, não depende dos últimos 30 dias)
  const aulasPeriodo = useColecao("aulas", [onde("data", ">=", inicio), onde("data", "<=", fim)]);
  const presencasPeriodo = useColecao("presencas", [onde("dataAula", ">=", inicio), onde("dataAula", "<=", fim)]);
  // Day Use: o vencimento é o dia da aula. Mensalidades: confirmadas no período
  const dayUsePeriodo = useColecao("pagamentos", [onde("vencimento", ">=", inicio), onde("vencimento", "<=", fim)]);
  const confirmadosPeriodo = useColecao("pagamentos", [
    onde("confirmadoEm", ">=", new Date(`${inicio}T00:00:00`).toISOString()),
    onde("confirmadoEm", "<", new Date(`${adicionarDias(fim, 1)}T00:00:00`).toISOString()),
  ]);

  const dados = useMemo(() => {
    const pagamentoPorId = new Map(dayUsePeriodo.dados.map((p) => [p.id, p]));
    const turmasDele = turmasDoResponsavel(turmas, auxiliar.id);
    const idsTurmas = new Set(turmasDele.map((t) => t.id));
    // Aulas que já aconteceram (ou são hoje) + as futuras que já têm presença marcada
    // (Day Use pago antecipado conta assim que o professor confirma)
    const comPresenca = new Set(
      presencasPeriodo.dados.filter((p) => p.status === "confirmada").map((p) => p.aulaId),
    );
    const aulas = aulasDoResponsavel(aulasPeriodo.dados, turmaPorId, auxiliar.id)
      .filter((a) => a.data <= hoje || comPresenca.has(a.id))
      .sort((a, b) => (a.data + a.horarioInicio).localeCompare(b.data + b.horarioInicio));
    const idsAulas = new Set(aulas.map((a) => a.id));
    const presencas = presencasPeriodo.dados.filter((p) => p.status === "confirmada" && idsAulas.has(p.aulaId));
    const dayUse = presencas
      .map((p) => (p.pagamentoId ? pagamentoPorId.get(p.pagamentoId) : undefined))
      .filter((p): p is Pagamento => !!p);
    const mensalidades = confirmadosPeriodo.dados.filter(
      (p) => p.tipo === "mensalidade" && p.status === "confirmado" && !!p.turmaId && idsTurmas.has(p.turmaId),
    );

    // Alunos atendidos no período
    const porAluno = new Map<string, { nome: string; presencas: number; aPagar: number; pago: number }>();
    for (const p of presencas) {
      const atual = porAluno.get(p.alunoId) ?? { nome: p.alunoNome, presencas: 0, aPagar: 0, pago: 0 };
      atual.presencas++;
      const pg = p.pagamentoId ? pagamentoPorId.get(p.pagamentoId) : undefined;
      if (pg?.status === "confirmado") atual.pago += pg.valor;
      else if (pg && (pg.status === "pendente" || pg.status === "em_analise")) atual.aPagar += pg.valor;
      porAluno.set(p.alunoId, atual);
    }
    const alunos = [...porAluno.entries()]
      .map(([id, a]) => ({ id, ...a }))
      .sort((a, b) => b.presencas - a.presencas || a.nome.localeCompare(b.nome, "pt-BR"));

    return { turmasDele, aulas, presencas, dayUse, mensalidades, alunos, pagamentoPorId };
  }, [dayUsePeriodo.dados, confirmadosPeriodo.dados, turmas, turmaPorId, auxiliar.id, aulasPeriodo.dados, presencasPeriodo.dados, hoje]);

  const percentual = Number(percentualTexto.replace(",", ".")) || 0;
  const resumo = calcularRepasse(dados.dayUse, dados.mensalidades, percentual);
  const carregando =
    aulasPeriodo.carregando || presencasPeriodo.carregando || dayUsePeriodo.carregando || confirmadosPeriodo.carregando;

  // Guarda a porcentagem para a próxima vez (por auxiliar)
  useEffect(() => {
    if (percentualTexto === "" || resumo.percentual === auxiliar[campoPercentual]) return;
    const espera = setTimeout(() => {
      banco.atualizar("usuarios", auxiliar.id, { [campoPercentual]: resumo.percentual }).catch((e) => avisos.erro(e));
    }, 800);
    return () => clearTimeout(espera);
  }, [percentualTexto, resumo.percentual, auxiliar, campoPercentual, avisos]);

  const pagamentosConfirmados = [...dados.dayUse.filter((p) => p.status === "confirmado"), ...dados.mensalidades].sort(
    (a, b) => (b.confirmadoEm ?? "").localeCompare(a.confirmadoEm ?? ""),
  );

  return (
    <div className="flex flex-col gap-4">
      {dados.turmasDele.length === 0 && (
        <p className="text-sm text-suave">
          {doAdministrador
            ? `${primeiroNome(auxiliar.nome)} ainda não é responsável por nenhuma turma. Escolha em Turmas → Editar.`
            : "Nenhuma turma com você como responsável ainda."}
        </p>
      )}

      {/* Período */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Abas<TipoPeriodo>
          className="sm:w-56"
          abas={[
            { valor: "mes", rotulo: "Mês" },
            { valor: "periodo", rotulo: "Período" },
          ]}
          ativa={tipo}
          aoMudar={(t) => {
            setTipo(t);
            setReferencia(hoje);
          }}
        />
        {tipo === "periodo" ? (
          <div className="grid flex-1 grid-cols-2 gap-3 sm:max-w-md">
            <Campo rotulo="De" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            <Campo rotulo="Até" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-2 sm:max-w-md">
            <button
              type="button"
              onClick={() => setReferencia(mover(referencia, -1))}
              aria-label="Mês anterior"
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-white ring-1 ring-linha hover:bg-marinho-50"
            >
              <ChevronLeft className="size-5" />
            </button>
            <p className="flex-1 text-center font-titulo text-lg font-bold">{descreverPeriodo(tipo, inicio, fim)}</p>
            <button
              type="button"
              onClick={() => setReferencia(mover(referencia, 1))}
              aria-label="Próximo mês"
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-white ring-1 ring-linha hover:bg-marinho-50"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        )}
      </div>

      {/* Repasse */}
      <Cartao className="flex flex-col gap-4">
        <div className="flex items-end gap-3">
          <Campo
            className="w-36 shrink-0"
            rotulo={doAdministrador ? "Porcentagem" : "Sua porcentagem"}
            icone={Percent}
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step="0.5"
            placeholder="Ex.: 40"
            value={percentualTexto}
            onChange={(e) => setPercentualTexto(e.target.value)}
          />
          <div className="flex min-w-0 flex-1 flex-col items-end rounded-2xl bg-laranja-500 px-4 py-2.5 text-white">
            <span className="text-sm font-semibold">
              {doAdministrador ? `Passar para ${primeiroNome(auxiliar.nome)}` : "Você recebe"}
            </span>
            <span className="numeros font-titulo text-2xl font-extrabold">{formatarMoeda(resumo.repasse)}</span>
          </div>
        </div>
        <dl className="divide-y divide-linha/70 text-[15px]">
          <Linha rotulo="Total recebido" valor={formatarMoeda(resumo.totalConfirmado)} />
          {doAdministrador && <Linha rotulo="Fica com você" valor={formatarMoeda(resumo.ficaComVoce)} forte />}
        </dl>
        <p className="text-[13px] text-suave">
          {dados.aulas.filter((a) => a.status === "agendada").length} aulas · {dados.presencas.length} presenças · só
          pagamentos confirmados
          {resumo.aReceber > 0 ? ` (falta confirmar ${formatarMoeda(resumo.aReceber)})` : ""}
        </p>
      </Cartao>

      <button
        type="button"
        onClick={() => setVerDetalhes((v) => !v)}
        className="flex items-center justify-center gap-1.5 self-start rounded-xl px-2 py-1.5 text-sm font-semibold text-marinho-700 hover:bg-marinho-50"
      >
        {verDetalhes ? "Ocultar detalhes" : "Ver aulas, alunos e pagamentos"}
        <ChevronDown className={`size-4 transition ${verDetalhes ? "rotate-180" : ""}`} />
      </button>

      {/* Detalhes (só quando pedir) */}
      {verDetalhes && (
      <section>
        <Abas<Aba>
          className="mb-4 max-w-md"
          abas={[
            { valor: "aulas", rotulo: "Aulas", contador: dados.aulas.length },
            { valor: "alunos", rotulo: "Alunos", contador: dados.alunos.length },
            { valor: "pagamentos", rotulo: "Pagamentos", contador: pagamentosConfirmados.length },
          ]}
          ativa={aba}
          aoMudar={setAba}
        />
        {carregando ? (
          <EsqueletoLista />
        ) : aba === "aulas" ? (
          dados.aulas.length ? (
            <ul className="grid gap-3 lg:grid-cols-2">
              {dados.aulas.map((aula) => (
                <li key={aula.id}>
                  <CartaoAulaRelatorio
                    aula={aula}
                    nomeTurma={turmaPorId.get(aula.turmaId)?.nome ?? "Aula"}
                    presencas={dados.presencas.filter((p) => p.aulaId === aula.id)}
                    pagamentoPorId={dados.pagamentoPorId}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EstadoVazio icone={CalendarDays} titulo="Nenhuma aula dada neste período" compacto />
          )
        ) : aba === "alunos" ? (
          dados.alunos.length ? (
            <ul className="grid gap-2 md:grid-cols-2">
              {dados.alunos.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-linha/70">
                  <Avatar nome={a.nome} tamanho="pequeno" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.nome}</p>
                    <p className="text-[13px] text-suave">
                      {a.presencas} {a.presencas === 1 ? "presença" : "presenças"}
                      {a.pago ? ` · ${formatarMoeda(a.pago)} pago` : ""}
                    </p>
                  </div>
                  {a.aPagar > 0 && <Selo tom="amarelo">{formatarMoeda(a.aPagar)} a pagar</Selo>}
                </li>
              ))}
            </ul>
          ) : (
            <EstadoVazio icone={Users} titulo="Nenhum aluno neste período" compacto />
          )
        ) : pagamentosConfirmados.length ? (
          <ul className="grid gap-2 lg:grid-cols-2">
            {pagamentosConfirmados.map((p) => (
              <li key={p.id}>
                <ItemPagamento pagamento={p} mostrarAluno detalhe={`Confirmado em ${formatarData(diaDaConfirmacao(p))}`} />
              </li>
            ))}
          </ul>
        ) : (
          <EstadoVazio icone={Receipt} titulo="Nenhum pagamento confirmado neste período" compacto />
        )}
      </section>
      )}
    </div>
  );
}

function Linha({ rotulo, valor, forte = false }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className={forte ? "font-semibold" : "text-suave"}>{rotulo}</dt>
      <dd className={`numeros ${forte ? "font-bold" : "font-semibold"}`}>{valor}</dd>
    </div>
  );
}

/** Aula do período com a lista de presença e a situação de cada Day Use */
function CartaoAulaRelatorio({
  aula,
  nomeTurma,
  presencas,
  pagamentoPorId,
}: {
  aula: Aula;
  nomeTurma: string;
  presencas: Presenca[];
  pagamentoPorId: Map<string, Pagamento>;
}) {
  const cancelada = aula.status === "cancelada";
  return (
    <div className={`rounded-3xl bg-white p-4 ring-1 ring-linha/70 ${cancelada ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-titulo text-lg font-bold leading-tight">{nomeTurma}</p>
          <p className="text-[13px] text-suave">
            {formatarDataExtenso(aula.data)} · {aula.horarioInicio}–{aula.horarioFim}
          </p>
        </div>
        {cancelada ? (
          <Selo tom="vermelho">Cancelada</Selo>
        ) : ehDiaExtra(aula) ? (
          <Selo tom="amarelo">Dia extra</Selo>
        ) : (
          <span className="numeros shrink-0 text-sm font-semibold">
            {presencas.length} {presencas.length === 1 ? "presença" : "presenças"}
          </span>
        )}
      </div>
      {presencas.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-linha/60">
          {presencas.map((p) => {
            const pg = p.pagamentoId ? pagamentoPorId.get(p.pagamentoId) : undefined;
            const rotulo = pg ? ROTULOS_SITUACAO_COBRANCA[situacaoCobranca(pg)] : null;
            return (
              <li key={p.id} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.alunoNome}</span>
                <span className="text-xs text-suave">
                  {pg ? formatarMoeda(pg.valor) : ROTULOS_TIPO_PRESENCA[p.tipo]}
                </span>
                {rotulo ? (
                  <Selo tom={rotulo.tom}>{rotulo.rotulo}</Selo>
                ) : (
                  <Selo tom="escuro">Mensalista</Selo>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
