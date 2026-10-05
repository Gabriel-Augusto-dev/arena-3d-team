import { banco, type OperacaoLote } from "@/lib/banco";
import type { FormaPagamento, Pagamento, Turma, Usuario } from "@/tipos";
import { formatarData, formatarDataRelativa } from "@/lib/utilitarios/datas";
import { formatarMoeda } from "@/lib/utilitarios/formatadores";
import { calcularNovoCiclo } from "./regras/regrasMensalidade";
import { somaValores } from "./regras/regrasPagamento";
import { obterConfiguracoes } from "./servicoConfiguracoes";
import { operacaoNotificarAluno, operacaoNotificarProfessores } from "./servicoNotificacoes";

/**
 * Fluxo:
 *  Day Use: presença marcada → cobrança "pendente" → aluno paga o PIX
 *           (antes ou depois da aula) e avisa → "em_analise" → professor confirma.
 *  Mensalidade: aluno paga o PIX e avisa → "em_analise" → professor confirma
 *           → novo ciclo liberado.
 */

type NovoPagamento = Omit<Pagamento, "id" | "criadoEm" | "atualizadoEm">;

function pagamentoVazio(aluno: Usuario): NovoPagamento {
  return {
    alunoId: aluno.id,
    alunoNome: aluno.nome,
    tipo: "mensalidade",
    valor: 0,
    forma: "pix",
    status: "em_analise",
    vencimento: null,
    aulaId: null,
    presencaId: null,
    turmaId: null,
    cicloInicio: null,
    cicloFim: null,
    informadoEm: null,
    observacaoAluno: "",
    motivoRecusa: "",
    confirmadoPor: null,
    confirmadoEm: null,
  };
}

/** Aluno avisa que pagou uma ou mais cobranças de Day Use (um PIX só) */
export async function informarPagamentoDayUse(aluno: Usuario, cobrancas: Pagamento[], observacaoAluno = "") {
  const abertas = cobrancas.filter((p) => p.status === "pendente");
  if (!abertas.length) throw new Error("Nada para pagar");
  const agora = new Date().toISOString();
  await banco.lote([
    ...abertas.map<OperacaoLote>((p) => ({
      tipo: "atualizar",
      colecao: "pagamentos",
      id: p.id,
      dados: { status: "em_analise", informadoEm: agora, observacaoAluno: observacaoAluno.trim(), motivoRecusa: "" },
    })),
    operacaoNotificarProfessores({
      tipo: "nova_solicitacao",
      titulo: "PIX de Day Use para conferir",
      mensagem: `${aluno.nome} enviou ${formatarMoeda(somaValores(abertas))} (${abertas.length} ${abertas.length === 1 ? "aula" : "aulas"}).`,
      link: "/professor/financeiro",
    }),
  ]);
}

/** Aluno avisa que pagou a mensalidade via PIX */
export async function informarPagamentoMensalidade(aluno: Usuario, turma: Turma, observacaoAluno = "") {
  const id = banco.novoId("pagamentos");
  await banco.lote([
    {
      tipo: "definir",
      colecao: "pagamentos",
      id,
      dados: {
        ...pagamentoVazio(aluno),
        valor: turma.valorMensalidade,
        turmaId: turma.id,
        informadoEm: new Date().toISOString(),
        observacaoAluno: observacaoAluno.trim(),
      },
    },
    operacaoNotificarProfessores({
      tipo: "nova_solicitacao",
      titulo: "Mensalidade para conferir",
      mensagem: `${aluno.nome} enviou ${formatarMoeda(turma.valorMensalidade)} (${turma.nome}).`,
      link: "/professor/financeiro",
    }),
  ]);
  return id;
}

/** Gravações que abrem um novo ciclo de mensalidade */
async function operacoesNovoCiclo(aluno: Usuario, pagamentoId: string) {
  const config = await obterConfiguracoes();
  const ciclo = calcularNovoCiclo(aluno.validadeMensalidade, config.diasCicloMensalidade);
  const operacoes: OperacaoLote[] = [
    { tipo: "atualizar", colecao: "usuarios", id: aluno.id, dados: { validadeMensalidade: ciclo.cicloFim } },
    { tipo: "atualizar", colecao: "pagamentos", id: pagamentoId, dados: ciclo },
    operacaoNotificarAluno(aluno.id, {
      tipo: "pagamento_confirmado",
      titulo: "Mensalidade confirmada",
      mensagem: `Pagamento recebido! Mensalidade válida até ${formatarData(ciclo.cicloFim)}.`,
      link: "/aluno/pagamentos",
    }),
  ];
  return operacoes;
}

