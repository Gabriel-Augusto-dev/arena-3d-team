"use client";

import { Ticket } from "lucide-react";
import { useDadosAluno } from "@/contextos/ContextoDadosAluno";
import { formatarData } from "@/lib/utilitarios/datas";
import { creditosDisponiveis } from "@/servicos/regras/regrasPagamento";

/** Créditos de aula cancelada que o aluno ainda pode usar (some quando não há nenhum) */
export function CartaoCreditos() {
  const { meusPagamentos } = useDadosAluno();
  const creditos = creditosDisponiveis(meusPagamentos);
  if (!creditos.length) return null;
  const quantos = creditos.length;

  return (
    <div className="flex items-center gap-3 rounded-3xl bg-marinho-900 p-4 text-white">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-laranja-500 text-marinho-950">
        <Ticket className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">
          Você tem {quantos === 1 ? "1 aula" : `${quantos} aulas`} de crédito
        </p>
        <p className="text-sm text-white/80">
          De aula cancelada. Na próxima aula que seria paga, é só marcar presença: não precisa pagar de novo.
          {` Vale até ${formatarData(creditos[0].creditoValidade ?? null)}.`}
        </p>
      </div>
    </div>
  );
}
