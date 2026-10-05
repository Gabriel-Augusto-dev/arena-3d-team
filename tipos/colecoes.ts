import type {
  Aula,
  Configuracoes,
  Notificacao,
  Pagamento,
  Presenca,
  Turma,
  Usuario,
} from "./entidades";

/** Nomes das coleções no Firestore */
export const COLECOES = {
  usuarios: "usuarios",
  turmas: "turmas",
  aulas: "aulas",
  presencas: "presencas",
  pagamentos: "pagamentos",
  notificacoes: "notificacoes",
  configuracoes: "configuracoes",
} as const;

export type NomeColecao = (typeof COLECOES)[keyof typeof COLECOES];

/** Liga o nome da coleção ao tipo do documento */
export interface MapaColecoes {
  usuarios: Usuario;
  turmas: Turma;
  aulas: Aula;
  presencas: Presenca;
  pagamentos: Pagamento;
  notificacoes: Notificacao;
  configuracoes: Configuracoes;
}

export const ID_CONFIGURACOES = "geral";
