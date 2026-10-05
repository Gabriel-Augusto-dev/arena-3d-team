"use client";

import { useState } from "react";
import Link from "next/link";
import { Banknote, CalendarX, CircleCheck, RotateCcw, UserMinus } from "lucide-react";
import type { Pagamento, Presenca } from "@/tipos";
import { useUsuarioLogado } from "@/contextos/ContextoAutenticacao";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { Folha } from "@/componentes/interface/Folha";
import { Botao } from "@/componentes/interface/Botao";
import { CampoTexto } from "@/componentes/interface/Campos";
import { Avatar, Selo } from "@/componentes/interface/Elementos";
import { aulaJaComecou, formatarDataExtenso } from "@/lib/utilitarios/datas";
import { formatarMoeda } from "@/lib/utilitarios/formatadores";
import { ROTULOS_SITUACAO_COBRANCA } from "@/lib/rotulos";
import { mensalistasSemPresenca, presencasDaAula, ROTULOS_TIPO_PRESENCA } from "@/servicos/regras/regrasAula";
import { situacaoCobranca } from "@/servicos/regras/regrasPagamento";
import { cancelarAula, reativarAula, removerPresenca } from "@/servicos/servicoAulas";
import { confirmarPagamento } from "@/servicos/servicoPagamentos";

/** Lista de presença da aula, com a situação de pagamento de cada Day Use */
export function FolhaDetalheAula({ aulaId, aoFechar }: { aulaId: string; aoFechar(): void }) {
  const professor = useUsuarioLogado();
  const { aulas, turmaPorId, presencas, pagamentos, alunos, alunoPorId } = useDadosProfessor();
  const avisos = useAvisos();
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);

  const aula = aulas.find((a) => a.id === aulaId);
  if (!aula) return null;
  const turma = turmaPorId.get(aula.turmaId);
  const lista = presencasDaAula(aula, presencas);
  const faltamMarcar = mensalistasSemPresenca(aula, presencas, alunos);
  const cancelada = aula.status === "cancelada";
  const jaComecou = aulaJaComecou(aula.data, aula.horarioInicio);
  const pagamentoDe = (p: Presenca) => (p.pagamentoId ? pagamentos.find((x) => x.id === p.pagamentoId) : undefined);

  // Contagem das 4 situações: mensalista, a pagar, pago (aguardando conferência) e confirmado
  const contagem = { mensalista: 0, aPagar: 0, pago: 0, confirmado: 0 };
  for (const p of lista) {
    if (alunoPorId.get(p.alunoId)?.plano === "mensalista") {
      contagem.mensalista++;
      continue;
    }
    const pg = pagamentoDe(p);
    if (!pg) continue;
    const sit = situacaoCobranca(pg);
    if (sit === "pago") contagem.confirmado++;
    else if (sit === "em_analise") contagem.pago++;
    else if (sit === "a_pagar" || sit === "em_atraso") contagem.aPagar++;
  }

  const executar = async (chave: string, acao: () => Promise<unknown>, mensagem: string) => {
    setOcupado(chave);
    try {
      await acao();
      avisos.sucesso(mensagem);
    } catch (erro) {
      avisos.erro(erro);
    } finally {
      setOcupado(null);
    }
  };

  return (
    <Folha
      aberta
      larga
      aoFechar={aoFechar}
      titulo={turma?.nome ?? "Aula"}
      descricao={`${formatarDataExtenso(aula.data)}, ${aula.horarioInicio} às ${aula.horarioFim}${turma?.local ? ` · ${turma.local}` : ""}`}
      rodape={
        cancelada ? (
          <Botao
            variante="secundario"
            tamanho="grande"
            larguraTotal
            icone={RotateCcw}
            carregando={ocupado === "reativar"}
            onClick={() => executar("reativar", () => reativarAula(aula), "Aula reativada")}
          >
            Reativar aula
          </Botao>
        ) : cancelando ? (
          <div className="flex gap-2">
            <Botao variante="secundario" tamanho="grande" onClick={() => setCancelando(false)}>
              Voltar
            </Botao>
            <Botao
              variante="perigo"
              tamanho="grande"
              larguraTotal
              carregando={ocupado === "cancelar"}
              onClick={() =>
                executar(
                  "cancelar",
                  async () => {
                    await cancelarAula(aula, turma!, motivo.trim(), presencas, alunos);
                    setCancelando(false);
                  },
                  "Aula cancelada. Alunos avisados",
                )
              }
            >
              Cancelar e avisar alunos
            </Botao>
          </div>
        ) : (
          !jaComecou && (
            <Botao variante="perigo" tamanho="grande" larguraTotal icone={CalendarX} onClick={() => setCancelando(true)}>
              Cancelar aula
            </Botao>
          )
        )
      }
    >
      <div className="flex flex-col gap-5">
        {cancelada && (
          <p className="rounded-2xl bg-erro-fundo px-4 py-3 text-sm text-erro">
            <strong>Aula cancelada.</strong> {aula.motivoCancelamento && `Motivo: ${aula.motivoCancelamento}`}
          </p>
        )}

        {cancelando ? (
          <CampoTexto
            rotulo="Motivo (vai na notificação dos alunos)"
            placeholder="Ex.: previsão de chuva forte"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            dica="Quem marcou presença e os mensalistas da turma serão avisados. Day Use não pagos são cancelados."
            autoFocus
          />
        ) : (
          <>
            <section>
              <h3 className="mb-2 flex items-baseline justify-between font-titulo text-lg font-bold">
                Presenças
                <span className="numeros font-sans text-sm font-semibold text-suave">{lista.length} alunos</span>
              </h3>
              <ResumoPresencas
                itens={[
                  { rotulo: "Mensalista", tom: "escuro", total: contagem.mensalista },
                  { rotulo: "A pagar", tom: "amarelo", total: contagem.aPagar },
                  { rotulo: "Pago", tom: "azul", total: contagem.pago },
                  { rotulo: "Confirmado", tom: "verde", total: contagem.confirmado },
                ]}
              />
              {lista.length === 0 ? (
                <p className="rounded-2xl bg-white/60 px-4 py-3 text-sm text-suave ring-1 ring-linha/60">
                  Ninguém marcou presença ainda.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {lista.map((p) => {
                    const aluno = alunoPorId.get(p.alunoId);
                    const ehMensalista = aluno?.plano === "mensalista";
                    return (
                      <LinhaPresenca
                        key={p.id}
                        presenca={p}
                        ehMensalista={ehMensalista}
                        pagamento={pagamentoDe(p)}
                        ocupado={ocupado}
                        aoReceber={(pg) =>
                          executar(p.id + "receber", () => confirmarPagamento(pg, professor.id, "dinheiro"), `Day Use de ${p.alunoNome} recebido`)
                        }
                        aoRemover={
                          !cancelada
                            ? () => executar(p.id, () => removerPresenca(p), `${p.alunoNome} removido da lista`)
                            : undefined
                        }
                      />
                    );
                  })}
                </ul>
              )}
            </section>

            {faltamMarcar.length > 0 && !cancelada && (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-suave">
                  Mensalistas da turma que não marcaram ({faltamMarcar.length})
                </h3>
                <p className="text-sm leading-relaxed text-suave">{faltamMarcar.map((a) => a.nome).join(", ")}</p>
              </section>
            )}
          </>
        )}
      </div>
    </Folha>
  );
}

