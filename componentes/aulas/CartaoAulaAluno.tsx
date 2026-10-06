"use client";

import { MapPin, UserRound } from "lucide-react";
import type { AulaDoAluno } from "@/ganchos/useAgendaAluno";
import { descreverQuadra, nomeDoProfessor, ROTULOS_NIVEL } from "@/servicos/regras/regrasAula";
import { BotaoPresenca } from "./BotaoPresenca";
import { SeloSituacaoAula } from "./SeloSituacaoAula";

export function CartaoAulaAluno({ item, aoAbrir }: { item: AulaDoAluno; aoAbrir(): void }) {
  const { aula, turma, situacao, cobranca } = item;
  const apagada = situacao.tipo === "aula_cancelada" || situacao.tipo === "encerrada";
  const marcada = situacao.tipo === "confirmada";
  const professor = nomeDoProfessor(aula, turma);
  const quadra = descreverQuadra(turma?.local);

  return (
    <div
      className={`flex items-center gap-3 rounded-3xl bg-white p-3 pr-3.5 ring-1 transition ${
        marcada ? "ring-ok/40" : "ring-linha/70"
      } ${apagada ? "opacity-60" : ""}`}
    >
      <button onClick={aoAbrir} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="grid w-14 shrink-0 place-items-center rounded-2xl bg-marinho-50 py-2">
          <span className="numeros font-titulo text-xl font-extrabold leading-none">{aula.horarioInicio}</span>
          <span className="numeros mt-0.5 text-[11px] text-suave">até {aula.horarioFim}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate font-titulo text-[19px] font-bold leading-tight ${
              situacao.tipo === "aula_cancelada" ? "line-through" : ""
            }`}
          >
            {turma?.nome ?? "Aula"}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-suave">
            {turma && ROTULOS_NIVEL[turma.nivel] !== turma.nome && <span>{ROTULOS_NIVEL[turma.nivel]}</span>}
            {professor && (
              <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                <UserRound className="size-3.5" />
                Prof. {professor}
              </span>
            )}
            {quadra && (
              <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                <MapPin className="size-3.5" />
                {quadra}
              </span>
            )}
          </span>
          {situacao.tipo !== "livre_mensalista" && (
            <span className="mt-1.5 block">
              <SeloSituacaoAula situacao={situacao} cobranca={cobranca} />
            </span>
          )}
        </span>
      </button>
      <BotaoPresenca item={item} aoAbrir={aoAbrir} />
    </div>
  );
}
