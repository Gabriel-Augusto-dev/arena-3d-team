"use client";

import { useState } from "react";
import { CalendarCheck2, Clock, Hourglass, Lock, MapPin, Sparkles, Ticket, TriangleAlert, UserRound, Users } from "lucide-react";
import type { AulaDoAluno } from "@/ganchos/useAgendaAluno";
import { Folha } from "@/componentes/interface/Folha";
import { Botao, BotaoLink } from "@/componentes/interface/Botao";
import { CarimboEnviado } from "@/componentes/pagamentos/CarimboEnviado";
import { FolhaPagarCobrancas } from "@/componentes/pagamentos/FolhaPagarCobrancas";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { useDadosAluno } from "@/contextos/ContextoDadosAluno";
import { formatarDataExtenso } from "@/lib/utilitarios/datas";
import { formatarMoeda } from "@/lib/utilitarios/formatadores";
import { descreverQuadra, nomeDoProfessor, ROTULOS_NIVEL } from "@/servicos/regras/regrasAula";
import { situacaoCobranca, somaValores } from "@/servicos/regras/regrasPagamento";
import { desmarcarPresenca, marcarExperimental, marcarPresenca } from "@/servicos/servicoPresencas";
import type { Pagamento } from "@/tipos";

type Etapa = "detalhes" | "day_use_marcado" | "experimental_marcada";

/**
 * Detalhes da aula para o aluno: marcar presença (mensalista ou Day Use),
 * experimental, pagar agora ou depois e desmarcar.
 */
