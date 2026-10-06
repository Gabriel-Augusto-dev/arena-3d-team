import { bancoAdmin } from "@/lib/servidor/firebaseAdmin";
import { ErroHttp, lerCorpo, responder, tratarErro, usuarioDaRequisicao } from "@/lib/servidor/rotas";
import { formatarMoeda } from "@/lib/utilitarios/formatadores";
import { gerarId, idNotificacao } from "@/lib/utilitarios/identificadores";
import { valorMensalidadeDoAluno } from "@/servicos/regras/regrasPreco";
import type { Configuracoes, Notificacao, Pagamento, Turma } from "@/tipos";

/**
 * POST /api/pagamentos/mensalidade — o aluno mensalista avisa que fez o PIX.
 * O valor é calculado aqui no servidor (mensalidade da turma ou a de
 * associado), então o aluno não consegue mandar um valor diferente.
 * O pagamento fica "em análise": a presença só libera quando o professor confirmar.
 */
export async function POST(request: Request) {
  try {
    const aluno = await usuarioDaRequisicao(request);
    if (aluno.perfil !== "aluno") throw new ErroHttp(403, "Só o aluno avisa o pagamento da mensalidade");
    if (aluno.plano !== "mensalista" || !aluno.turmaId) throw new ErroHttp(400, "Você não é mensalista de uma turma");

    const { observacaoAluno } = await lerCorpo<{ observacaoAluno: string }>(request);
    const observacao = typeof observacaoAluno === "string" ? observacaoAluno.trim().slice(0, 140) : "";

    const db = bancoAdmin();
    const [turmaDoc, configDoc, emAnalise] = await Promise.all([
      db.collection("turmas").doc(aluno.turmaId).get(),
      db.collection("configuracoes").doc("geral").get(),
      db.collection("pagamentos").where("alunoId", "==", aluno.id).where("status", "==", "em_analise").get(),
    ]);
    const turma = turmaDoc.data() as Turma | undefined;
    if (!turma) throw new ErroHttp(400, "Sua turma não foi encontrada. Fale com o professor");
    if (emAnalise.docs.some((d) => d.data().tipo === "mensalidade")) {
      throw new ErroHttp(409, "Você já avisou este pagamento. Aguarde o professor confirmar");
    }

    const config = (configDoc.data() ?? {}) as Partial<Configuracoes>;
    const valor = valorMensalidadeDoAluno(aluno, turma, {
      valorMensalidadeAssociado: Number(config.valorMensalidadeAssociado) || 0,
    });

    const agora = new Date().toISOString();
    const pagamentoId = gerarId();
    const pagamento: Omit<Pagamento, "id"> = {
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      tipo: "mensalidade",
      valor,
      forma: "pix",
      status: "em_analise",
      vencimento: null,
      aulaId: null,
      presencaId: null,
      turmaId: aluno.turmaId,
      cicloInicio: null,
      cicloFim: null,
      informadoEm: agora,
      observacaoAluno: observacao,
      motivoRecusa: "",
      confirmadoPor: null,
      confirmadoEm: null,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    const notificacao: Omit<Notificacao, "id"> = {
      usuarioId: null,
      paraPerfil: "professor",
      tipo: "nova_solicitacao",
      titulo: "Mensalidade para conferir",
      mensagem: `${aluno.nome} enviou ${formatarMoeda(valor)} (${turma.nome}).`,
      link: "/professor/financeiro",
      lida: false,
      criadoEm: agora,
    };

    const lote = db.batch();
    lote.set(db.collection("pagamentos").doc(pagamentoId), pagamento);
    lote.set(db.collection("notificacoes").doc(idNotificacao()), notificacao);
    await lote.commit();

    return responder({ pagamentoId, valor }, 201);
  } catch (erro) {
    return tratarErro(erro);
  }
}
