"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, TriangleAlert } from "lucide-react";
import { useAutenticacao, useUsuarioLogado } from "@/contextos/ContextoAutenticacao";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { CartaoAulaProfessor } from "@/componentes/professor/CartaoAulaProfessor";
import { CompartilharLinkAula } from "@/componentes/professor/CompartilharLinkAula";
import { FolhaDetalheAula } from "@/componentes/professor/FolhaDetalheAula";
import { SeletorResponsavel } from "@/componentes/professor/SeletorResponsavel";
import { CarimboEnviado } from "@/componentes/pagamentos/CarimboEnviado";
import { Botao } from "@/componentes/interface/Botao";
import { Campo } from "@/componentes/interface/Campos";
import { Folha } from "@/componentes/interface/Folha";
import { EsqueletoLista, LinkSecao, TituloSecao } from "@/componentes/interface/Elementos";
import { formatarDataExtenso, formatarDataRelativa, hojeISO, saudacao } from "@/lib/utilitarios/datas";
import { formatarMoeda, primeiroNome } from "@/lib/utilitarios/formatadores";
import { ehDiaExtra, presencasDaAula } from "@/servicos/regras/regrasAula";
import { responsavelDaAula } from "@/servicos/regras/regrasEquipe";
import { criarDiaExtra } from "@/servicos/servicoAulas";
import type { Aula } from "@/tipos";

export default function InicioProfessor() {
  const professor = useUsuarioLogado();
  const { ehAdministrador } = useAutenticacao();
  const { turmaPorId, turmas, aulas, presencas, pagamentos, configuracoes, nomeResponsavel, carregando } =
    useDadosProfessor();
  const [aulaAberta, setAulaAberta] = useState<string | null>(null);
  const [criandoDiaExtra, setCriandoDiaExtra] = useState(false);
  const hoje = hojeISO();

  const pagamentoPorId = useMemo(() => new Map(pagamentos.map((p) => [p.id, p])), [pagamentos]);

  // Aulas de hoje; se não houver, as do próximo dia com aula
  const { diaExibido, aulasDoDia } = useMemo(() => {
    const futuras = aulas.filter((a) => a.data >= hoje);
    const dia = futuras.find((a) => a.data === hoje) ? hoje : futuras[0]?.data;
    return { diaExibido: dia, aulasDoDia: dia ? aulas.filter((a) => a.data === dia) : [] };
  }, [aulas, hoje]);

  // Próximos dias extras (os do dia já exibido acima não se repetem)
  const diasExtras = useMemo(
    () => aulas.filter((a) => ehDiaExtra(a) && a.data >= hoje && a.status === "agendada" && a.data !== diaExibido),
    [aulas, hoje, diaExibido],
  );

  // Administrador: aulas dele separadas das de cada auxiliar
  const grupos = useMemo(() => {
    const porResponsavel = new Map<string, Aula[]>();
    for (const aula of aulasDoDia) {
      const chave = responsavelDaAula(aula, turmaPorId) ?? "";
      porResponsavel.set(chave, [...(porResponsavel.get(chave) ?? []), aula]);
    }
    return [...porResponsavel.entries()]
      .sort(([a], [b]) => (a === "" ? -1 : b === "" ? 1 : nomeResponsavel(a).localeCompare(nomeResponsavel(b))))
      .map(([id, lista]) => ({ id, titulo: id ? `Aulas de ${primeiroNome(nomeResponsavel(id))}` : "Suas aulas", aulas: lista }));
  }, [aulasDoDia, turmaPorId, nomeResponsavel]);
  const separarPorProfessor = ehAdministrador && grupos.some((g) => g.id !== "");

  const listaDeAulas = (lista: Aula[]) => (
    <ul className="flex flex-col gap-2.5">
      {lista.map((aula) => (
        <li key={aula.id} className="flex flex-col gap-2">
          {cartao(aula)}
          {ehDiaExtra(aula) && aula.status === "agendada" && <CompartilharLinkAula aula={aula} compacto />}
        </li>
      ))}
    </ul>
  );

  const cartao = (aula: Aula) => (
    <CartaoAulaProfessor
      aula={aula}
      turma={turmaPorId.get(aula.turmaId)}
      presencas={presencasDaAula(aula, presencas)}
      pagamentoPorId={pagamentoPorId}
      aoAbrir={() => setAulaAberta(aula.id)}
    />
  );

  return (
    <>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-titulo text-[34px] font-extrabold italic uppercase leading-none sm:text-[42px]">
            {saudacao()}, {primeiroNome(professor.nome)}
          </h1>
          <p className="mt-1.5 text-[15px] text-suave">{formatarDataExtenso(hoje)}</p>
        </div>
        {ehAdministrador && (
          <Botao variante="destaque" icone={CalendarPlus} onClick={() => setCriandoDiaExtra(true)}>
            Criar dia extra
          </Botao>
        )}
      </header>

      {/* Primeiros passos do administrador: PIX e turmas */}
      {ehAdministrador && !carregando && (!configuracoes.chavePix || turmas.length === 0) && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-alerta-fundo px-4 py-3 text-sm text-alerta">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" />
          <div className="flex flex-col gap-1">
            <strong>Falta pouco para começar</strong>
            {!configuracoes.chavePix && (
              <Link href="/professor/configuracoes" className="underline underline-offset-2">
                Cadastre a chave PIX e os valores em Ajustes
              </Link>
            )}
            {turmas.length === 0 && (
              <Link href="/professor/aulas" className="underline underline-offset-2">
                Crie a primeira turma (a agenda de aulas é montada sozinha)
              </Link>
            )}
          </div>
        </div>
      )}

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
          separarPorProfessor ? (
            <div className="flex flex-col gap-5">
              {grupos.map((grupo) => (
                <div key={grupo.id || "eu"}>
                  <p className="mb-2 ml-1 text-[13px] font-bold uppercase tracking-wide text-suave">{grupo.titulo}</p>
                  {listaDeAulas(grupo.aulas)}
                </div>
              ))}
            </div>
          ) : (
            listaDeAulas(aulasDoDia)
          )
        ) : (
          <p className="rounded-2xl bg-white/60 px-4 py-3 text-sm text-suave ring-1 ring-linha/60">
            {ehAdministrador ? "Nenhuma aula na agenda. Crie uma turma para começar." : "Nenhuma aula na agenda."}
          </p>
        )}
      </section>

      {diasExtras.length > 0 && (
        <section className="mt-7">
          <TituloSecao titulo="Dias extras" />
          <ul className="flex flex-col gap-4">
            {diasExtras.map((aula) => (
              <li key={aula.id} className="flex flex-col gap-2">
                <p className="ml-1 text-[13px] font-semibold text-suave">{formatarDataExtenso(aula.data)}</p>
                {cartao(aula)}
                <CompartilharLinkAula aula={aula} compacto />
              </li>
            ))}
          </ul>
        </section>
      )}

      {aulaAberta && <FolhaDetalheAula aulaId={aulaAberta} aoFechar={() => setAulaAberta(null)} />}
      {criandoDiaExtra && ehAdministrador && <FolhaDiaExtra aoFechar={() => setCriandoDiaExtra(false)} />}
    </>
  );
}

