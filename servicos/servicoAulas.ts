import { banco, onde, type OperacaoLote } from "@/lib/banco";
import type { Aula, Presenca, Turma, Usuario } from "@/tipos";
import { adicionarDias, diaDaSemana, formatarDataRelativa, hojeISO } from "@/lib/utilitarios/datas";
import { operacaoNotificarAluno } from "./servicoNotificacoes";
import { ehDiaExtra, TURMA_DIA_EXTRA } from "./regras/regrasAula";
import { ehMensalistaDaTurma } from "./regras/regrasMensalidade";

export const DIAS_AGENDA_AUTOMATICA = 21;

export const idDaAula = (turmaId: string, data: string) => `${turmaId}_${data}`;

function montarAula(turma: Turma, data: string): Omit<Aula, "id" | "criadoEm" | "atualizadoEm"> {
  return {
    turmaId: turma.id,
    data,
    horarioInicio: turma.horarioInicio,
    horarioFim: turma.horarioFim,
    status: "agendada",
    motivoCancelamento: "",
    responsavelId: turma.responsavelId ?? null,
    responsavelNome: turma.responsavelNome ?? null,
  };
}

/**
 * Cria as aulas que faltam nos próximos dias para cada turma ativa.
 * Seguro para chamar várias vezes: o id é `${turmaId}_${data}`.
 * Retorna quantas aulas foram criadas.
 */
export async function garantirAulasFuturas(
  dias = DIAS_AGENDA_AUTOMATICA,
  /** Professor auxiliar: só as turmas dele (ele não pode criar aulas de outras turmas) */
  somenteDoResponsavel?: string,
): Promise<number> {
  const hoje = hojeISO();
  const [ativas, existentes] = await Promise.all([
    banco.listar("turmas", [onde("ativa", "==", true)]),
    banco.listar("aulas", [onde("data", ">=", hoje)]),
  ]);
  const turmas = somenteDoResponsavel ? ativas.filter((t) => t.responsavelId === somenteDoResponsavel) : ativas;
  const idsExistentes = new Set(existentes.map((a) => a.id));
  const operacoes: OperacaoLote[] = [];

  for (let d = 0; d <= dias; d++) {
    const data = adicionarDias(hoje, d);
    for (const turma of turmas) {
      if (!turma.diasSemana.includes(diaDaSemana(data))) continue;
      const id = idDaAula(turma.id, data);
      if (idsExistentes.has(id)) continue;
      operacoes.push({ tipo: "definir", colecao: "aulas", id, dados: montarAula(turma, data) });
    }
  }

  // O Firestore aceita até 500 operações por lote
  for (let i = 0; i < operacoes.length; i += 450) {
    await banco.lote(operacoes.slice(i, i + 450));
  }
  return operacoes.length;
}

/** Aula extra de uma turma fora dos dias fixos */
export async function criarAulaExtra(turma: Turma, data: string) {
  const id = idDaAula(turma.id, data);
  if (await banco.obter("aulas", id)) throw new Error("Já existe aula desta turma nesse dia");
  await banco.definir("aulas", id, montarAula(turma, data));
}

/**
 * Dia extra: um treino fora da agenda, no dia que o professor quiser.
 * Todos que marcarem presença pagam diária (inclusive mensalistas).
 * Retorna o id da aula, para o professor copiar o link de presença.
 */
export async function criarDiaExtra(
  data: string,
  horarioInicio: string,
  horarioFim: string,
  responsavelId: string | null = null,
  responsavelNome: string | null = null,
): Promise<string> {
  if (!data) throw new Error("Escolha o dia");
  if (data < hojeISO()) throw new Error("Escolha hoje ou um dia futuro");
  if (!horarioInicio || !horarioFim) throw new Error("Informe o horário");
  if (horarioFim <= horarioInicio) throw new Error("O horário de término precisa ser depois do início");
  const id = idDaAula(TURMA_DIA_EXTRA, data);
  const existente = await banco.obter("aulas", id);
  if (existente && existente.status === "agendada") throw new Error("Já existe um dia extra nessa data");
  await banco.definir("aulas", id, {
    turmaId: TURMA_DIA_EXTRA,
    data,
    horarioInicio,
    horarioFim,
    status: "agendada",
    motivoCancelamento: "",
    responsavelId,
    responsavelNome,
  });
  return id;
}

