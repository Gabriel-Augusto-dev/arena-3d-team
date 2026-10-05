"use client";

import { useMemo, useState } from "react";
import { CalendarSearch, Lock } from "lucide-react";
import { useDadosAluno } from "@/contextos/ContextoDadosAluno";
import { useAgendaAluno, type AulaDoAluno } from "@/ganchos/useAgendaAluno";
import { CartaoAulaAluno } from "@/componentes/aulas/CartaoAulaAluno";
import { FolhaPresenca } from "@/componentes/aulas/FolhaPresenca";
import { EsqueletoLista, EstadoVazio, TituloPagina } from "@/componentes/interface/Elementos";
import { formatarDataRelativa } from "@/lib/utilitarios/datas";

/** Aulas em que o aluno marcou presença */
export default function AulasAluno() {
  const { cobrancasAtrasadas } = useDadosAluno();
  const { agenda, carregando } = useAgendaAluno();
  const [abertaId, setAbertaId] = useState<string | null>(null);

  const minhas = agenda.filter((a) => a.situacao.tipo === "confirmada");
  const aberta = agenda.find((a) => a.aula.id === abertaId);

  const gruposMinhas = useMemo(() => {
    const grupos = new Map<string, AulaDoAluno[]>();
    minhas.forEach((item) => {
      if (!grupos.has(item.aula.data)) grupos.set(item.aula.data, []);
      grupos.get(item.aula.data)!.push(item);
    });
    return [...grupos.entries()];
  }, [minhas]);

  return (
    <>
      <TituloPagina titulo="Minhas presenças" subtitulo="Aulas em que você marcou presença" />

      {cobrancasAtrasadas.length > 0 && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-erro-fundo px-4 py-3 text-sm font-medium text-erro">
          <Lock className="size-4 shrink-0" />
          Você tem Day Use em atraso. Pague em Pagamentos para marcar presença.
        </p>
      )}

      {carregando ? (
        <EsqueletoLista />
      ) : gruposMinhas.length ? (
        <div className="flex flex-col gap-6">
          {gruposMinhas.map(([dia, itens]) => (
            <section key={dia}>
              <h2 className="mb-2.5 font-titulo text-lg font-bold">{formatarDataRelativa(dia)}</h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {itens.map((item) => (
                  <li key={item.aula.id}>
                    <CartaoAulaAluno item={item} aoAbrir={() => setAbertaId(item.aula.id)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EstadoVazio
          icone={CalendarSearch}
          titulo="Nenhuma presença marcada"
          descricao="Marque presença nas aulas pela tela Início, tocando em “Vou”."
        />
      )}

      {aberta && <FolhaPresenca item={aberta} aoFechar={() => setAbertaId(null)} />}
    </>
  );
}
