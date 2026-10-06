"use client";

import { useMemo } from "react";
import { useDadosAluno } from "@/contextos/ContextoDadosAluno";
import { avaliarPresenca, type SituacaoPresenca } from "@/servicos/regras/regrasAula";
import { ehMensalistaDaTurma } from "@/servicos/regras/regrasMensalidade";
import type { Aula, Pagamento, Turma } from "@/tipos";

export interface AulaDoAluno {
  aula: Aula;
  turma: Turma | undefined;
  situacao: SituacaoPresenca;
  /** Cobrança do Day Use desta aula (se houver) */
  cobranca: Pagamento | undefined;
  /** Aula da turma do mensalista */
  ehDaMinhaTurma: boolean;
}

/** Agenda das próximas aulas com a situação de presença do aluno em cada uma */
export function useAgendaAluno() {
  const { aluno, aulas, turmaPorId, minhasPresencas, meusPagamentos, configuracoes, carregando } = useDadosAluno();

  const agenda = useMemo<AulaDoAluno[]>(
    () =>
      aulas.map((aula) => {
        const situacao = avaliarPresenca(aula, aluno, minhasPresencas, meusPagamentos, configuracoes);
        const cobranca =
          situacao.tipo === "confirmada" && situacao.presenca.pagamentoId
            ? meusPagamentos.find((p) => p.id === situacao.presenca.pagamentoId)
            : undefined;
        return {
          aula,
          turma: turmaPorId.get(aula.turmaId),
          situacao,
          cobranca,
          ehDaMinhaTurma: ehMensalistaDaTurma(aluno, aula.turmaId),
        };
      }),
    [aluno, aulas, turmaPorId, minhasPresencas, meusPagamentos, configuracoes],
  );

  return { agenda, carregando };
}
