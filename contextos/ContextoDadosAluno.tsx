"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { onde } from "@/lib/banco";
import { useColecao } from "@/ganchos/useColecao";
import { useConfiguracoes } from "@/ganchos/useConfiguracoes";
import { useUsuarioLogado } from "./ContextoAutenticacao";
import { adicionarDias, hojeISO } from "@/lib/utilitarios/datas";
import type { Aula, Configuracoes, Pagamento, Presenca, Turma, Usuario } from "@/tipos";
import {
  calcularSituacaoMensalidade,
  matriculasDoAluno,
  situacaoDaValidade,
  type SituacaoMensalidade,
} from "@/servicos/regras/regrasMensalidade";
import { valorMensalidadeDoAluno } from "@/servicos/regras/regrasPreco";
import { cobrancasEmAberto, cobrancasEmAtraso } from "@/servicos/regras/regrasPagamento";
import { aulaDaSemana, mapaDeTurmas } from "@/servicos/regras/regrasAula";

/**
 * Tudo que a área do aluno precisa, em tempo real.
 * O aluno só lê turmas, aulas, configurações e os PRÓPRIOS dados
 * (presenças e pagamentos) — pensado para as regras do Firestore.
 */
/** Uma mensalidade do aluno (ele pode ser mensalista de mais de uma turma) */
export interface MensalidadeDoAluno {
  turma: Turma;
  situacao: SituacaoMensalidade;
  /** PIX avisado desta turma, esperando o professor confirmar */
  emAnalise: Pagamento | null;
  valor: number;
}

interface DadosAluno {
  aluno: Usuario;
  /** Uma por turma em que o aluno é mensalista */
  mensalidades: MensalidadeDoAluno[];
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
  /**
   * Mostra na hora o que o aluno acabou de gravar (presença, cobrança),
   * sem esperar o tempo real do banco devolver.
   */
  registrarLocal(novos: { presencas?: Presenca[]; pagamentos?: Pagamento[] }): void;
}

type ComVersao = { id: string; atualizadoEm: string };

/** Junta o que veio do banco com o que o aluno acabou de gravar (vale o mais novo) */
function mesclar<T extends ComVersao>(servidor: T[], locais: T[]): T[] {
  if (!locais.length) return servidor;
  const porId = new Map(servidor.map((d) => [d.id, d]));
  for (const local of locais) {
    const doBanco = porId.get(local.id);
    if (!doBanco || local.atualizadoEm > doBanco.atualizadoEm) porId.set(local.id, local);
  }
  return [...porId.values()];
}

const substituir = <T extends ComVersao>(atuais: T[], novos: T[] = []) => [
  ...atuais.filter((a) => !novos.some((n) => n.id === a.id)),
  ...novos,
];

const ContextoDadosAluno = createContext<DadosAluno | null>(null);


/** Histórico de pagamentos que o aluno vê no app */
export const DIAS_HISTORICO_PAGAMENTOS = 365;

export function ProvedorDadosAluno({ children }: { children: React.ReactNode }) {
  const aluno = useUsuarioLogado();
  const hoje = hojeISO();

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

  const [locais, setLocais] = useState<{ presencas: Presenca[]; pagamentos: Pagamento[] }>({
    presencas: [],
    pagamentos: [],
  });
  const registrarLocal = useCallback(
    (novos: { presencas?: Presenca[]; pagamentos?: Pagamento[] }) =>
      setLocais((atuais) => ({
        presencas: substituir(atuais.presencas, novos.presencas),
        pagamentos: substituir(atuais.pagamentos, novos.pagamentos),
      })),
    [],
  );

  const valor = useMemo<DadosAluno>(() => {
    const turmaPorId = mapaDeTurmas(turmas.dados);
    const porId = new Map([...pagamentosRecentes.dados, ...pagamentosAbertos.dados].map((p) => [p.id, p]));
    const meusPagamentos = mesclar([...porId.values()], locais.pagamentos).sort((a, b) =>
      b.criadoEm.localeCompare(a.criadoEm),
    );
    const emAnaliseDaTurma = (turmaId: string) =>
      meusPagamentos.find(
        (p) => p.tipo === "mensalidade" && p.status === "em_analise" && (p.turmaId ?? aluno.turmaId) === turmaId,
      ) ?? null;
    const mensalidades: MensalidadeDoAluno[] = matriculasDoAluno(aluno).flatMap((m) => {
      const turma = turmaPorId.get(m.turmaId);
      if (!turma) return [];
      return [
        {
          turma,
          situacao: situacaoDaValidade(m.validade),
          emAnalise: emAnaliseDaTurma(m.turmaId),
          valor: valorMensalidadeDoAluno(aluno, turma, configuracoes),
        },
      ];
    });
    return {
      aluno,
      mensalidades,
      turmas: turmas.dados,
      turmaPorId,
      minhaTurma: mensalidades[0]?.turma ?? null,
      aulas: aulas.dados
        // Só a semana atual (até domingo). Dia extra aparece mesmo que seja mais para frente
        .filter((a) => aulaDaSemana(a, hoje) && turmaPorId.has(a.turmaId))
        .sort((a, b) => (a.data + a.horarioInicio).localeCompare(b.data + b.horarioInicio)),
      minhasPresencas: mesclar(presencas.dados, locais.presencas),
      meusPagamentos,
      cobrancasAbertas: cobrancasEmAberto(meusPagamentos),
      cobrancasAtrasadas: cobrancasEmAtraso(meusPagamentos),
      configuracoes,
      situacaoMensalidade: calcularSituacaoMensalidade(aluno),
      mensalidadeEmAnalise: mensalidades.find((m) => m.emAnalise)?.emAnalise ?? null,
      carregando:
        turmas.carregando ||
        aulas.carregando ||
        presencas.carregando ||
        pagamentosRecentes.carregando ||
        pagamentosAbertos.carregando ||
        carregandoConfig,
      registrarLocal,
    };
  }, [
    aluno,
    turmas,
    aulas,
    presencas,
    pagamentosRecentes,
    pagamentosAbertos,
    configuracoes,
    carregandoConfig,
    hoje,
    locais,
    registrarLocal,
  ]);

  return <ContextoDadosAluno.Provider value={valor}>{children}</ContextoDadosAluno.Provider>;
}

export function useDadosAluno() {
  const contexto = useContext(ContextoDadosAluno);
  if (!contexto) throw new Error("useDadosAluno precisa estar dentro de ProvedorDadosAluno");
  return contexto;
}