function LinhaPresenca({
  presenca: p,
  ehMensalista,
  pagamento,
  ocupado,
  aoReceber,
  aoRemover,
}: {
  presenca: Presenca;
  ehMensalista: boolean;
  pagamento?: Pagamento;
  ocupado: string | null;
  aoReceber(pagamento: Pagamento): void;
  aoRemover?(): void;
}) {
  const situacao = !ehMensalista && pagamento ? situacaoCobranca(pagamento) : null;
  const rotulo = situacao ? ROTULOS_SITUACAO_COBRANCA[situacao] : null;

  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-white p-2.5 ring-1 ring-linha/60">
      {/* linha principal: avatar + nome + selo */}
      <div className="flex items-center gap-3">
        <Avatar nome={p.alunoNome} tamanho="pequeno" />
        <div className="min-w-0 flex-1">
          <Link href={`/professor/alunos/${p.alunoId}`} className="block truncate text-[15px] font-semibold hover:underline">
            {p.alunoNome}
          </Link>
          <p className="text-xs text-suave">
            {ehMensalista ? "Mensalista" : ROTULOS_TIPO_PRESENCA[p.tipo]}
            {!ehMensalista && pagamento ? ` · ${formatarMoeda(pagamento.valor)}` : ""}
          </p>
        </div>
        {ehMensalista ? (
          <Selo tom="escuro">Mensalista</Selo>
        ) : rotulo ? (
          <Selo tom={rotulo.tom}>{rotulo.rotulo}</Selo>
        ) : null}
      </div>

      {/* linha de ações */}
      {aoRemover && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={aoRemover}
            aria-label={`Remover ${p.alunoNome} da lista`}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-suave transition hover:bg-marinho-100/70 hover:text-erro disabled:opacity-50"
            disabled={ocupado === p.id}
          >
            {ocupado === p.id ? (
              <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <UserMinus className="size-5" strokeWidth={2.2} />
            )}
          </button>
        </div>
      )}
    </li>
  );
}

const CORES_RESUMO: Record<string, string> = {
  escuro: "bg-marinho-900 text-white",
  amarelo: "bg-alerta-fundo text-alerta",
  azul: "bg-marinho-100 text-marinho-700",
  verde: "bg-ok-fundo text-ok",
};

/** As 4 situações da lista de presença, lado a lado */
function ResumoPresencas({ itens }: { itens: { rotulo: string; tom: string; total: number }[] }) {
  return (
    <div className="mb-3 grid grid-cols-4 gap-1.5">
      {itens.map((i) => (
        <div key={i.rotulo} className={`flex flex-col items-center rounded-xl px-1 py-2 ${CORES_RESUMO[i.tom]}`}>
          <span className="numeros font-titulo text-lg font-bold leading-none">{i.total}</span>
          <span className="mt-1 text-[11px] font-semibold leading-tight">{i.rotulo}</span>
        </div>
      ))}
    </div>
  );
}
