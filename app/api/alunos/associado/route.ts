import { bancoAdmin } from "@/lib/servidor/firebaseAdmin";
import { ErroHttp, lerCorpo, responder, tratarErro, usuarioDaRequisicao } from "@/lib/servidor/rotas";
import type { Aula, Turma, Usuario } from "@/tipos";

/**
 * O aluno é "do" professor auxiliar quando é mensalista de uma turma dele
 * ou já marcou presença numa aula dele (as mesmas contas da área do auxiliar).
 */
async function alunoEhDoAuxiliar(aluno: Usuario, auxiliarId: string): Promise<boolean> {
  const db = bancoAdmin();
  const responsavelDaTurma = async (turmaId: string) =>
    ((await db.collection("turmas").doc(turmaId).get()).data() as Turma | undefined)?.responsavelId ?? null;

  if (aluno.turmaId && (await responsavelDaTurma(aluno.turmaId)) === auxiliarId) return true;

  const presencas = await db.collection("presencas").where("alunoId", "==", aluno.id).get();
  const aulasIds = [...new Set(presencas.docs.map((d) => d.data().aulaId as string))].slice(0, 60);
  for (const aulaId of aulasIds) {
    const aula = (await db.collection("aulas").doc(aulaId).get()).data() as Aula | undefined;
    if (!aula) continue;
    const responsavel = aula.responsavelId !== undefined ? aula.responsavelId : await responsavelDaTurma(aula.turmaId);
    if (responsavel === auxiliarId) return true;
  }
  return false;
}

/** POST /api/alunos/associado — marca ou desmarca o aluno como associado */
export async function POST(request: Request) {
  try {
    const usuario = await usuarioDaRequisicao(request);
    if (usuario.perfil !== "professor" && usuario.perfil !== "auxiliar") {
      throw new ErroHttp(403, "Só a equipe pode alterar isso");
    }
    const { alunoId, associado } = await lerCorpo<{ alunoId: string; associado: boolean }>(request);
    if (typeof alunoId !== "string" || !alunoId || typeof associado !== "boolean") {
      throw new ErroHttp(400, "Requisição inválida");
    }

    const referencia = bancoAdmin().collection("usuarios").doc(alunoId);
    const dados = (await referencia.get()).data() as Omit<Usuario, "id"> | undefined;
    if (!dados || dados.perfil !== "aluno") throw new ErroHttp(404, "Aluno não encontrado");

    if (usuario.perfil === "auxiliar" && !(await alunoEhDoAuxiliar({ ...dados, id: alunoId }, usuario.id))) {
      throw new ErroHttp(403, "Este aluno não é das suas turmas");
    }

    await referencia.update({ associado, atualizadoEm: new Date().toISOString() });
    return responder({ ok: true });
  } catch (erro) {
    return tratarErro(erro);
  }
}