/**
 * Cancela a aula, desmarca as presenças, cancela cobranças de Day Use
 * ainda não pagas e avisa quem tinha presença + os mensalistas da turma.
 */
export async function cancelarAula(
  aula: Aula,
  turma: Turma | undefined,
  motivo: string,
  presencas: Presenca[],
  alunos: Usuario[],
) {
  const quando = `${formatarDataRelativa(aula.data).toLowerCase()} às ${aula.horarioInicio}`;
  const nomeTurma = turma?.nome ?? (ehDiaExtra(aula) ? "Dia extra" : "aula");
  const ativas = presencas.filter((p) => p.aulaId === aula.id && p.status === "confirmada");
  const mensalistas = alunos.filter((a) => a.ativo && ehMensalistaDaTurma(a, aula.turmaId));
  const avisar = new Set([...ativas.map((p) => p.alunoId), ...mensalistas.map((m) => m.id)]);

  const operacoes: OperacaoLote[] = [
    { tipo: "atualizar", colecao: "aulas", id: aula.id, dados: { status: "cancelada", motivoCancelamento: motivo } },
  ];

  for (const p of ativas) {
    operacoes.push({ tipo: "atualizar", colecao: "presencas", id: p.id, dados: { status: "cancelada" } });
    if (p.pagamentoId) {
      const pagamento = await banco.obter("pagamentos", p.pagamentoId);
      if (pagamento?.status === "pendente") {
        operacoes.push({
          tipo: "atualizar",
          colecao: "pagamentos",
          id: p.pagamentoId,
          dados: { status: "cancelado", motivoRecusa: "Aula cancelada" },
        });
      }
    }
    if (p.tipo === "experimental") {
      operacoes.push({ tipo: "atualizar", colecao: "usuarios", id: p.alunoId, dados: { usouExperimental: false } });
    }
  }

  for (const alunoId of avisar) {
    operacoes.push(
      operacaoNotificarAluno(alunoId, {
        tipo: "aula_cancelada",
        titulo: "Aula cancelada",
        mensagem: `A aula da turma ${nomeTurma} (${quando}) foi cancelada.${motivo ? ` Motivo: ${motivo}.` : ""}`,
        link: "/aluno/aulas",
      }),
    );
  }

  await banco.lote(operacoes);
}

export async function reativarAula(aula: Aula) {
  await banco.atualizar("aulas", aula.id, { status: "agendada", motivoCancelamento: "" });
}

/** Professor tira um aluno da lista de presença (cancela a cobrança se não paga) */
export async function removerPresenca(presenca: Presenca) {
  const operacoes: OperacaoLote[] = [
    { tipo: "atualizar", colecao: "presencas", id: presenca.id, dados: { status: "cancelada" } },
  ];
  if (presenca.pagamentoId) {
    const pagamento = await banco.obter("pagamentos", presenca.pagamentoId);
    if (pagamento && (pagamento.status === "pendente" || pagamento.status === "em_analise")) {
      operacoes.push({
        tipo: "atualizar",
        colecao: "pagamentos",
        id: presenca.pagamentoId,
        dados: { status: "cancelado", motivoRecusa: "Presença removida pelo professor" },
      });
    }
  }
  if (presenca.tipo === "experimental") {
    operacoes.push({ tipo: "atualizar", colecao: "usuarios", id: presenca.alunoId, dados: { usouExperimental: false } });
  }
  await banco.lote(operacoes);
}
