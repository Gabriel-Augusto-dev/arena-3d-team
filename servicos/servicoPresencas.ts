import { banco, onde, type OperacaoLote } from "@/lib/banco";
import type { Aula, Pagamento, Presenca, Turma, Usuario } from "@/tipos";
import { formatarDataRelativa } from "@/lib/utilitarios/datas";
import { avaliarPresenca } from "./regras/regrasAula";
import { obterConfiguracoes } from "./servicoConfiguracoes";
import { operacaoNotificarProfessores } from "./servicoNotificacoes";

/**
 * Marcar e desmarcar presença.
 * Antes de gravar, a situação é conferida de novo no banco (o aluno pode
 * ter ficado em atraso, ou a aula pode ter sido cancelada).
 */

type NovaPresenca = Omit<Presenca, "id" | "criadoEm" | "atualizadoEm">;

async function conferir(aluno: Usuario, aula: Aula) {
  const [aulaAtual, presencas, pagamentos, config, alunoAtual] = await Promise.all([
    banco.obter("aulas", aula.id),
    // Só o que decide a presença: as presenças do aluno no dia da aula e as cobranças em aberto
    banco.listar("presencas", [onde("alunoId", "==", aluno.id), onde("dataAula", "==", aula.data)]),
    banco.listar("pagamentos", [onde("alunoId", "==", aluno.id), onde("status", "in", ["pendente", "em_analise"])]),
    obterConfiguracoes(),
    banco.obter("usuarios", aluno.id),
  ]);
  if (!aulaAtual) throw new Error("Esta aula não existe mais");
  const situacao = avaliarPresenca(aulaAtual, alunoAtual ?? aluno, presencas, pagamentos, config);

  const mensagens: Partial<Record<typeof situacao.tipo, string>> = {
    confirmada: "Sua presença já está marcada nesta aula",
    aula_cancelada: "Esta aula foi cancelada",
    encerrada: "Esta aula já terminou",
    bloqueada: "Você tem Day Use em atraso. Pague para marcar presença",
    mensalidade_pendente: "Sua mensalidade está em aberto. Pague para marcar presença",
  };
  if (situacao.tipo !== "livre_mensalista" && situacao.tipo !== "day_use") {
    throw new Error(mensagens[situacao.tipo] ?? "Não foi possível marcar presença");
  }
  return { situacao, config };
}

function montarPresenca(aluno: Usuario, aula: Aula, tipo: Presenca["tipo"], pagamentoId: string | null): NovaPresenca {
  return {
    aulaId: aula.id,
    turmaId: aula.turmaId,
    dataAula: aula.data,
    alunoId: aluno.id,
    alunoNome: aluno.nome,
    tipo,
    status: "confirmada",
    pagamentoId,
  };
}

/**
 * Marca presença. O tipo é decidido pelas regras:
 * mensalista em dia → sem custo; senão → Day Use (gera cobrança a pagar).
 * Retorna o pagamento criado (Day Use), para a tela oferecer o PIX.
 */
export async function marcarPresenca(aluno: Usuario, aula: Aula): Promise<{ pagamentoId: string | null }> {
  const { situacao, config } = await conferir(aluno, aula);
  const presencaId = banco.novoId("presencas");

  if (situacao.tipo === "livre_mensalista") {
    // Em lote (sem ler antes): o documento é novo e o aluno não pode ler presenças de outros
    await banco.lote([
      { tipo: "definir", colecao: "presencas", id: presencaId, dados: montarPresenca(aluno, aula, "mensalista", null) },
    ]);
    return { pagamentoId: null };
  }

  const pagamentoId = banco.novoId("pagamentos");
  const cobranca: Omit<Pagamento, "id" | "criadoEm" | "atualizadoEm"> = {
    alunoId: aluno.id,
    alunoNome: aluno.nome,
    tipo: "day_use",
    valor: config.valorDayUse,
    forma: "pix",
    status: "pendente",
    vencimento: aula.data,
    aulaId: aula.id,
    presencaId,
    turmaId: aula.turmaId,
    cicloInicio: null,
    cicloFim: null,
    informadoEm: null,
    observacaoAluno: "",
    motivoRecusa: "",
    confirmadoPor: null,
    confirmadoEm: null,
  };

  await banco.lote([
    { tipo: "definir", colecao: "presencas", id: presencaId, dados: montarPresenca(aluno, aula, "day_use", pagamentoId) },
    { tipo: "definir", colecao: "pagamentos", id: pagamentoId, dados: cobranca },
  ]);
  return { pagamentoId };
}

/** Aula experimental: gratuita, uma única vez */
export async function marcarExperimental(aluno: Usuario, aula: Aula, turma: Turma | undefined) {
  const { situacao } = await conferir(aluno, aula);
  if (situacao.tipo !== "day_use" || !situacao.podeExperimental) {
    throw new Error("A aula experimental já foi usada");
  }
  await banco.lote([
    {
      tipo: "definir",
      colecao: "presencas",
      id: banco.novoId("presencas"),
      dados: montarPresenca(aluno, aula, "experimental", null),
    },
    { tipo: "atualizar", colecao: "usuarios", id: aluno.id, dados: { usouExperimental: true } },
    operacaoNotificarProfessores({
      tipo: "experimental_agendada",
      titulo: "Nova aula experimental",
      mensagem: `${aluno.nome} vem fazer a experimental — ${turma?.nome ?? "aula"}, ${formatarDataRelativa(aula.data)} às ${aula.horarioInicio}.`,
      link: "/professor",
    }),
  ]);
}

/** Desmarca a presença (antes da aula começar). Cancela a cobrança se ainda não foi paga */
export async function desmarcarPresenca(presenca: Presenca) {
  const operacoes: OperacaoLote[] = [
    { tipo: "atualizar", colecao: "presencas", id: presenca.id, dados: { status: "cancelada" } },
  ];
  if (presenca.pagamentoId) {
    const pagamento = await banco.obter("pagamentos", presenca.pagamentoId);
    if (pagamento && pagamento.status !== "pendente") {
      throw new Error("Este Day Use já foi pago. Fale com o professor para desmarcar");
    }
    operacoes.push({
      tipo: "atualizar",
      colecao: "pagamentos",
      id: presenca.pagamentoId,
      dados: { status: "cancelado", motivoRecusa: "Presença desmarcada" },
    });
  }
  if (presenca.tipo === "experimental") {
    operacoes.push({ tipo: "atualizar", colecao: "usuarios", id: presenca.alunoId, dados: { usouExperimental: false } });
  }
  await banco.lote(operacoes);
}
