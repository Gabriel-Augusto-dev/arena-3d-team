"use client";

import { createContext, useContext, useMemo } from "react";
import { onde } from "@/lib/banco";
import { useColecao } from "@/ganchos/useColecao";
import { useConfiguracoes } from "@/ganchos/useConfiguracoes";
import { useUsuarioLogado } from "./ContextoAutenticacao";
import { adicionarDias, hojeISO } from "@/lib/utilitarios/datas";
import type { Aula, Configuracoes, Pagamento, Presenca, Turma, Usuario } from "@/tipos";
import { calcularSituacaoMensalidade, type SituacaoMensalidade } from "@/servicos/regras/regrasMensalidade";
import { cobrancasEmAberto, cobrancasEmAtraso } from "@/servicos/regras/regrasPagamento";
import { ehDiaExtra, mapaDeTurmas } from "@/servicos/regras/regrasAula";

/**
 * Tudo que a área do aluno precisa, em tempo real.
 * O aluno só lê turmas, aulas, configurações e os PRÓPRIOS dados
 * (presenças e pagamentos) — pensado para as regras do Firestore.
 */
interface DadosAluno {
  aluno: Usuario;
  turmas: Turma[];
  turmaPorId: Map<string, Turma>;
  minhaTurma: Turma | null;
  aulas: Aula[];
  minhasPresencas: Presenca[];
  meusPagamentos: Pagamento[];
  /** Day Use marcados e ainda não pagos */
  cobrancasAbertas: Pagamento[];
  /** Day Use não pagos depois da meia-noite do dia da aula (bloqueiam presença) */
  cobrancasAtrasadas: Pagamento[];
  configuracoes: Configuracoes;
  situacaoMensalidade: SituacaoMensalidade;
  mensalidadeEmAnalise: Pagamento | null;
  carregando: boolean;
}

const ContextoDadosAluno = createContext<DadosAluno | null>(null);

export const DIAS_AGENDA_ALUNO = 14;

/** Histórico de pagamentos que o aluno vê no app */
export const DIAS_HISTORICO_PAGAMENTOS = 365;

export function ProvedorDadosAluno({ children }: { children: React.ReactNode }) {
  const aluno = useUsuarioLogado();
  const hoje = hojeISO();
  const limite = adicionarDias(hoje, DIAS_AGENDA_ALUNO);

  const turmas = useColecao("turmas", [onde("ativa", "==", true)]);
  const aulas = useColecao("aulas", [onde("data", ">=", hoje)]);
  // Presenças: só das aulas de hoje em diante (é o que a agenda precisa)
  const presencas = useColecao("presencas", [onde("alunoId", "==", aluno.id), onde("dataAula", ">=", hoje)]);
  // Pagamentos: os dos últimos 12 meses + os em aberto de qualquer data
  const inicioHistorico = adicionarDias(hoje, -DIAS_HISTORICO_PAGAMENTOS);
  const pagamentosRecentes = useColecao("pagamentos", [
    onde("alunoId", "==", aluno.id),
    onde("criadoEm", ">=", inicioHistorico),
  ]);
  const pagamentosAbertos = useColecao("pagamentos", [
    onde("alunoId", "==", aluno.id),
    onde("status", "in", ["pendente", "em_analise"]),
  ]);
  const { configuracoes, carregando: carregandoConfig } = useConfiguracoes();

  const valor = useMemo<DadosAluno>(() => {
    const turmaPorId = mapaDeTurmas(turmas.dados);
    const porId = new Map([...pagamentosRecentes.dados, ...pagamentosAbertos.dados].map((p) => [p.id, p]));
    const meusPagamentos = [...porId.values()].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    return {
      aluno,
      turmas: turmas.dados,
      turmaPorId,
      minhaTurma: aluno.turmaId ? (turmaPorId.get(aluno.turmaId) ?? null) : null,
      aulas: aulas.dados
        // Dia extra aparece mesmo que seja daqui a mais de 2 semanas
        .filter((a) => (a.data <= limite || ehDiaExtra(a)) && turmaPorId.has(a.turmaId))
        .sort((a, b) => (a.data + a.horarioInicio).localeCompare(b.data + b.horarioInicio)),
      minhasPresencas: presencas.dados,
      meusPagamentos,
      cobrancasAbertas: cobrancasEmAberto(meusPagamentos),
      cobrancasAtrasadas: cobrancasEmAtraso(meusPagamentos),
      configuracoes,
      situacaoMensalidade: calcularSituacaoMensalidade(aluno),
      mensalidadeEmAnalise:
        meusPagamentos.find((p) => p.tipo === "mensalidade" && p.status === "em_analise") ?? null,
      carregando:
        turmas.carregando ||
        aulas.carregando ||
        presencas.carregando ||
        pagamentosRecentes.carregando ||
        pagamentosAbertos.carregando ||
        carregandoConfig,
    };
  }, [aluno, turmas, aulas, presencas, pagamentosRecentes, pagamentosAbertos, configuracoes, carregandoConfig, limite]);

  return <ContextoDadosAluno.Provider value={valor}>{children}</ContextoDadosAluno.Provider>;
}

export function useDadosAluno() {
  const contexto = useContext(ContextoDadosAluno);
  if (!contexto) throw new Error("useDadosAluno precisa estar dentro de ProvedorDadosAluno");
  return contexto;
}