export function FolhaPresenca({ item, aoFechar }: { item: AulaDoAluno; aoFechar(): void }) {
  const { aluno, configuracoes, meusPagamentos, registrarLocal } = useDadosAluno();
  const avisos = useAvisos();
  const [etapa, setEtapa] = useState<Etapa>("detalhes");
  const [enviando, setEnviando] = useState(false);
  const [pagar, setPagar] = useState<Pagamento[] | null>(null);
  const { aula, turma, situacao, cobranca } = item;

  const executar = async (acao: () => Promise<unknown>, depois?: () => void) => {
    setEnviando(true);
    try {
      await acao();
      depois?.();
    } catch (erro) {
      avisos.erro(erro);
    } finally {
      setEnviando(false);
    }
  };

  const marcar = () =>
    executar(
      async () => {
        const { presenca, cobranca } = await marcarPresenca(aluno, aula);
        registrarLocal({ presencas: [presenca], pagamentos: cobranca ? [cobranca] : [] });
      },
      () => {
        if (situacao.tipo === "day_use") setEtapa("day_use_marcado");
        else {
          avisos.sucesso(`Presença marcada: ${turma?.nome ?? "aula"} às ${aula.horarioInicio}`);
          aoFechar();
        }
      },
    );

  const valor = configuracoes.valorDayUse;
  const cobrancaAtual = cobranca ?? meusPagamentos.find((p) => p.aulaId === aula.id && p.status === "pendente");

  if (pagar) return <FolhaPagarCobrancas cobrancas={pagar} aoFechar={aoFechar} />;

  let rodape: React.ReactNode = null;
  if (etapa === "day_use_marcado") {
    rodape = (
      <div className="flex gap-2">
        <Botao variante="secundario" tamanho="grande" onClick={aoFechar}>
          Pagar depois
        </Botao>
        <Botao
          variante="primario"
          tamanho="grande"
          larguraTotal
          onClick={() => cobrancaAtual && setPagar([cobrancaAtual])}
          disabled={!cobrancaAtual}
        >
          Pagar agora
        </Botao>
      </div>
    );
  } else if (etapa === "experimental_marcada") {
    rodape = (
      <Botao tamanho="grande" larguraTotal onClick={aoFechar}>
        Entendi
      </Botao>
    );
  } else if (situacao.tipo === "livre_mensalista") {
    rodape = (
      <Botao variante="destaque" tamanho="grande" larguraTotal carregando={enviando} onClick={marcar}>
        Marcar presença
      </Botao>
    );
  } else if (situacao.tipo === "mensalidade_pendente" && situacao.emAnalise) {
    rodape = (
      <BotaoLink href="/aluno/pagamentos" variante="secundario" tamanho="grande" larguraTotal>
        Ver meus pagamentos
      </BotaoLink>
    );
  } else if (situacao.tipo === "bloqueada" && !situacao.emAtraso.length) {
    rodape = (
      <BotaoLink href="/aluno/pagamentos" variante="secundario" tamanho="grande" larguraTotal>
        Ver meus pagamentos
      </BotaoLink>
    );
  } else if (situacao.tipo === "mensalidade_pendente") {
    rodape = (
      <BotaoLink href="/aluno/pagamentos" variante="primario" tamanho="grande" larguraTotal>
        Pagar mensalidade
      </BotaoLink>
    );
  } else if (situacao.tipo === "bloqueada") {
    rodape = (
      <Botao variante="primario" tamanho="grande" larguraTotal onClick={() => setPagar(situacao.emAtraso)}>
        Pagar {formatarMoeda(somaValores(situacao.emAtraso))}
      </Botao>
    );
  }

  return (
    <Folha
      aberta
      aoFechar={aoFechar}
      titulo={etapa === "detalhes" ? (turma?.nome ?? "Aula") : undefined}
      descricao={etapa === "detalhes" ? formatarDataExtenso(aula.data) : undefined}
      rodape={rodape}
    >
      {etapa === "day_use_marcado" && (
        <CarimboEnviado
          tipo="confirmado"
          titulo="Presença marcada!"
          descricao={`O Day Use de ${formatarMoeda(valor)} pode ser pago agora ou depois da aula, até a meia-noite de ${formatarDataExtenso(aula.data).toLowerCase()}. Depois disso fica em atraso.`}
        />
      )}

      {etapa === "experimental_marcada" && (
        <CarimboEnviado
          tipo="confirmado"
          titulo="Experimental marcada!"
          descricao={`Te esperamos ${formatarDataExtenso(aula.data).toLowerCase()}, às ${aula.horarioInicio}. Chegue 10 minutos antes.`}
        />
      )}

      {etapa === "detalhes" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-2xl bg-white px-4 py-3 text-sm text-suave ring-1 ring-linha/70">
            <span className="numeros inline-flex items-center gap-1.5">
              <Clock className="size-4 text-marinho-500" />
              {aula.horarioInicio} às {aula.horarioFim}
            </span>
            {descreverQuadra(turma?.local) && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-marinho-500" />
                {descreverQuadra(turma?.local)}
              </span>
            )}
            {nomeDoProfessor(aula, turma) && (
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-4 text-marinho-500" />
                Prof. {nomeDoProfessor(aula, turma)}
              </span>
            )}
            {turma && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-4 text-marinho-500" />
                {ROTULOS_NIVEL[turma.nivel]}
              </span>
            )}
          </div>

          {situacao.tipo === "livre_mensalista" && (
            <Mensagem
              icone={CalendarCheck2}
              tom="azul"
              titulo="Aula livre para você"
              texto="Sua mensalidade está em dia. Marque presença para o professor saber que você vem."
            />
          )}

          {situacao.tipo === "day_use" && (
            <div className="flex flex-col gap-3">
              {situacao.motivo === "dia_extra" && (
                <div className="rounded-2xl bg-alerta-fundo p-4 text-sm text-alerta">
                  <strong>Dia extra.</strong> Este treino é fora da agenda: todos pagam diária, inclusive mensalistas.
                </div>
              )}
              {situacao.motivo === "outra_turma" && (
                <p className="text-sm text-suave">Esta aula não é da sua turma, então entra como Day Use.</p>
              )}
              <Opcao
                icone={Ticket}
                titulo={situacao.motivo === "dia_extra" ? "Diária" : "Day Use"}
                preco={formatarMoeda(valor)}
                descricao="Marque presença agora e pague quando quiser até a meia-noite do dia da aula."
                aoEscolher={marcar}
                carregando={enviando}
                destaque
              />
              {situacao.podeExperimental && (
                <Opcao
                  icone={Sparkles}
                  titulo="Aula experimental"
                  preco="Grátis"
                  descricao="Uma vez só, para conhecer o treino."
                  aoEscolher={() =>
                    executar(
                      async () => registrarLocal({ presencas: [await marcarExperimental(aluno, aula, turma)] }),
                      () => setEtapa("experimental_marcada"),
                    )
                  }
                  carregando={enviando}
                />
              )}
            </div>
          )}

          {situacao.tipo === "mensalidade_pendente" && situacao.emAnalise && (
            <Mensagem
              icone={Hourglass}
              tom="amarelo"
              titulo="Aguardando confirmação"
              texto="Seu PIX da mensalidade está em análise. A presença libera assim que o professor confirmar o pagamento."
            />
          )}

          {situacao.tipo === "mensalidade_pendente" && !situacao.emAnalise && (
            <Mensagem
              icone={Lock}
              tom="vermelho"
              titulo="Presença bloqueada"
              texto={
                situacao.primeiroPagamento
                  ? "Sua 1ª mensalidade ainda não foi paga. Pague para marcar presença."
                  : "Sua mensalidade está atrasada. Pague para voltar a marcar presença."
              }
            />
          )}

          {situacao.tipo === "bloqueada" && !situacao.emAtraso.length && (
            <Mensagem
              icone={Hourglass}
              tom="amarelo"
              titulo="Aguardando confirmação"
              texto="Seu PIX do Day Use está em análise. A presença libera assim que o professor confirmar o pagamento."
            />
          )}

          {situacao.tipo === "bloqueada" && situacao.emAtraso.length > 0 && (
            <Mensagem
              icone={Lock}
              tom="vermelho"
              titulo="Presença bloqueada"
              texto={`Você tem ${situacao.emAtraso.length === 1 ? "um Day Use" : `${situacao.emAtraso.length} Day Use`} em atraso (${formatarMoeda(somaValores(situacao.emAtraso))}). Pague para voltar a marcar presença.`}
            />
          )}

          {situacao.tipo === "confirmada" && (
            <div className="flex flex-col gap-3">
              <Mensagem
                icone={CalendarCheck2}
                tom="verde"
                titulo={situacao.presenca.tipo === "experimental" ? "Experimental marcada" : "Presença marcada"}
                texto="O professor já sabe que você vem."
              />
              {cobranca && <StatusCobranca cobranca={cobranca} aoPagar={() => setPagar([cobranca])} />}
              {situacao.podeDesmarcar && (
                <Botao
                  variante="fantasma"
                  larguraTotal
                  carregando={enviando}
                  onClick={() =>
                    executar(
                      async () => registrarLocal({ presencas: [await desmarcarPresenca(situacao.presenca)] }),
                      () => {
                        avisos.sucesso("Presença desmarcada");
                        aoFechar();
                      },
                    )
                  }
                >
                  Não vou mais — desmarcar presença
                </Botao>
              )}
            </div>
          )}

          {situacao.tipo === "aula_cancelada" && (
            <Mensagem
              icone={TriangleAlert}
              tom="vermelho"
              titulo="Aula cancelada"
              texto={situacao.motivo ? `Motivo: ${situacao.motivo}` : "O professor cancelou esta aula."}
            />
          )}

          {situacao.tipo === "encerrada" && (
            <Mensagem icone={Clock} tom="cinza" titulo="Aula encerrada" texto="Esta aula já terminou." />
          )}
        </div>
      )}
    </Folha>
  );
}