async function descreverAula(pagamento: Pagamento) {
  if (!pagamento.aulaId) return "aula";
  const aula = await banco.obter("aulas", pagamento.aulaId);
  if (!aula) return "aula";
  const turma = await banco.obter("turmas", aula.turmaId);
  return `${turma?.nome ?? "aula"} de ${formatarDataRelativa(aula.data).toLowerCase()}`;
}

/**
 * Professor confirma o recebimento. Serve para PIX avisado pelo aluno
 * ("em_analise") e também para Day Use pago direto ("pendente").
 */
export async function confirmarPagamento(pagamento: Pagamento, professorId: string, forma?: FormaPagamento) {
  if (pagamento.status !== "em_analise" && pagamento.status !== "pendente") {
    throw new Error("Este pagamento já foi analisado");
  }
  const operacoes: OperacaoLote[] = [
    {
      tipo: "atualizar",
      colecao: "pagamentos",
      id: pagamento.id,
      dados: {
        status: "confirmado",
        confirmadoPor: professorId,
        confirmadoEm: new Date().toISOString(),
        motivoRecusa: "",
        ...(forma ? { forma } : {}),
      },
    },
  ];

  if (pagamento.tipo === "mensalidade") {
    const aluno = await banco.obter("usuarios", pagamento.alunoId);
    if (!aluno) throw new Error("Aluno não encontrado");
    operacoes.push(...(await operacoesNovoCiclo(aluno, pagamento.id)));
  } else {
    operacoes.push(
      operacaoNotificarAluno(pagamento.alunoId, {
        tipo: "pagamento_confirmado",
        titulo: "Day Use pago",
        mensagem: `Recebemos ${formatarMoeda(pagamento.valor)} da ${await descreverAula(pagamento)}. Obrigado!`,
        link: "/aluno/pagamentos",
      }),
    );
  }
  await banco.lote(operacoes);
}

/**
 * Professor não encontrou o PIX.
 * Day Use volta a ficar "a pagar" (a dívida continua); mensalidade fica recusada.
 */
export async function recusarPagamento(pagamento: Pagamento, motivo: string, professorId: string) {
  if (pagamento.status !== "em_analise") throw new Error("Este pagamento já foi analisado");
  const dayUse = pagamento.tipo === "day_use";
  await banco.lote([
    {
      tipo: "atualizar",
      colecao: "pagamentos",
      id: pagamento.id,
      dados: dayUse
        ? { status: "pendente", motivoRecusa: motivo.trim(), informadoEm: null }
        : {
            status: "recusado",
            motivoRecusa: motivo.trim(),
            confirmadoPor: professorId,
            confirmadoEm: new Date().toISOString(),
          },
    },
    operacaoNotificarAluno(pagamento.alunoId, {
      tipo: "pagamento_recusado",
      titulo: dayUse ? "PIX do Day Use não encontrado" : "Mensalidade não confirmada",
      mensagem:
        `Não encontramos o pagamento de ${formatarMoeda(pagamento.valor)}.${motivo ? ` ${motivo.trim()}` : ""}` +
        (dayUse ? " O Day Use continua em aberto." : ""),
      link: "/aluno/pagamentos",
    }),
  ]);
}

/** Professor recebeu a mensalidade direto (dinheiro ou PIX fora do app) */
export async function registrarMensalidadeRecebida(
  aluno: Usuario,
  turma: Turma,
  valor: number,
  forma: FormaPagamento,
  professorId: string,
) {
  const id = banco.novoId("pagamentos");
  await banco.lote([
    {
      tipo: "definir",
      colecao: "pagamentos",
      id,
      dados: {
        ...pagamentoVazio(aluno),
        valor,
        forma,
        status: "confirmado",
        turmaId: turma.id,
        observacaoAluno: "Registrado pelo professor",
        confirmadoPor: professorId,
        confirmadoEm: new Date().toISOString(),
      },
    },
    ...(await operacoesNovoCiclo(aluno, id)),
  ]);
}
