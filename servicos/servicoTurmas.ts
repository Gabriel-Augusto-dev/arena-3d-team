import { banco, onde } from "@/lib/banco";
import type { Turma } from "@/tipos";
import { hojeISO } from "@/lib/utilitarios/datas";

export type DadosTurma = Omit<Turma, "id" | "criadoEm" | "atualizadoEm">;

export async function salvarTurma(dados: DadosTurma, id?: string): Promise<Turma> {
  if (id) {
    await banco.atualizar("turmas", id, dados);
    // Aulas futuras acompanham o horário novo
    const futuras = await banco.listar("aulas", [onde("turmaId", "==", id)]);
    const hoje = hojeISO();
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
          },
        })),
      );
    }
    return (await banco.obter("turmas", id))!;
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
