"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, UserPlus, UserRoundSearch } from "lucide-react";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAutenticacao } from "@/contextos/ContextoAutenticacao";
import { FolhaFormularioAluno } from "@/componentes/professor/FolhaFormularioAluno";
import { Botao } from "@/componentes/interface/Botao";
import { Campo } from "@/componentes/interface/Campos";
import { Avatar, EsqueletoLista, EstadoVazio, FichasFiltro, Selo, TituloPagina } from "@/componentes/interface/Elementos";
import { TONS_MENSALIDADE } from "@/lib/rotulos";
import { contemTexto, formatarTelefone, somenteNumeros } from "@/lib/utilitarios/formatadores";
import { calcularSituacaoMensalidade } from "@/servicos/regras/regrasMensalidade";
import type { Usuario } from "@/tipos";
import { onde } from "@/lib/banco";
import { useColecao } from "@/ganchos/useColecao";
import { adicionarDias, hojeISO } from "@/lib/utilitarios/datas";
import { alunosDoResponsavel, aulasDoResponsavel, turmasDoResponsavel } from "@/servicos/regras/regrasEquipe";

type Filtro = "todos" | "mensalistas" | "avulsos" | "em_dia" | "atrasados" | "inativos";

/**
 * Filtro por professor: mensalistas das turmas dele + quem treinou nas aulas
 * dele nesses últimos dias
 */
const DIAS_ALUNOS_DO_PROFESSOR = 30;

