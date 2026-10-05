"use client";

import { ChevronRight } from "lucide-react";
import type { Aula, Pagamento, Presenca, Turma } from "@/tipos";
import { Avatar, Selo } from "@/componentes/interface/Elementos";
import { aulaJaComecou } from "@/lib/utilitarios/datas";
import { situacaoCobranca } from "@/servicos/regras/regrasPagamento";

/** Aula na agenda do professor: quantos marcaram presença e quem falta pagar */
export function CartaoAulaProfessor({
  aula,
  turma,
  presencas,
  pagamentoPorId,
  aoAbrir,
}: {
  aula: Aula;
  turma: Turma | undefined;
  /** Presenças confirmadas desta aula */
  presencas: Presenca[];
  pagamentoPorId: Map<string, Pagamento>;
  aoAbrir(): void;
}) {
  const cancelada = aula.status === "cancelada";
  const passou = aulaJaComecou(aula.data, aula.horarioFim);
  const naoPagos = presencas.filter((p) => {
    const pg = p.pagamentoId ? pagamentoPorId.get(p.pagamentoId) : undefined;
    return pg && ["a_pagar", "em_atraso"].includes(situacaoCobranca(pg));
  }).length;

  return (
    <button
      data-aula={aula.id}
      onClick={aoAbrir}
      className={`group flex w-full items-center gap-3 rounded-3xl bg-white p-3 pr-4 text-left ring-2 ring-marinho-100 transition hover:ring-marinho-300 ${
        cancelada || passou ? "opacity-60" : ""
      }`}
    >
      <span className={`grid w-14 shrink-0 place-items-center rounded-2xl py-2 ${cancelada || passou ? "bg-marinho-50" : "bg-laranja-500"}`}>
        <span className={`numeros font-titulo text-xl font-extrabold leading-none ${cancelada || passou ? "text-tinta" : "text-white"}`}>{aula.horarioInicio}</span>
        <span className={`numeros mt-0.5 text-[11px] ${cancelada || passou ? "text-suave" : "text-laranja-100"}`}>{aula.horarioFim}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-titulo text-[19px] font-bold leading-tight ${cancelada ? "line-through" : ""}`}>
          {turma?.nome}
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-2">
          {cancelada ? (
            <Selo tom="vermelho">Cancelada</Selo>
          ) : (
            <>
              <span className="flex -space-x-2 max-[359px]:hidden">
                {presencas.slice(0, 4).map((p) => (
                  <span key={p.id} className="rounded-full ring-2 ring-white">
                    <Avatar nome={p.alunoNome} tamanho="pequeno" />
                  </span>
                ))}
              </span>
              <span className="numeros text-sm font-semibold">
                {presencas.length} {presencas.length === 1 ? "presença" : "presenças"}
              </span>
              {naoPagos > 0 && (
                <Selo tom="amarelo" className="max-sm:hidden">
                  {naoPagos} a pagar
                </Selo>
              )}
            </>
          )}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-suave" />
    </button>
  );
}
