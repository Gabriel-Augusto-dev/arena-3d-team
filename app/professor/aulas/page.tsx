"use client";

import { useMemo, useState } from "react";
import { CalendarOff, CalendarPlus, Clock, MapPin, Pencil, Plus, Power, Trash, Users } from "lucide-react";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { useAbaDaUrl } from "@/ganchos/useAbaDaUrl";
import { FaixaDatas } from "@/componentes/aulas/FaixaDatas";
import { CartaoAulaProfessor } from "@/componentes/professor/CartaoAulaProfessor";
import { FolhaDetalheAula } from "@/componentes/professor/FolhaDetalheAula";
import { FolhaFormularioTurma } from "@/componentes/professor/FolhaFormularioTurma";
import { Botao } from "@/componentes/interface/Botao";
import { Campo, CampoSelecao } from "@/componentes/interface/Campos";
import { Folha } from "@/componentes/interface/Folha";
import { Abas, EsqueletoLista, EstadoVazio, Selo, TituloPagina } from "@/componentes/interface/Elementos";
import { adicionarDias, descreverDiasSemana, formatarDataExtenso, hojeISO } from "@/lib/utilitarios/datas";
import { formatarMoeda } from "@/lib/utilitarios/formatadores";
import { presencasDaAula, ROTULOS_NIVEL } from "@/servicos/regras/regrasAula";
import { criarAulaExtra } from "@/servicos/servicoAulas";
import { alternarTurmaAtiva, removerTurma } from "@/servicos/servicoTurmas";
import type { Turma } from "@/tipos";

const VISOES = ["turmas", "agenda"] as const;
type Visao = (typeof VISOES)[number];

export default function TurmasProfessor() {
  const { turmas, carregando } = useDadosProfessor();
  const [visao, setVisao] = useAbaDaUrl<Visao>(VISOES, "turmas");
  const [turmaEditada, setTurmaEditada] = useState<Turma | "nova" | null>(null);

  return (
    <>
      <TituloPagina
        titulo="Turmas"
        subtitulo={`${turmas.filter((t) => t.ativa).length} turmas ativas`}
        acao={
          <Botao variante="destaque" icone={Plus} onClick={() => setTurmaEditada("nova")} className="max-sm:hidden">
            Nova turma
          </Botao>
        }
      />
      <Abas<Visao>
        className="mb-5 max-w-sm"
        abas={[
          { valor: "turmas", rotulo: "Turmas", contador: turmas.length },
          { valor: "agenda", rotulo: "Agenda e presenças" },
        ]}
        ativa={visao}
        aoMudar={setVisao}
      />

      {carregando ? <EsqueletoLista /> : visao === "agenda" ? <Agenda /> : <ListaTurmas aoEditar={setTurmaEditada} />}

      <button
        onClick={() => setTurmaEditada("nova")}
        aria-label="Nova turma"
        className="fixed bottom-24 right-4 z-20 grid size-14 place-items-center rounded-2xl bg-laranja-500 text-marinho-950 shadow-lg shadow-marinho-900/25 sm:hidden"
      >
        <Plus className="size-6" />
      </button>

      {turmaEditada && (
        <FolhaFormularioTurma
          turma={turmaEditada === "nova" ? undefined : turmaEditada}
          aoFechar={() => setTurmaEditada(null)}
        />
      )}
    </>
  );
}

