"use client";

import { useEffect, useRef } from "react";
import type { DataISO } from "@/tipos";
import { adicionarDias, deDataISO, hojeISO, NOMES_DIAS_CURTOS } from "@/lib/utilitarios/datas";

/** Faixa horizontal de dias para escolher a data da agenda */
export function FaixaDatas({
  selecionada,
  aoSelecionar,
  dias = 14,
  inicio = hojeISO(),
  marcadas,
}: {
  selecionada: DataISO;
  aoSelecionar(data: DataISO): void;
  dias?: number;
  inicio?: DataISO;
  /** Datas que têm aulas (mostra um ponto) */
  marcadas?: Set<DataISO>;
}) {
  const faixa = useRef<HTMLDivElement>(null);
  const hoje = hojeISO();
  const datas = Array.from({ length: dias }, (_, i) => adicionarDias(inicio, i));

  useEffect(() => {
    faixa.current
      ?.querySelector<HTMLElement>(`[data-data="${selecionada}"]`)
      ?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [selecionada]);

  return (
    <div ref={faixa} className="sem-barra -mx-4 flex snap-x gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
      {datas.map((data) => {
        const ativo = data === selecionada;
        const d = deDataISO(data);
        const temAula = marcadas?.has(data);
        return (
          <button
            key={data}
            data-data={data}
            onClick={() => aoSelecionar(data)}
            aria-pressed={ativo}
            aria-label={d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            className={`relative flex w-[54px] shrink-0 snap-center flex-col items-center rounded-2xl py-2.5 transition ${
              ativo ? "bg-marinho-900 text-white shadow-lg shadow-marinho-900/20" : "bg-white text-tinta ring-1 ring-linha/70 hover:bg-marinho-50"
            }`}
          >
            <span className={`text-[11px] font-semibold ${ativo ? "text-marinho-200" : "text-suave"}`}>
              {data === hoje ? "Hoje" : NOMES_DIAS_CURTOS[d.getDay()]}
            </span>
            <span className="numeros font-titulo text-xl font-bold leading-tight">{d.getDate()}</span>
            <span
              className={`mt-0.5 size-1.5 rounded-full ${temAula ? (ativo ? "bg-laranja-400" : "bg-marinho-500") : "bg-transparent"}`}
            />
          </button>
        );
      })}
    </div>
  );
}
