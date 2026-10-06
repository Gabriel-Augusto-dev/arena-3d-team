"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { onde } from "@/lib/banco";
import { useColecao } from "@/ganchos/useColecao";
import { useConfiguracoes } from "@/ganchos/useConfiguracoes";
import { adicionarDias, hojeISO, ordemNaSemana } from "@/lib/utilitarios/datas";
import type { Aula, Configuracoes, Pagamento, Presenca, Turma, Usuario } from "@/tipos";
import { cobrancasEmAberto } from "@/servicos/regras/regrasPagamento";
import { garantirAulasFuturas } from "@/servicos/servicoAulas";
import { garantirConfiguracoes } from "@/servicos/servicoConfiguracoes";
import { mapaDeTurmas, TURMA_DIA_EXTRA } from "@/servicos/regras/regrasAula";
import {
  alunosDoResponsavel,
  aulasDoResponsavel,
  pagamentosDoResponsavel,
  turmasDoResponsavel,
} from "@/servicos/regras/regrasEquipe";
import { useAutenticacao, useUsuarioLogado } from "./ContextoAutenticacao";

/** Dados da área do professor (e do professor auxiliar), em tempo real */
interface DadosProfessor {
  alunos: Usuario[];
  alunoPorId: Map<string, Usuario>;
  turmas: Turma[];
  turmaPorId: Map<string, Turma>;
  aulas: Aula[];
  presencas: Presenca[];
  pagamentos: Pagamento[];
  /** PIX avisados pelos alunos, aguardando conferência */
  paraConferir: Pagamento[];
  /** Day Use ainda não pagos (no prazo ou em atraso) */
  aReceber: Pagamento[];
  configuracoes: Configuracoes;
  /** Professores auxiliares (ativos e desativados) */
  auxiliares: Usuario[];
  /** Nome de quem dá a aula/turma (null = administrador) */
  nomeResponsavel(responsavelId: string | null | undefined): string;
  /**
   * true para o professor auxiliar: tudo acima já vem filtrado só com as
   * turmas, aulas, presenças, pagamentos e alunos dele
   */
  restrito: boolean;
  /** A presença é de uma aula que este usuário pode ver? */
  presencaVisivel(presenca: Presenca): boolean;
  /** O pagamento é de uma aula/turma que este usuário pode ver? */
  pagamentoVisivel(pagamento: Pagamento): boolean;
  carregando: boolean;
}

const ContextoDadosProfessor = createContext<DadosProfessor | null>(null);

/**
 * Quantos dias para trás carregamos aulas e presenças (a agenda mostra a
 * última semana; períodos maiores são buscados na hora, na Equipe e na
 * ficha do aluno)
 */
export const DIAS_HISTORICO_AULAS = 7;

/** Pagamentos criados nesse intervalo ficam em memória (cobre as presenças carregadas) */
const DIAS_HISTORICO_PAGAMENTOS = 35;