function Agenda() {
  const { aulas, turmaPorId, presencas, pagamentos } = useDadosProfessor();
  const hoje = hojeISO();
  const [data, setData] = useState(hoje);
  const [aberta, setAberta] = useState<string | null>(null);
  const [criandoExtra, setCriandoExtra] = useState(false);

  const pagamentoPorId = useMemo(() => new Map(pagamentos.map((p) => [p.id, p])), [pagamentos]);
  const datasComAula = useMemo(() => new Set(aulas.map((a) => a.data)), [aulas]);
  const doDia = aulas.filter((a) => a.data === data);

  return (
    <>
      <FaixaDatas selecionada={data} aoSelecionar={setData} inicio={adicionarDias(hoje, -7)} dias={29} marcadas={datasComAula} />
      <div className="mb-3 mt-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-titulo text-xl font-bold">{formatarDataExtenso(data)}</h2>
        <Botao variante="secundario" tamanho="pequeno" icone={CalendarPlus} onClick={() => setCriandoExtra(true)}>
          Aula extra
        </Botao>
      </div>

      {doDia.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {doDia.map((aula) => (
            <li key={aula.id}>
              <CartaoAulaProfessor
                aula={aula}
                turma={turmaPorId.get(aula.turmaId)}
                presencas={presencasDaAula(aula, presencas)}
                pagamentoPorId={pagamentoPorId}
                aoAbrir={() => setAberta(aula.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EstadoVazio icone={CalendarOff} titulo="Sem aulas neste dia" descricao="Escolha outro dia ou crie uma aula extra." />
      )}

      {aberta && <FolhaDetalheAula aulaId={aberta} aoFechar={() => setAberta(null)} />}
      {criandoExtra && <FolhaAulaExtra dataInicial={data < hoje ? hoje : data} aoFechar={() => setCriandoExtra(false)} />}
    </>
  );
}

function FolhaAulaExtra({ dataInicial, aoFechar }: { dataInicial: string; aoFechar(): void }) {
  const { turmas } = useDadosProfessor();
  const avisos = useAvisos();
  const ativas = turmas.filter((t) => t.ativa);
  const [turmaId, setTurmaId] = useState(ativas[0]?.id ?? "");
  const [data, setData] = useState(dataInicial);
  const [salvando, setSalvando] = useState(false);
  const turma = ativas.find((t) => t.id === turmaId);

  const salvar = async () => {
    if (!turma) return;
    setSalvando(true);
    try {
      await criarAulaExtra(turma, data);
      avisos.sucesso("Aula extra criada");
      aoFechar();
    } catch (erro) {
      avisos.erro(erro);
      setSalvando(false);
    }
  };

  return (
    <Folha
      aberta
      aoFechar={aoFechar}
      titulo="Aula extra"
      descricao="Uma aula fora dos dias fixos da turma."
      rodape={
        <Botao tamanho="grande" larguraTotal carregando={salvando} onClick={salvar} disabled={!turma}>
          Criar aula
        </Botao>
      }
    >
      <div className="flex flex-col gap-4">
        <CampoSelecao rotulo="Turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
          {ativas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome} ({t.horarioInicio} às {t.horarioFim})
            </option>
          ))}
        </CampoSelecao>
        <Campo rotulo="Data" type="date" min={hojeISO()} value={data} onChange={(e) => setData(e.target.value)} />
      </div>
    </Folha>
  );
}

function ListaTurmas({ aoEditar }: { aoEditar(turma: Turma | "nova"): void }) {
  const { turmas, alunos } = useDadosProfessor();
  const avisos = useAvisos();

  const executar = async (acao: () => Promise<unknown>, mensagem: string) => {
    try {
      await acao();
      avisos.sucesso(mensagem);
    } catch (erro) {
      avisos.erro(erro);
    }
  };

  if (!turmas.length)
    return (
      <EstadoVazio
        icone={Users}
        titulo="Nenhuma turma"
        descricao="Crie a primeira turma para montar a agenda."
        acao={
          <Botao icone={Plus} onClick={() => aoEditar("nova")}>
            Nova turma
          </Botao>
        }
      />
    );

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {turmas.map((turma) => {
        const mensalistas = alunos.filter((a) => a.ativo && a.plano === "mensalista" && a.turmaId === turma.id);
        return (
          <li key={turma.id} className={`rounded-3xl bg-white p-4 ring-1 ring-linha/70 ${turma.ativa ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-titulo text-2xl font-bold leading-tight">{turma.nome}</p>
                <p className="text-[13px] text-suave">{ROTULOS_NIVEL[turma.nivel]}</p>
              </div>
              {turma.ativa ? <Selo tom="verde">Ativa</Selo> : <Selo tom="cinza">Inativa</Selo>}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-suave">
              <span className="numeros inline-flex items-center gap-1.5">
                <Clock className="size-4 text-marinho-500" />
                {descreverDiasSemana(turma.diasSemana)}, {turma.horarioInicio}–{turma.horarioFim}
              </span>
              {turma.local && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-marinho-500" />
                  {turma.local}
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-fundo p-3">
              <div>
                <p className="text-xs text-suave">Mensalistas</p>
                <p className="numeros font-titulo text-xl font-bold">{mensalistas.length}</p>
              </div>
              <div>
                <p className="text-xs text-suave">Mensalidade</p>
                <p className="numeros font-titulo text-xl font-bold">{formatarMoeda(turma.valorMensalidade)}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Botao variante="secundario" tamanho="pequeno" icone={Pencil} onClick={() => aoEditar(turma)}>
                Editar
              </Botao>
              <Botao
                variante="fantasma"
                tamanho="pequeno"
                icone={Power}
                onClick={() => executar(() => alternarTurmaAtiva(turma), turma.ativa ? "Turma desativada" : "Turma ativada")}
              >
                {turma.ativa ? "Desativar" : "Ativar"}
              </Botao>
              <Botao
                variante="fantasma"
                tamanho="pequeno"
                icone={Trash}
                className="ml-auto text-erro hover:bg-erro-fundo"
                onClick={() => executar(() => removerTurma(turma), "Turma excluída")}
                aria-label={`Excluir turma ${turma.nome}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
