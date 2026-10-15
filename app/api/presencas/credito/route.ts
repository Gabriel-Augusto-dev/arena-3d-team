import { bancoAdmin } from "@/lib/servidor/firebaseAdmin";
import { ErroHttp, lerCorpo, responder, tratarErro, usuarioDaRequisicao } from "@/lib/servidor/rotas";
import { ehDiaExtra } from "@/servicos/regras/regrasAula";
import { matriculasDoAluno, situacaoDaValidade } from "@/servicos/regras/regrasMensalidade";
import type { Aula, Pagamento, Presenca } from "@/tipos";

/**
 * POST /api/presencas/credito — crédito de aula cancelada.
 *  { acao: "usar", aulaId }        → marca presença (Day Use) já paga com 1 crédito
 *  { acao: "devolver", presencaId } → desmarca (antes da aula) e o crédito volta
 *
 * Roda no servidor numa transação: o mesmo crédito nunca é usado duas vezes e o
 * aluno não consegue gravar sozinho um Day Use "pago".
 */

/** Data e hora de Brasília (o servidor roda em UTC) */
const FUSO = "-03:00";
const hojeBrasilia = () => new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
const momentoDaAula = (data: string, horario: string) => new Date(`${data}T${horario}:00${FUSO}`).getTime();

export async function POST(request: Request) {
  try {
    const aluno = await usuarioDaRequisicao(request);
    if (aluno.perfil !== "aluno") throw new ErroHttp(403, "Só o aluno usa crédito de aula");
    const corpo = await lerCorpo<{ acao: string; aulaId: string; presencaId: string }>(request);
    if (corpo.acao === "usar" && typeof corpo.aulaId === "string" && corpo.aulaId) {
      return responder(await usarCredito(aluno.id, aluno.nome, aluno, corpo.aulaId), 201);
    }
    if (corpo.acao === "devolver" && typeof corpo.presencaId === "string" && corpo.presencaId) {
      return responder(await devolverCredito(aluno.id, corpo.presencaId));
    }
    throw new ErroHttp(400, "Requisição inválida");
  } catch (erro) {
    return tratarErro(erro);
  }
}