export default function AlunosProfessor() {
  const { alunos, turmas, turmaPorId, auxiliares, carregando } = useDadosProfessor();
  // Cadastrar aluno é só do administrador
  const { ehAdministrador } = useAutenticacao();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [turmaFiltro, setTurmaFiltro] = useState("");
  const [novo, setNovo] = useState(false);
  const [buscou, setBuscou] = useState(false);
  // Administrador: alunos de um professor ("eu" ou o id do auxiliar). Vazio = todos
  const [professorFiltro, setProfessorFiltro] = useState("");
  const filtrandoProfessor = ehAdministrador && professorFiltro !== "";

  // Só busca o histórico quando o filtro por professor está em uso
  const inicioHistorico = adicionarDias(hojeISO(), -DIAS_ALUNOS_DO_PROFESSOR);
  const aulasHistorico = useColecao("aulas", [onde("data", ">=", inicioHistorico)], filtrandoProfessor);
  const presencasHistorico = useColecao("presencas", [onde("dataAula", ">=", inicioHistorico)], filtrandoProfessor);
  const carregandoProfessor = filtrandoProfessor && (aulasHistorico.carregando || presencasHistorico.carregando);

  const alunosVisiveis = useMemo(() => {
    if (!filtrandoProfessor) return alunos;
    const responsavelId = professorFiltro === "eu" ? null : professorFiltro;
    const idsTurmas = new Set(turmasDoResponsavel(turmas, responsavelId).map((t) => t.id));
    const idsAulas = new Set(aulasDoResponsavel(aulasHistorico.dados, turmaPorId, responsavelId).map((a) => a.id));
    const presencas = presencasHistorico.dados.filter((p) => p.status === "confirmada" && idsAulas.has(p.aulaId));
    return alunosDoResponsavel(alunos, idsTurmas, presencas);
  }, [filtrandoProfessor, professorFiltro, alunos, turmas, turmaPorId, aulasHistorico.dados, presencasHistorico.dados]);

  const comSituacao = useMemo(
    () => alunosVisiveis.map((aluno) => ({ aluno, situacao: calcularSituacaoMensalidade(aluno) })),
    [alunosVisiveis],
  );

  const regras: Record<Filtro, (a: (typeof comSituacao)[number]) => boolean> = {
    todos: ({ aluno }) => aluno.ativo,
    mensalistas: ({ aluno }) => aluno.ativo && aluno.plano === "mensalista",
    avulsos: ({ aluno }) => aluno.ativo && aluno.plano === "avulso",
    em_dia: ({ aluno, situacao }) => aluno.ativo && situacao.acessoLiberado,
    atrasados: ({ aluno, situacao }) => aluno.ativo && aluno.plano === "mensalista" && !situacao.acessoLiberado,
    inativos: ({ aluno }) => !aluno.ativo,
  };

  const contar = (f: Filtro) => comSituacao.filter(regras[f]).length;

  const lista = comSituacao.filter((item) => {
    if (!regras[filtro](item)) return false;
    if (turmaFiltro && item.aluno.turmaId !== turmaFiltro) return false;
    if (!busca.trim()) return true;
    const numeros = somenteNumeros(busca);
    return (
      contemTexto(item.aluno.nome, busca) ||
      contemTexto(item.aluno.email, busca) ||
      (numeros.length >= 3 && (item.aluno.cpf.includes(numeros) || item.aluno.whatsapp.includes(numeros)))
    );
  });

  return (
    <>
      <TituloPagina
        titulo="Alunos"
        subtitulo={`${contar("todos")} ativos, ${contar("mensalistas")} mensalistas`}
        acao={
          ehAdministrador && (
            <Botao icone={UserPlus} variante="destaque" onClick={() => setNovo(true)} className="max-sm:hidden">
              Novo aluno
            </Botao>
          )
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Campo
            className="flex-1"
            icone={Search}
            type="search"
            placeholder="Nome, CPF ou WhatsApp"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setBuscou(true); }}
            aria-label="Buscar aluno"
          />
          <select
            value={turmaFiltro}
            onChange={(e) => { setTurmaFiltro(e.target.value); setBuscou(true); }}
            aria-label="Filtrar por turma"
            className="h-12 max-w-[42%] rounded-xl bg-white px-3 text-sm font-semibold ring-1 ring-inset ring-linha focus:outline-none focus:ring-2 focus:ring-marinho-500"
          >
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
        {ehAdministrador && auxiliares.length > 0 && (
          <select
            value={professorFiltro}
            onChange={(e) => {
              setProfessorFiltro(e.target.value);
              setBuscou(true);
            }}
            aria-label="Filtrar por professor"
            className="h-12 rounded-xl bg-white px-3 text-sm font-semibold ring-1 ring-inset ring-linha focus:outline-none focus:ring-2 focus:ring-marinho-500"
          >
            <option value="">Todos os professores</option>
            <option value="eu">Meus alunos</option>
            {auxiliares.map((a) => (
              <option key={a.id} value={a.id}>
                Alunos de {a.nome}
              </option>
            ))}
          </select>
        )}
        <FichasFiltro<Filtro>
          opcoes={[
            { valor: "todos", rotulo: "Todos", contador: contar("todos") },
            { valor: "mensalistas", rotulo: "Mensalistas", contador: contar("mensalistas") },
            { valor: "avulsos", rotulo: "Avulsos", contador: contar("avulsos") },
            { valor: "em_dia", rotulo: "Em dia", contador: contar("em_dia") },
            { valor: "atrasados", rotulo: "Atrasados", contador: contar("atrasados") },
            { valor: "inativos", rotulo: "Inativos", contador: contar("inativos") },
          ]}
          ativa={filtro}
          aoMudar={(f) => { setFiltro(f); setBuscou(true); }}
        />
        {!buscou && (
          <Botao
            variante="destaque"
            tamanho="grande"
            larguraTotal
            icone={Search}
            onClick={() => setBuscou(true)}
          >
            Buscar alunos
          </Botao>
        )}
      </div>

      <div className="mt-5">
        {!buscou ? null : carregando || carregandoProfessor ? (
          <EsqueletoLista linhas={5} />
        ) : lista.length ? (
          <ul className="grid gap-2 md:grid-cols-2">
            {lista.map(({ aluno, situacao }) => (
              <li key={aluno.id}>
                <LinhaAluno
                  aluno={aluno}
                  turmaNome={aluno.turmaId ? turmaPorId.get(aluno.turmaId)?.nome : undefined}
                  selo={
                    !aluno.ativo ? (
                      <Selo tom="cinza">Inativo</Selo>
                    ) : (
                      <Selo tom={TONS_MENSALIDADE[situacao.status]} ponto={aluno.plano === "mensalista"}>
                        {situacao.rotulo}
                      </Selo>
                    )
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <EstadoVazio
            icone={UserRoundSearch}
            titulo="Nenhum aluno encontrado"
            descricao={
              busca || !ehAdministrador ? "Confira a busca ou troque o filtro." : "Cadastre o primeiro aluno da arena."
            }
            acao={
              !busca &&
              ehAdministrador && (
                <Botao icone={UserPlus} onClick={() => setNovo(true)}>
                  Novo aluno
                </Botao>
              )
            }
          />
        )}
      </div>

      {/* Botão flutuante no celular */}
      {ehAdministrador && (
        <button
          onClick={() => setNovo(true)}
          aria-label="Novo aluno"
          className="fixed bottom-24 right-4 z-20 grid size-14 place-items-center rounded-2xl bg-laranja-500 text-marinho-950 shadow-lg shadow-marinho-900/25 sm:hidden"
        >
          <UserPlus className="size-6" />
        </button>
      )}

      {novo && ehAdministrador && <FolhaFormularioAluno aoFechar={() => setNovo(false)} />}
    </>
  );
}

function LinhaAluno({ aluno, turmaNome, selo }: { aluno: Usuario; turmaNome?: string; selo: React.ReactNode }) {
  return (
    <Link
      href={`/professor/alunos/${aluno.id}`}
      className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-linha/70 transition hover:ring-marinho-200"
    >
      <Avatar nome={aluno.nome} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{aluno.nome}</p>
        <p className="truncate text-[13px] text-suave">
          {aluno.plano === "mensalista" ? (turmaNome ?? "Sem turma") : "Avulso"} · {formatarTelefone(aluno.whatsapp)}
        </p>
      </div>
      {selo}
      <ChevronRight className="size-4 shrink-0 text-suave" />
    </Link>
  );
}
