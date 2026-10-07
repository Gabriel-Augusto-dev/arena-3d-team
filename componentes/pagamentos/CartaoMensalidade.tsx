"use client";

import { useState } from "react";
import { CalendarClock, Hourglass } from "lucide-react";
import { useDadosAluno, type MensalidadeDoAluno } from "@/contextos/ContextoDadosAluno";
import { Selo } from "@/componentes/interface/Elementos";
import { Botao } from "@/componentes/interface/Botao";
import { TONS_MENSALIDADE } from "@/lib/rotulos";
import { descreverDiasSemana, formatarDataHora } from "@/lib/utilitarios/datas";
import { formatarMoeda, linkWhatsapp } from "@/lib/utilitarios/formatadores";
import { FolhaPagarMensalidade } from "./FolhaPagarMensalidade";

/** Situação das mensalidades do aluno (uma por turma) + botão de pagar */
export function CartaoMensalidade() {
  const { aluno, mensalidades, configuracoes } = useDadosAluno();

  if (!mensalidades.length) {
    return (
      <div className="rounded-3xl bg-areia-100 p-5">
        <div className="flex items-center justify-between">
          <p className="font-titulo text-lg font-bold">Aluno avulso</p>
          <Selo tom="azul">Day Use</Selo>
        </div>
        <p className="mt-2 text-[15px] text-marinho-900/80">
          Treine em qualquer aula por {formatarMoeda(configuracoes.valorDayUse)}.
        </p>
        {configuracoes.whatsappContato && (
          <a
            href={linkWhatsapp(configuracoes.whatsappContato, `Olá! Sou ${aluno.nome} e quero virar mensalista na 3D Team.`)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-marinho-700 underline-offset-2 hover:underline"
          >
            Quero ser mensalista
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {mensalidades.map((item) => (
        <CartaoUmaMensalidade key={item.turma.id} item={item} />
      ))}
    </div>
  );
}

function CartaoUmaMensalidade({ item }: { item: MensalidadeDoAluno }) {
  const { configuracoes } = useDadosAluno();
  const [pagando, setPagando] = useState(false);
  const { turma: minhaTurma, situacao: s, emAnalise: mensalidadeEmAnalise, valor } = item;

  const progresso =
    s.diasRestantes !== null && s.diasRestantes >= 0
      ? Math.min(100, Math.round((s.diasRestantes / configuracoes.diasCicloMensalidade) * 100))
      : 0;
  const precisaPagar = !mensalidadeEmAnalise && ["vence_em_breve", "atrasada", "sem_pagamento"].includes(s.status);

  return (
    <div className={`rounded-3xl p-5 ${s.status === "atrasada" || s.status === "sem_pagamento" ? "bg-erro-fundo" : "bg-white ring-1 ring-linha/70"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-titulo text-lg font-bold">Mensalidade · {minhaTurma.nome}</p>
        {mensalidadeEmAnalise ? (
          <Selo tom="amarelo" ponto>
            Em análise
          </Selo>
        ) : (
          <Selo tom={TONS_MENSALIDADE[s.status]} ponto>
            {s.rotulo}
          </Selo>
        )}
      </div>

      <p className="mt-1 text-sm text-suave">
        {descreverDiasSemana(minhaTurma.diasSemana)} às {minhaTurma.horarioInicio}
        {minhaTurma.responsavelNome ? ` · Prof. ${minhaTurma.responsavelNome}` : ""}
      </p>

      {s.diasRestantes !== null && s.diasRestantes >= 0 && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <span className="numeros font-titulo text-3xl font-extrabold tracking-tight">
              {s.diasRestantes}
              <span className="ml-1 text-base font-semibold text-suave">{s.diasRestantes === 1 ? "dia" : "dias"}</span>
            </span>
            <span className="text-[13px] text-suave">{s.descricao}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-marinho-100">
            <div
              className={`h-full rounded-full ${s.status === "vence_em_breve" ? "bg-laranja-500" : "bg-marinho-500"}`}
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      )}

      {(s.status === "atrasada" || s.status === "sem_pagamento") && (
        <p className="mt-3 flex items-start gap-2 text-[15px] font-medium text-erro">
          <CalendarClock className="mt-0.5 size-5 shrink-0" />
          {s.descricao}
        </p>
      )}

      {mensalidadeEmAnalise && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-alerta-fundo px-3 py-2.5 text-sm text-alerta">
          <Hourglass className="mt-0.5 size-4 shrink-0" />
          PIX de {formatarMoeda(mensalidadeEmAnalise.valor)} enviado em {formatarDataHora(mensalidadeEmAnalise.criadoEm)}.
          Aguardando o professor confirmar.
        </p>
      )}

      {precisaPagar && (
        <Botao
          variante={s.status === "vence_em_breve" ? "destaque" : "primario"}
          larguraTotal
          className="mt-4"
          onClick={() => setPagando(true)}
        >
          Pagar {formatarMoeda(valor)} via PIX
        </Botao>
      )}

      {pagando && <FolhaPagarMensalidade turma={minhaTurma} aoFechar={() => setPagando(false)} />}
    </div>
  );
}
