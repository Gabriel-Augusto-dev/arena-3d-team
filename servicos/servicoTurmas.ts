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
  const vinculados = await banco.listar("usuarios", [onde("turmaId", "==", turma.id)]);
  if (vinculados.length) {
    throw new Error(`Ainda há ${vinculados.length} aluno(s) nesta turma. Mude-os de turma antes de excluir`);
  }
  await banco.remover("turmas", turma.id);
}
