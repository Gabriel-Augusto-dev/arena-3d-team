"use client";

import { useMemo, useState } from "react";
import { useUsuarioLogado } from "@/contextos/ContextoAutenticacao";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { CartaoAulaProfessor } from "@/componentes/professor/CartaoAulaProfessor";
import { FolhaDetalheAula } from "@/componentes/professor/FolhaDetalheAula";
import { EsqueletoLista, LinkSecao, TituloSecao } from "@/componentes/interface/Elementos";
import { formatarDataExtenso, formatarDataRelativa, hojeISO, saudacao } from "@/lib/utilitarios/datas";
import { primeiroNome } from "@/lib/utilitarios/formatadores";
import { presencasDaAula } from "@/servicos/regras/regrasAula";

export default function InicioProfessor() {
  const professor = useUsuarioLogado();
  const { turmas: _turmas, turmaPorId, aulas, presencas, pagamentos, carregando } =
    useDadosProfessor();
  const [aulaAberta, setAulaAberta] = useState<string | null>(null);
  const hoje = hojeISO();

  const pagamentoPorId = useMemo(() => new Map(pagamentos.map((p) => [p.id, p])), [pagamentos]);

  // Aulas de hoje; se não houver, as do próximo dia com aula
  const { diaExibido, aulasDoDia } = useMemo(() => {
    const futuras = aulas.filter((a) => a.data >= hoje);
    const dia = futuras.find((a) => a.data === hoje) ? hoje : futuras[0]?.data;
    return { diaExibido: dia, aulasDoDia: dia ? aulas.filter((a) => a.data === dia) : [] };
  }, [aulas, hoje]);

  return (
    <>
      <header className="mb-7">
        <h1 className="font-titulo text-[34px] font-extrabold italic uppercase leading-none sm:text-[42px]">
          {saudacao()}, {primeiroNome(professor.nome)}
        </h1>
        <p className="mt-1.5 text-[15px] text-suave">{formatarDataExtenso(hoje)}</p>
      </header>

      <section>
        <TituloSecao
          titulo={
            diaExibido === hoje
              ? "Aulas de hoje"
              : diaExibido
              ? `Próximas aulas · ${formatarDataRelativa(diaExibido)}`
              : "Aulas"
          }
          acao={<LinkSecao href="/professor/aulas?aba=agenda">Agenda</LinkSecao>}
        />
        {carregando ? (
          <EsqueletoLista linhas={2} />
        ) : aulasDoDia.length ? (
          <ul className="flex flex-col gap-2.5">
            {aulasDoDia.map((aula) => (
              <li key={aula.id}>
                <CartaoAulaProfessor
                  aula={aula}
                  turma={turmaPorId.get(aula.turmaId)}
                  presencas={presencasDaAula(aula, presencas)}
                  pagamentoPorId={pagamentoPorId}
                  aoAbrir={() => setAulaAberta(aula.id)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-white/60 px-4 py-3 text-sm text-suave ring-1 ring-linha/60">
            Nenhuma aula na agenda. Crie uma turma para começar.
          </p>
        )}
      </section>

      {aulaAberta && <FolhaDetalheAula aulaId={aulaAberta} aoFechar={() => setAulaAberta(null)} />}
    </>
  );
}
