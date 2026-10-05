"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { onde } from "@/lib/banco";
import { useColecao } from "@/ganchos/useColecao";
import { useConfiguracoes } from "@/ganchos/useConfiguracoes";
import { adicionarDias, hojeISO, ordemNaSemana } from "@/lib/utilitarios/datas";
import type { Aula, Configuracoes, Pagamento, Presenca, Turma, Usuario } from "@/tipos";
import { cobrancasEmAberto } from "@/servicos/regras/regrasPagamento";
import { garantirAulasFuturas } from "@/servicos/servicoAulas";

/** Dados da área do professor, em tempo real */
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
  carregando: boolean;
}

const ContextoDadosProfessor = createContext<DadosProfessor | null>(null);

/** Quantos dias de histórico de aulas carregamos na agenda */
export const DIAS_HISTORICO_AULAS = 30;

export function ProvedorDadosProfessor({ children }: { children: React.ReactNode }) {
  const inicio = adicionarDias(hojeISO(), -DIAS_HISTORICO_AULAS);

  const alunos = useColecao("usuarios", [onde("perfil", "==", "aluno")]);
  const turmas = useColecao("turmas");
  const aulas = useColecao("aulas", [onde("data", ">=", inicio)]);
  const presencas = useColecao("presencas", [onde("dataAula", ">=", inicio)]);
  const pagamentos = useColecao("pagamentos");
  const { configuracoes, carregando: carregandoConfig } = useConfiguracoes();

  // Mantém a agenda das próximas semanas sempre criada
  const agendaGarantida = useRef(false);
  useEffect(() => {
    if (agendaGarantida.current) return;
    agendaGarantida.current = true;
    garantirAulasFuturas().catch(() => (agendaGarantida.current = false));
  }, []);

  const valor = useMemo<DadosProfessor>(() => {
    const ordenarPorNome = (a: Usuario, b: Usuario) => a.nome.localeCompare(b.nome, "pt-BR");
    const listaPagamentos = [...pagamentos.dados].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    return {
      alunos: [...alunos.dados].sort(ordenarPorNome),
      alunoPorId: new Map(alunos.dados.map((a) => [a.id, a])),
      turmas: [...turmas.dados].sort((a, b) => {
        const diaA = Math.min(...a.diasSemana.map(ordemNaSemana));
        const diaB = Math.min(...b.diasSemana.map(ordemNaSemana));
        return diaA - diaB || a.horarioInicio.localeCompare(b.horarioInicio);
      }),
      turmaPorId: new Map(turmas.dados.map((t) => [t.id, t])),
      aulas: [...aulas.dados].sort((a, b) => (a.data + a.horarioInicio).localeCompare(b.data + b.horarioInicio)),
      presencas: presencas.dados,
      pagamentos: listaPagamentos,
      paraConferir: listaPagamentos.filter((p) => p.status === "em_analise").reverse(),
      aReceber: cobrancasEmAberto(listaPagamentos),
      configuracoes,
      carregando:
        alunos.carregando ||
        turmas.carregando ||
        aulas.carregando ||
        presencas.carregando ||
        pagamentos.carregando ||
        carregandoConfig,
    };
  }, [alunos, turmas, aulas, presencas, pagamentos, configuracoes, carregandoConfig]);

  return <ContextoDadosProfessor.Provider value={valor}>{children}</ContextoDadosProfessor.Provider>;
}

export function useDadosProfessor() {
  const contexto = useContext(ContextoDadosProfessor);
  if (!contexto) throw new Error("useDadosProfessor precisa estar dentro de ProvedorDadosProfessor");
  return contexto;
}
