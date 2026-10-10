"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Banknote, CalendarX, Check, Hourglass, Link2, QrCode, RotateCcw, Search, UserMinus, UserPlus } from "lucide-react";
import type { Aula, Pagamento, Presenca, Usuario } from "@/tipos";
import { useAutenticacao, useUsuarioLogado } from "@/contextos/ContextoAutenticacao";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { Folha } from "@/componentes/interface/Folha";
import { Botao } from "@/componentes/interface/Botao";
import { Campo, CampoTexto } from "@/componentes/interface/Campos";
import { Avatar, Selo } from "@/componentes/interface/Elementos";
import { aulaJaComecou, formatarDataExtenso, hojeISO } from "@/lib/utilitarios/datas";
import { contemTexto, formatarMoeda, formatarTelefone, primeiroNome, somenteNumeros } from "@/lib/utilitarios/formatadores";
import { ROTULOS_SITUACAO_COBRANCA } from "@/lib/rotulos";
import {
  aulaEncerrada,
  descreverQuadra,
  ehDiaExtra,
  mensalistasSemPresenca,
  presencasDaAula,
  ROTULOS_TIPO_PRESENCA,
  tipoPresencaPeloProfessor,
} from "@/servicos/regras/regrasAula";
import { ehMensalistaDaTurma } from "@/servicos/regras/regrasMensalidade";
import { situacaoCobranca } from "@/servicos/regras/regrasPagamento";
import { adicionarPresenca, cancelarAula, reativarAula, removerPresenca, type PagamentoNaHora } from "@/servicos/servicoAulas";
import { CompartilharLinkAula } from "./CompartilharLinkAula";

