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

export function ProvedorDadosAluno({ children }: { children: React.ReactNode }) {
  const aluno = useUsuarioLogado();
  const hoje = hojeISO();
  const limite = adicionarDias(hoje, DIAS_AGENDA_ALUNO);

  const turmas = useColecao("turmas", [onde("ativa", "==", true)]);
  const aulas = useColecao("aulas", [onde("data", ">=", hoje)]);
  const presencas = useColecao("presencas", [onde("alunoId", "==", aluno.id)]);
  const pagamentos = useColecao("pagamentos", [onde("alunoId", "==", aluno.id)]);
  const { configuracoes, carregando: carregandoConfig } = useConfiguracoes();

  const valor = useMemo<DadosAluno>(() => {
    const turmaPorId = new Map(turmas.dados.map((t) => [t.id, t]));
    const meusPagamentos = [...pagamentos.dados].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    return {
      aluno,
      turmas: turmas.dados,
      turmaPorId,
      minhaTurma: aluno.turmaId ? (turmaPorId.get(aluno.turmaId) ?? null) : null,
      aulas: aulas.dados
        .filter((a) => a.data <= limite && turmaPorId.has(a.turmaId))
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
        turmas.carregando || aulas.carregando || presencas.carregando || pagamentos.carregando || carregandoConfig,
    };
  }, [aluno, turmas, aulas, presencas, pagamentos, configuracoes, carregandoConfig, limite]);

  return <ContextoDadosAluno.Provider value={valor}>{children}</ContextoDadosAluno.Provider>;
}

export function useDadosAluno() {
  const contexto = useContext(ContextoDadosAluno);
  if (!contexto) throw new Error("useDadosAluno precisa estar dentro de ProvedorDadosAluno");
  return contexto;
}
