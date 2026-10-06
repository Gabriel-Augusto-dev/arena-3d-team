import { banco, onde } from "@/lib/banco";
import type { Turma } from "@/tipos";
import { hojeISO } from "@/lib/utilitarios/datas";

export type DadosTurma = Omit<Turma, "id" | "criadoEm" | "atualizadoEm">;

export async function salvarTurma(dados: DadosTurma, id?: string): Promise<Turma> {
  if (id) {
    await banco.atualizar("turmas", id, dados);
    // Aulas futuras acompanham o horário e o responsável novos.
    // Só as de hoje em diante (índice composto turmaId + data; sem ele, o banco filtra na memória)
    const hoje = hojeISO();
    const futuras = await banco.listar("aulas", [onde("turmaId", "==", id), onde("data", ">=", hoje)]);
    const aAtualizar = futuras.filter((a) => a.data >= hoje && a.status === "agendada");
    if (aAtualizar.length) {
      await banco.lote(
        aAtualizar.map((a) => ({
          tipo: "atualizar",
          colecao: "aulas",
          id: a.id,
          dados: {
            horarioInicio: dados.horarioInicio,
            horarioFim: dados.horarioFim,
            // As próximas aulas passam para o novo responsável (as passadas ficam com quem deu)
            responsavelId: dados.responsavelId ?? null,
            responsavelNome: dados.responsavelNome ?? null,
          },
        })),
      );
    }
    return { ...(await banco.obter("turmas", id))!, ...dados };
  }
  return banco.criar("turmas", dados);
}

export async function alternarTurmaAtiva(turma: Turma) {
  await banco.atualizar("turmas", turma.id, { ativa: !turma.ativa });
}

export async function removerTurma(turma: Turma) {
  // Mensalistas da turma (principal ou uma das turmas do aluno)
  const [principal, outras] = await Promise.all([
    banco.listar("usuarios", [onde("turmaId", "==", turma.id)]),
    banco.listar("usuarios", [onde("turmasIds", "array-contains", turma.id)]),
  ]);
  const vinculados = [...new Set([...principal, ...outras].map((u) => u.id))];
  if (vinculados.length) {
    throw new Error(`Ainda há ${vinculados.length} aluno(s) nesta turma. Mude-os de turma antes de excluir`);
  }
  // Aulas já geradas da turma: as de hoje em diante saem junto (um filtro só, sem índice)
  const hoje = hojeISO();
  const [aulas, presencas] = await Promise.all([
    banco.listar("aulas", [onde("turmaId", "==", turma.id)]),
    banco.listar("presencas", [onde("turmaId", "==", turma.id)]),
  ]);
  const marcadas = presencas.filter((p) => p.status === "confirmada" && p.dataAula >= hoje);
  if (marcadas.length) {
    throw new Error(
      `Há ${marcadas.length} presença(s) marcada(s) em aulas futuras desta turma. Cancele essas aulas antes de excluir`,
    );
  }
  const futuras = aulas.filter((a) => a.data >= hoje);
  await banco.lote([
    ...futuras.map((a) => ({ tipo: "remover" as const, colecao: "aulas" as const, id: a.id })),
    { tipo: "remover", colecao: "turmas", id: turma.id },
  ]);
}