export function ProvedorDadosProfessor({ children }: { children: React.ReactNode }) {
  const { ehAdministrador } = useAutenticacao();
  const usuario = useUsuarioLogado();
  const inicio = adicionarDias(hojeISO(), -DIAS_HISTORICO_AULAS);

  const alunos = useColecao("usuarios", [onde("perfil", "==", "aluno")]);
  const turmas = useColecao("turmas");
  const aulas = useColecao("aulas", [onde("data", ">=", inicio)]);
  const presencas = useColecao("presencas", [onde("dataAula", ">=", inicio)]);
  // Pagamentos: só os em aberto (de qualquer data) + os recentes. O histórico
  // completo é buscado sob demanda (Financeiro → Histórico, ficha do aluno)
  const inicioPagamentos = adicionarDias(hojeISO(), -DIAS_HISTORICO_PAGAMENTOS);
  const pagamentosAbertos = useColecao("pagamentos", [onde("status", "in", ["pendente", "em_analise"])]);
  const pagamentosRecentes = useColecao("pagamentos", [onde("criadoEm", ">=", inicioPagamentos)]);
  const auxiliares = useColecao("usuarios", [onde("perfil", "==", "auxiliar")]);
  const { configuracoes, carregando: carregandoConfig } = useConfiguracoes();

  // Mantém a agenda das próximas semanas sempre criada (só o administrador grava aulas)
  const agendaGarantida = useRef(false);
  useEffect(() => {
    if (!ehAdministrador || agendaGarantida.current) return;
    agendaGarantida.current = true;
    // Uma vez por dia neste aparelho basta (criar/editar turma já monta a agenda na hora)
    const chave = "arena3d:agenda-garantida";
    const hoje = hojeISO();
    let jaFeito = false;
    try {
      jaFeito = window.localStorage.getItem(chave) === hoje;
    } catch {
      /* navegador sem localStorage: garante de novo */
    }
    if (jaFeito) return;
    Promise.all([garantirConfiguracoes(), garantirAulasFuturas()])
      .then(() => {
        try {
          window.localStorage.setItem(chave, hoje);
        } catch {
          /* ignora */
        }
      })
      .catch(() => (agendaGarantida.current = false));
  }, [ehAdministrador]);

  const valor = useMemo<DadosProfessor>(() => {
    const ordenarPorNome = (a: Usuario, b: Usuario) => a.nome.localeCompare(b.nome, "pt-BR");
    const todasTurmas = mapaDeTurmas(turmas.dados);
    let listaTurmas = turmas.dados;
    // Aula de turma que não existe mais (turma excluída) não aparece
    let listaAulas = aulas.dados.filter((a) => todasTurmas.has(a.turmaId));
    let listaPresencas = presencas.dados;
    const porId = new Map([...pagamentosRecentes.dados, ...pagamentosAbertos.dados].map((p) => [p.id, p]));
    const todosPagamentos = [...porId.values()];
    let listaPagamentos = todosPagamentos;
    let listaAlunos = alunos.dados;

    // Professor auxiliar: só o que é dele (turmas e dias extras em que ele é o responsável)
    const restrito = !ehAdministrador;
    if (restrito) {
      listaTurmas = turmasDoResponsavel(turmas.dados, usuario.id);
      listaAulas = aulasDoResponsavel(listaAulas, todasTurmas, usuario.id);
      const idsAulas = new Set(listaAulas.map((a) => a.id));
      const idsTurmas = new Set(listaTurmas.map((t) => t.id));
      listaPresencas = presencas.dados.filter((p) => idsAulas.has(p.aulaId));
      listaPagamentos = pagamentosDoResponsavel(todosPagamentos, idsAulas, idsTurmas);
      listaAlunos = alunosDoResponsavel(alunos.dados, idsTurmas, listaPresencas);
    }
    const idsTurmasVisiveis = new Set(listaTurmas.map((t) => t.id));
    const idsAulasVisiveis = new Set(listaAulas.map((a) => a.id));
    const ordenados = [...listaPagamentos].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    const auxiliarPorId = new Map(auxiliares.dados.map((a) => [a.id, a]));

    return {
      alunos: [...listaAlunos].sort(ordenarPorNome),
      alunoPorId: new Map(listaAlunos.map((a) => [a.id, a])),
      turmas: [...listaTurmas].sort((a, b) => {
        const diaA = Math.min(...a.diasSemana.map(ordemNaSemana));
        const diaB = Math.min(...b.diasSemana.map(ordemNaSemana));
        return diaA - diaB || a.horarioInicio.localeCompare(b.horarioInicio);
      }),
      turmaPorId: restrito ? mapaDeTurmas(listaTurmas) : todasTurmas,
      aulas: [...listaAulas].sort((a, b) => (a.data + a.horarioInicio).localeCompare(b.data + b.horarioInicio)),
      presencas: listaPresencas,
      pagamentos: ordenados,
      paraConferir: ordenados.filter((p) => p.status === "em_analise").reverse(),
      aReceber: cobrancasEmAberto(ordenados),
      configuracoes,
      auxiliares: [...auxiliares.dados].sort(ordenarPorNome),
      nomeResponsavel: (id) => (id ? (auxiliarPorId.get(id)?.nome ?? "Auxiliar") : "Professor"),
      restrito,
      pagamentoVisivel: (p) =>
        !restrito ||
        (p.tipo === "day_use" ? !!p.aulaId && idsAulasVisiveis.has(p.aulaId) : !!p.turmaId && idsTurmasVisiveis.has(p.turmaId)),
      presencaVisivel: (p) =>
        !restrito ||
        (p.turmaId === TURMA_DIA_EXTRA ? idsAulasVisiveis.has(p.aulaId) : idsTurmasVisiveis.has(p.turmaId)),
      carregando:
        alunos.carregando ||
        turmas.carregando ||
        aulas.carregando ||
        presencas.carregando ||
        pagamentosAbertos.carregando ||
        pagamentosRecentes.carregando ||
        carregandoConfig,
    };
  }, [alunos, turmas, aulas, presencas, pagamentosAbertos, pagamentosRecentes, auxiliares, configuracoes, carregandoConfig, ehAdministrador, usuario.id]);

  return <ContextoDadosProfessor.Provider value={valor}>{children}</ContextoDadosProfessor.Provider>;
}

export function useDadosProfessor() {
  const contexto = useContext(ContextoDadosProfessor);
  if (!contexto) throw new Error("useDadosProfessor precisa estar dentro de ProvedorDadosProfessor");
  return contexto;
}