/** Lista de presença da aula, com a situação de pagamento de cada Day Use */
export function FolhaDetalheAula({ aulaId, aoFechar }: { aulaId: string; aoFechar(): void }) {
  // O professor auxiliar só acompanha: não cancela aula, não tira aluno e não confirma pagamento
  const { ehAdministrador } = useAutenticacao();
  const { aulas, turmaPorId, presencas, pagamentos, alunos } = useDadosProfessor();
  const avisos = useAvisos();
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [mostrarLink, setMostrarLink] = useState(false);
  // Adicionar aluno à lista: null = fechado; { aluno: null } = escolhendo o aluno
  const [adicionando, setAdicionando] = useState<{ aluno: Usuario | null } | null>(null);

  const aula = aulas.find((a) => a.id === aulaId);
  if (!aula) return null;
  const turma = turmaPorId.get(aula.turmaId);
  const lista = presencasDaAula(aula, presencas);
  const faltamMarcar = mensalistasSemPresenca(aula, presencas, alunos);
  const cancelada = aula.status === "cancelada";
  const jaComecou = aulaJaComecou(aula.data, aula.horarioInicio);
  const diaExtra = ehDiaExtra(aula);
  // Sem custo é a presença gravada como mensalista (no dia extra todos pagam diária)
  const ehMensalistaSemCusto = (p: Presenca) => !diaExtra && p.tipo === "mensalista";
  const pagamentoDe = (p: Presenca) => (p.pagamentoId ? pagamentos.find((x) => x.id === p.pagamentoId) : undefined);

  // Contagem das 4 situações: mensalista, a pagar, pago (aguardando conferência) e confirmado
  const contagem = { mensalista: 0, aPagar: 0, pago: 0, confirmado: 0 };
  for (const p of lista) {
    if (ehMensalistaSemCusto(p)) {
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

  if (adicionando && ehAdministrador && !cancelada) {
    return (
      <FolhaAdicionarAluno
        aula={aula}
        nomeTurma={turma?.nome ?? "Aula"}
        idsNaLista={new Set(lista.map((p) => p.alunoId))}
        escolhidoInicial={adicionando.aluno}
        aoVoltar={() => setAdicionando(null)}
        aoFechar={aoFechar}
      />
    );
  }

  return (
    <Folha
      aberta
      larga
      aoFechar={aoFechar}
      titulo={turma?.nome ?? "Aula"}
      descricao={`${formatarDataExtenso(aula.data)}, ${aula.horarioInicio} às ${aula.horarioFim}${turma?.local ? ` · ${descreverQuadra(turma.local)}` : ""}`}
      rodape={
        !ehAdministrador ? undefined : cancelada ? (
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
                    await cancelarAula(aula, turma, motivo.trim(), presencas, alunos);
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

        {!ehAdministrador && (
          <p className="rounded-2xl bg-marinho-50 px-4 py-3 text-sm text-marinho-800">
            Você acompanha a lista e quem já pagou. Quem confirma os pagamentos é o professor responsável.
          </p>
        )}

        {diaExtra && !cancelada && !cancelando && (
          <p className="rounded-2xl bg-alerta-fundo px-4 py-3 text-sm text-alerta">
            <strong>Dia extra:</strong> todos pagam diária, inclusive mensalistas.
          </p>
        )}

        {/* Link da lista de presença: o professor copia e envia no WhatsApp */}
        {!cancelada && !cancelando && !aulaEncerrada(aula) &&
          (diaExtra || mostrarLink ? (
            <CompartilharLinkAula aula={aula} />
          ) : (
            <Botao variante="secundario" icone={Link2} larguraTotal onClick={() => setMostrarLink(true)}>
              Gerar link da lista de presença
            </Botao>
          ))}

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
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="flex items-baseline gap-2 font-titulo text-lg font-bold">
                  Presenças
                  <span className="numeros font-sans text-sm font-semibold text-suave">{lista.length} alunos</span>
                </h3>
                {ehAdministrador && !cancelada && (
                  <Botao variante="secundario" tamanho="pequeno" icone={UserPlus} onClick={() => setAdicionando({ aluno: null })}>
                    Adicionar aluno
                  </Botao>
                )}
              </div>
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
                  {ehAdministrador && " Se alguém veio sem marcar, toque em “Adicionar aluno”."}
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {lista.map((p) => {
                    const ehMensalista = ehMensalistaSemCusto(p);
                    return (
                      <LinhaPresenca
                        key={p.id}
                        presenca={p}
                        ehMensalista={ehMensalista}
                        pagamento={pagamentoDe(p)}
                        ocupado={ocupado}
                        aoRemover={
                          ehAdministrador && !cancelada
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
                {ehAdministrador ? (
                  <>
                    <ul className="flex flex-wrap gap-1.5">
                      {faltamMarcar.map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => setAdicionando({ aluno: a })}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold ring-1 ring-linha transition hover:ring-marinho-300"
                          >
                            <UserPlus className="size-3.5 text-marinho-600" />
                            {a.nome}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-xs text-suave">Toque no nome para colocar na lista.</p>
                  </>
                ) : (
                  <p className="text-sm leading-relaxed text-suave">{faltamMarcar.map((a) => a.nome).join(", ")}</p>
                )}
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
  aoRemover,
}: {
  presenca: Presenca;
  ehMensalista: boolean;
  pagamento?: Pagamento;
  ocupado: string | null;
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

/**
 * Professor coloca na lista um aluno que veio sem marcar pelo app.
 * 1) escolhe o aluno  2) se for Day Use, diz se já pagou  3) confirma.
 */
function FolhaAdicionarAluno({
  aula,
  nomeTurma,
  idsNaLista,
  escolhidoInicial,
  aoVoltar,
  aoFechar,
}: {
  aula: Aula;
  nomeTurma: string;
  idsNaLista: Set<string>;
  escolhidoInicial: Usuario | null;
  aoVoltar(): void;
  aoFechar(): void;
}) {
  const professor = useUsuarioLogado();
  const { alunos, configuracoes } = useDadosProfessor();
  const avisos = useAvisos();
  const [busca, setBusca] = useState("");
  const [escolhido, setEscolhido] = useState<Usuario | null>(escolhidoInicial);
  const [pagamento, setPagamento] = useState<PagamentoNaHora>("a_pagar");
  const [salvando, setSalvando] = useState(false);

  // Alunos ativos que ainda não estão na lista; mensalistas desta turma primeiro
  const candidatos = useMemo(() => {
    const daTurma = (a: Usuario) => (ehMensalistaDaTurma(a, aula.turmaId) ? 0 : 1);
    const numeros = somenteNumeros(busca);
    return alunos
      .filter((a) => a.ativo && !idsNaLista.has(a.id))
      .filter(
        (a) =>
          !busca.trim() ||
          contemTexto(a.nome, busca) ||
          (numeros.length >= 3 && (a.whatsapp.includes(numeros) || a.cpf.includes(numeros))),
      )
      .sort((a, b) => daTurma(a) - daTurma(b) || a.nome.localeCompare(b.nome, "pt-BR"));
  }, [alunos, idsNaLista, busca, aula.turmaId]);

  const tipo = escolhido ? tipoPresencaPeloProfessor(aula, escolhido, configuracoes) : null;
  const aulaPassou = aula.data < hojeISO();

  const salvar = async () => {
    if (!escolhido) return;
    setSalvando(true);
    try {
      const gravado = await adicionarPresenca(escolhido.id, aula, professor.id, pagamento);
      avisos.sucesso(
        gravado === "mensalista"
          ? `${primeiroNome(escolhido.nome)} entrou na lista`
          : pagamento === "a_pagar"
            ? `${primeiroNome(escolhido.nome)} entrou na lista · Day Use a pagar`
            : `${primeiroNome(escolhido.nome)} entrou na lista · Day Use pago`,
      );
      aoVoltar();
    } catch (erro) {
      avisos.erro(erro);
      setSalvando(false);
    }
  };

  const descricaoAula = `${nomeTurma} · ${formatarDataExtenso(aula.data)}, ${aula.horarioInicio}`;

  if (!escolhido) {
    return (
      <Folha
        aberta
        aoFechar={aoFechar}
        titulo="Adicionar aluno"
        descricao={descricaoAula}
        rodape={
          <Botao variante="secundario" tamanho="grande" larguraTotal onClick={aoVoltar}>
            Voltar para a lista
          </Botao>
        }
      >
        <div className="flex flex-col gap-3">
          <Campo
            icone={Search}
            type="search"
            placeholder="Nome, CPF ou WhatsApp"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar aluno"
          />
          {candidatos.length ? (
            <ul className="flex flex-col gap-1.5">
              {candidatos.map((a) => {
                const daTurma = ehMensalistaDaTurma(a, aula.turmaId);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setEscolhido(a);
                        setPagamento("a_pagar");
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl bg-white p-2.5 text-left ring-1 ring-linha/60 transition hover:ring-marinho-300"
                    >
                      <Avatar nome={a.nome} tamanho="pequeno" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{a.nome}</span>
                        <span className="block truncate text-xs text-suave">
                          {daTurma ? "Mensalista desta turma" : a.plano === "mensalista" ? "Mensalista de outra turma" : "Avulso"}
                          {a.whatsapp ? ` · ${formatarTelefone(a.whatsapp)}` : ""}
                        </span>
                      </span>
                      <UserPlus className="size-5 shrink-0 text-marinho-600" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-2xl bg-white/60 px-4 py-3 text-sm text-suave ring-1 ring-linha/60">
              {busca.trim()
                ? "Nenhum aluno encontrado. Se ele ainda não tem cadastro, crie em Alunos → Novo aluno."
                : "Todos os alunos ativos já estão na lista."}
            </p>
          )}
        </div>
      </Folha>
    );
  }

  const opcoes: { valor: PagamentoNaHora; titulo: string; texto: string; icone: typeof Banknote }[] = [
    {
      valor: "a_pagar",
      titulo: "Ainda não pagou",
      texto: aulaPassou
        ? "Fica em atraso e bloqueia novas presenças até ele pagar."
        : `Fica a pagar até a meia-noite de ${formatarDataExtenso(aula.data).toLowerCase()}.`,
      icone: Hourglass,
    },
    { valor: "dinheiro", titulo: "Pagou em dinheiro", texto: "Já entra como pago.", icone: Banknote },
    { valor: "pix", titulo: "Pagou por PIX", texto: "Você já conferiu o PIX: entra como pago.", icone: QrCode },
  ];

  return (
    <Folha
      aberta
      aoFechar={aoFechar}
      titulo="Adicionar aluno"
      descricao={descricaoAula}
      rodape={
        <div className="flex gap-2">
          <Botao variante="secundario" tamanho="grande" onClick={() => setEscolhido(null)} disabled={salvando}>
            Trocar
          </Botao>
          <Botao tamanho="grande" larguraTotal icone={Check} carregando={salvando} onClick={salvar}>
            Colocar na lista
          </Botao>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-linha/70">
          <Avatar nome={escolhido.nome} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{escolhido.nome}</p>
            <p className="truncate text-[13px] text-suave">
              {tipo === "mensalista" ? "Mensalista em dia" : `Day Use · ${formatarMoeda(configuracoes.valorDayUse)}`}
            </p>
          </div>
          {tipo === "mensalista" ? <Selo tom="escuro">Sem custo</Selo> : <Selo tom="amarelo">Day Use</Selo>}
        </div>

        {tipo === "mensalista" ? (
          <p className="rounded-2xl bg-ok-fundo px-4 py-3 text-sm text-ok">
            A mensalidade está em dia: entra na lista <strong>sem custo</strong>.
          </p>
        ) : (
          <>
            <p className="text-sm text-suave">
              {ehDiaExtra(aula)
                ? "Dia extra: todos pagam diária, inclusive mensalistas."
                : ehMensalistaDaTurma(escolhido, aula.turmaId)
                  ? "A mensalidade desta turma não está em dia, então entra como Day Use."
                  : escolhido.plano === "mensalista"
                    ? "Esta aula não é da turma dele, então entra como Day Use."
                    : "Aluno avulso: entra como Day Use."}{" "}
              Ele já pagou?
            </p>
            <div role="radiogroup" aria-label="Pagamento do Day Use" className="flex flex-col gap-2">
              {opcoes.map((o) => {
                const ativo = pagamento === o.valor;
                return (
                  <button
                    key={o.valor}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => setPagamento(o.valor)}
                    className={`flex items-center gap-3 rounded-2xl p-3 text-left ring-2 transition ${
                      ativo ? "bg-marinho-50 ring-marinho-600" : "bg-white ring-linha/70 hover:ring-marinho-200"
                    }`}
                  >
                    <o.icone className={`size-5 shrink-0 ${ativo ? "text-marinho-700" : "text-suave"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{o.titulo}</span>
                      <span className="block text-[13px] text-suave">{o.texto}</span>
                    </span>
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full ring-2 ${
                        ativo ? "bg-marinho-600 ring-marinho-600" : "ring-linha"
                      }`}
                    >
                      {ativo && <Check className="size-3 text-white" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Folha>
  );
}