/** Professor cria um treino fora da agenda; todos que forem pagam diária */
function FolhaDiaExtra({ aoFechar }: { aoFechar(): void }) {
  const { aulas, configuracoes, nomeResponsavel } = useDadosProfessor();
  const avisos = useAvisos();
  const [data, setData] = useState(hojeISO());
  const [inicio, setInicio] = useState("09:00");
  const [fim, setFim] = useState("11:00");
  const [responsavelId, setResponsavelId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [criadaId, setCriadaId] = useState<string | null>(null);
  const criada = criadaId ? aulas.find((a) => a.id === criadaId) : undefined;

  const salvar = async () => {
    setSalvando(true);
    try {
      setCriadaId(await criarDiaExtra(data, inicio, fim, responsavelId, nomeResponsavel(responsavelId)));
    } catch (erro) {
      avisos.erro(erro);
    } finally {
      setSalvando(false);
    }
  };

  if (criadaId) {
    return (
      <Folha
        aberta
        aoFechar={aoFechar}
        rodape={
          <Botao tamanho="grande" variante="secundario" larguraTotal onClick={aoFechar}>
            Pronto
          </Botao>
        }
      >
        <div className="flex flex-col gap-4">
          <CarimboEnviado
            tipo="confirmado"
            titulo="Dia extra criado!"
            descricao={`${formatarDataExtenso(data)}, das ${inicio} às ${fim}. Copie o link e envie no WhatsApp: o aluno cai direto na lista de presença.`}
          />
          {criada ? (
            <CompartilharLinkAula aula={criada} />
          ) : (
            <div className="h-28 animate-pulse rounded-2xl bg-marinho-900/10" />
          )}
        </div>
      </Folha>
    );
  }

  return (
    <Folha
      aberta
      aoFechar={aoFechar}
      titulo="Criar dia extra"
      descricao="Um treino fora da agenda, no dia que você quiser."
      rodape={
        <Botao tamanho="grande" larguraTotal carregando={salvando} onClick={salvar}>
          Criar e gerar link
        </Botao>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo rotulo="Dia" type="date" min={hojeISO()} value={data} onChange={(e) => setData(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Início" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          <Campo rotulo="Término" type="time" value={fim} onChange={(e) => setFim(e.target.value)} />
        </div>
        <SeletorResponsavel valor={responsavelId} aoMudar={setResponsavelId} />
        <p className="rounded-2xl bg-alerta-fundo px-4 py-3 text-sm text-alerta">
          <strong>Todos pagam diária</strong> ({formatarMoeda(configuracoes.valorDayUse)}), inclusive mensalistas.
        </p>
      </div>
    </Folha>
  );
}
