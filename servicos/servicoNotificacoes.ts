import { banco, type OperacaoLote } from "@/lib/banco";
import type { Notificacao, TipoNotificacao, Turma, Usuario } from "@/tipos";

/**
 * Id que já vem em ordem do mais novo para o mais antigo. Assim o sino
 * busca só as últimas notificações (limite) sem precisar de índice composto:
 * o Firestore devolve os documentos na ordem do id.
 */
export function idNotificacao(): string {
  const inverso = String(9_999_999_999_999 - Date.now()).padStart(13, "0");
  return `${inverso}_${Math.random().toString(36).slice(2, 10)}`;
}

interface DadosNotificacao {
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  link?: string | null;
}

/** Monta a gravação de uma notificação para incluir em um lote */
export function operacaoNotificarAluno(alunoId: string, dados: DadosNotificacao): OperacaoLote {
  const notificacao: Omit<Notificacao, "id" | "criadoEm"> = {
    usuarioId: alunoId,
    paraPerfil: null,
    tipo: dados.tipo,
    titulo: dados.titulo,
    mensagem: dados.mensagem,
    link: dados.link ?? null,
    lida: false,
  };
  return { tipo: "definir", colecao: "notificacoes", id: idNotificacao(), dados: notificacao };
}

export function operacaoNotificarProfessores(dados: DadosNotificacao): OperacaoLote {
  const notificacao: Omit<Notificacao, "id" | "criadoEm"> = {
    usuarioId: null,
    paraPerfil: "professor",
    tipo: dados.tipo,
    titulo: dados.titulo,
    mensagem: dados.mensagem,
    link: dados.link ?? null,
    lida: false,
  };
  return { tipo: "definir", colecao: "notificacoes", id: idNotificacao(), dados: notificacao };
}

export async function marcarComoLida(id: string) {
  await banco.atualizar("notificacoes", id, { lida: true });
}

export async function marcarTodasComoLidas(notificacoes: Notificacao[]) {
  const naoLidas = notificacoes.filter((n) => !n.lida);
  if (!naoLidas.length) return;
  await banco.lote(
    naoLidas.map((n) => ({ tipo: "atualizar", colecao: "notificacoes", id: n.id, dados: { lida: true } })),
  );
}

/** Avisa os professores que um aluno novo criou a conta */
export async function notificarNovoCadastro(aluno: Usuario, turma: Turma | null) {
  await banco.lote([
    operacaoNotificarProfessores({
      tipo: "aviso",
      titulo: aluno.plano === "mensalista" ? "Novo aluno mensalista" : "Novo aluno Day Use",
      mensagem:
        aluno.plano === "mensalista"
          ? `${aluno.nome} se cadastrou como mensalista${turma ? ` na turma ${turma.nome}` : ""}. A mensalidade libera quando você confirmar o 1º pagamento.`
          : `${aluno.nome} se cadastrou e vai treinar com Day Use.`,
      link: `/professor/alunos/${aluno.id}`,
    }),
  ]);
}