function StatusCobranca({ cobranca, aoPagar }: { cobranca: Pagamento; aoPagar(): void }) {
  const s = situacaoCobranca(cobranca);
  if (s === "pago") return <p className="text-sm font-semibold text-ok">Day Use pago. Obrigado!</p>;
  if (s === "em_analise")
    return <p className="text-sm text-suave">PIX do Day Use enviado. Aguardando o professor conferir.</p>;
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl p-4 ${s === "em_atraso" ? "bg-erro-fundo" : "bg-alerta-fundo"}`}>
      <div>
        <p className={`font-bold ${s === "em_atraso" ? "text-erro" : "text-alerta"}`}>
          Day Use {s === "em_atraso" ? "em atraso" : "a pagar"}
        </p>
        <p className="numeros text-sm text-suave">{formatarMoeda(cobranca.valor)}</p>
      </div>
      <Botao variante="primario" tamanho="pequeno" onClick={aoPagar}>
        Pagar agora
      </Botao>
    </div>
  );
}

function Opcao({
  icone: Icone,
  titulo,
  preco,
  descricao,
  aoEscolher,
  destaque = false,
  carregando = false,
}: {
  icone: typeof Ticket;
  titulo: string;
  preco: string;
  descricao: string;
  aoEscolher(): void;
  destaque?: boolean;
  carregando?: boolean;
}) {
  return (
    <button
      onClick={aoEscolher}
      disabled={carregando}
      className={`flex items-center gap-4 rounded-3xl p-4 text-left transition active:scale-[0.99] disabled:opacity-60 ${
        destaque ? "bg-marinho-900 text-white hover:bg-marinho-800" : "bg-white ring-1 ring-linha hover:ring-marinho-200"
      }`}
    >
      <span
        className={`grid size-12 shrink-0 place-items-center rounded-2xl ${
          destaque ? "bg-laranja-500 text-marinho-950" : "bg-marinho-100 text-marinho-700"
        }`}
      >
        <Icone className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-titulo text-xl font-bold">{titulo}</span>
          <span className={`numeros font-titulo text-xl font-extrabold ${destaque ? "text-laranja-400" : "text-marinho-600"}`}>
            {preco}
          </span>
        </span>
        <span className={`mt-0.5 block text-sm leading-snug ${destaque ? "text-marinho-100" : "text-suave"}`}>{descricao}</span>
      </span>
    </button>
  );
}

function Mensagem({
  icone: Icone,
  tom,
  titulo,
  texto,
}: {
  icone: typeof Ticket;
  tom: "verde" | "azul" | "vermelho" | "amarelo" | "cinza";
  titulo: string;
  texto: string;
}) {
  const cores = {
    verde: "bg-ok-fundo text-ok",
    azul: "bg-marinho-100 text-marinho-800",
    vermelho: "bg-erro-fundo text-erro",
    amarelo: "bg-alerta-fundo text-alerta",
    cinza: "bg-white text-suave ring-1 ring-linha",
  };
  return (
    <div className={`flex gap-3 rounded-2xl p-4 ${cores[tom]}`}>
      <Icone className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-bold">{titulo}</p>
        <p className="mt-0.5 text-sm opacity-90">{texto}</p>
      </div>
    </div>
  );
}