async function usarCredito(
  alunoId: string,
  alunoNome: string,
  aluno: Parameters<typeof matriculasDoAluno>[0],
  aulaId: string,
) {
  const db = bancoAdmin();
  const hoje = hojeBrasilia();

  return db.runTransaction(async (tx) => {
    const aulaDoc = await tx.get(db.collection("aulas").doc(aulaId));
    const aula = aulaDoc.data() as Aula | undefined;
    if (!aula) throw new ErroHttp(404, "Esta aula não existe mais");
    if (aula.status !== "agendada") throw new ErroHttp(409, "Esta aula foi cancelada");
    if (momentoDaAula(aula.data, aula.horarioFim) <= Date.now()) throw new ErroHttp(409, "Esta aula já terminou");

    // Mensalista em dia na própria turma não paga a aula: não gasta o crédito à toa
    const daTurma = matriculasDoAluno(aluno).find((m) => m.turmaId === aula.turmaId);
    if (!ehDiaExtra(aula) && daTurma && situacaoDaValidade(daTurma.validade, hoje).acessoLiberado) {
      throw new ErroHttp(409, "Sua mensalidade cobre esta aula: não precisa usar o crédito");
    }

    const [presencasSnap, pagamentosSnap] = await Promise.all([
      tx.get(db.collection("presencas").where("alunoId", "==", alunoId).where("aulaId", "==", aulaId)),
      tx.get(db.collection("pagamentos").where("alunoId", "==", alunoId)),
    ]);
    if (presencasSnap.docs.some((d) => (d.data() as Presenca).status === "confirmada")) {
      throw new ErroHttp(409, "Sua presença já está marcada nesta aula");
    }

    const pagamentos = pagamentosSnap.docs.map((d) => ({ ...(d.data() as Omit<Pagamento, "id">), id: d.id }));
    const bloqueia = pagamentos.some(
      (p) =>
        p.tipo === "day_use" &&
        (p.status === "pendente" || p.status === "em_analise") &&
        !!p.vencimento &&
        p.vencimento < hoje,
    );
    if (bloqueia) throw new ErroHttp(409, "Você tem Day Use em aberto de outra aula. Resolva antes de marcar presença");

    // Crédito não vence: usa o mais antigo
    const credito = pagamentos
      .filter((p) => p.status === "credito" && !p.creditoUsadoPor)
      .sort((a, b) => (a.confirmadoEm ?? a.criadoEm).localeCompare(b.confirmadoEm ?? b.criadoEm))[0];
    if (!credito) throw new ErroHttp(409, "Você não tem crédito disponível");

    const agora = new Date().toISOString();
    const presencaRef = db.collection("presencas").doc();
    const pagamentoRef = db.collection("pagamentos").doc();
    const presenca: Omit<Presenca, "id"> = {
      aulaId,
      turmaId: aula.turmaId,
      dataAula: aula.data,
      alunoId,
      alunoNome,
      tipo: "day_use",
      status: "confirmada",
      pagamentoId: pagamentoRef.id,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    // Mesmo valor do crédito: o dinheiro entrou uma vez só e conta aqui, na aula que aconteceu
    const pagamento: Omit<Pagamento, "id"> = {
      alunoId,
      alunoNome,
      tipo: "day_use",
      valor: credito.valor,
      forma: "credito",
      status: "confirmado",
      vencimento: aula.data,
      aulaId,
      presencaId: presencaRef.id,
      turmaId: aula.turmaId,
      cicloInicio: null,
      cicloFim: null,
      informadoEm: null,
      observacaoAluno: "Pago com crédito de aula cancelada",
      motivoRecusa: "",
      confirmadoPor: "credito",
      confirmadoEm: agora,
      creditoOrigemId: credito.id,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    tx.set(presencaRef, presenca);
    tx.set(pagamentoRef, pagamento);
    tx.update(db.collection("pagamentos").doc(credito.id), { creditoUsadoPor: pagamentoRef.id, atualizadoEm: agora });

    return {
      presenca: { ...presenca, id: presencaRef.id },
      pagamento: { ...pagamento, id: pagamentoRef.id },
    };
  });
}

async function devolverCredito(alunoId: string, presencaId: string) {
  const db = bancoAdmin();

  return db.runTransaction(async (tx) => {
    const presencaRef = db.collection("presencas").doc(presencaId);
    const presenca = (await tx.get(presencaRef)).data() as Presenca | undefined;
    if (!presenca || presenca.alunoId !== alunoId) throw new ErroHttp(404, "Presença não encontrada");
    if (presenca.status !== "confirmada") throw new ErroHttp(409, "Esta presença já foi desmarcada");
    if (!presenca.pagamentoId) throw new ErroHttp(409, "Esta presença não foi paga com crédito");

    const aula = (await tx.get(db.collection("aulas").doc(presenca.aulaId))).data() as Aula | undefined;
    if (aula && momentoDaAula(aula.data, aula.horarioInicio) <= Date.now()) {
      throw new ErroHttp(409, "A aula já começou. Para desmarcar, fale com o professor");
    }

    const pagamentoRef = db.collection("pagamentos").doc(presenca.pagamentoId);
    const pagamento = (await tx.get(pagamentoRef)).data() as Pagamento | undefined;
    if (!pagamento || pagamento.forma !== "credito" || pagamento.status !== "confirmado" || !pagamento.creditoOrigemId) {
      throw new ErroHttp(409, "Esta presença não foi paga com crédito");
    }
    const origemRef = db.collection("pagamentos").doc(pagamento.creditoOrigemId);
    const origem = (await tx.get(origemRef)).data() as Pagamento | undefined;

    const agora = new Date().toISOString();
    tx.update(presencaRef, { status: "cancelada", atualizadoEm: agora });
    tx.update(pagamentoRef, {
      status: "cancelado",
      motivoRecusa: "Presença desmarcada · crédito devolvido",
      atualizadoEm: agora,
    });
    if (origem && origem.creditoUsadoPor === presenca.pagamentoId) {
      tx.update(origemRef, { creditoUsadoPor: null, atualizadoEm: agora });
    }

    return { presenca: { ...presenca, id: presencaId, status: "cancelada", atualizadoEm: agora } };
  });
}
