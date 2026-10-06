/**
 * Modelo de dados da Arena 3D Team.
 *
 * Cada interface abaixo corresponde a um documento de uma coleção do
 * Firestore (veja `tipos/colecoes.ts`). Datas são guardadas como texto:
 *  - `DataISO`      → "2026-10-05"            (somente data, fuso local)
 *  - `DataHoraISO`  → "2026-10-05T19:30:00.000Z" (data e hora, em UTC)
 * Usar texto evita conversões de Timestamp e funciona igual no modo local
 * e no Firebase.
 */

export type DataISO = string;
export type DataHoraISO = string;
/** Horário no formato "HH:mm" */
export type Horario = string;

/* ------------------------------------------------------------------ */
/* Usuários                                                            */
/* ------------------------------------------------------------------ */

/**
 * professor → administrador: configura tudo e é o único que confirma pagamentos
 * auxiliar  → professor auxiliar: vê alunos, presenças e se cada um pagou,
 *             mas não confirma pagamentos nem altera cadastros/configurações
 * aluno     → marca presença e paga pelo PIX
 */
export type PerfilUsuario = "aluno" | "professor" | "auxiliar";

/** mensalista = vinculado a uma turma; avulso = só Day Use / experimental */
export type PlanoAluno = "mensalista" | "avulso";

/** Coleção `usuarios` — o id do documento é o uid do Firebase Auth */
export interface Usuario {
  id: string;
  perfil: PerfilUsuario;
  nome: string;
  email: string;
  cpf: string;
  dataNascimento: DataISO | "";
  whatsapp: string;
  /** Somente alunos */
  plano: PlanoAluno;
  /** Turma do mensalista (null para avulsos, professores e auxiliares) */
  turmaId: string | null;
  /** Último dia coberto pela mensalidade paga (da turma principal). null = nunca pagou */
  validadeMensalidade: DataISO | null;
  /**
   * Mensalista de mais de uma turma: todas as turmas dele (a 1ª é a `turmaId`)
   * e a validade da mensalidade de cada uma. Cada turma tem a própria mensalidade.
   */
  turmasIds?: string[];
  validades?: Record<string, DataISO | null>;
  /** A aula experimental gratuita só pode ser usada uma vez */
  usouExperimental: boolean;
  /** Mensalista associado: paga a mensalidade de associado definida em Ajustes */
  associado?: boolean;
  ativo: boolean;
  observacoes: string;
  /** Professor auxiliar: porcentagem de repasse usada por último no relatório da Equipe */
  percentualRepasse?: number;
  /** Professor auxiliar: porcentagem que ele usou por último na área Ganhos */
  percentualProprio?: number;
  criadoEm: DataHoraISO;
  atualizadoEm: DataHoraISO;
}

/* ------------------------------------------------------------------ */
/* Turmas e aulas                                                      */
/* ------------------------------------------------------------------ */

export type NivelTurma = "iniciante" | "intermediario" | "avancado" | "livre";

/** 0 = domingo … 6 = sábado (igual a Date.getDay()) */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Coleção `turmas` — não há limite de vagas: o aluno só marca presença */
export interface Turma {
  id: string;
  nome: string;
  nivel: NivelTurma;
  diasSemana: DiaSemana[];
  horarioInicio: Horario;
  horarioFim: Horario;
  valorMensalidade: number;
  local: string;
  ativa: boolean;
  /** Professor que dá a turma: uid do auxiliar, ou null = o próprio administrador */
  responsavelId?: string | null;
  /** Nome do professor responsável (cópia, para o aluno ver sem ler cadastros da equipe) */
  responsavelNome?: string | null;
  criadoEm: DataHoraISO;
  atualizadoEm: DataHoraISO;
}

export type StatusAula = "agendada" | "cancelada";

/**
 * Coleção `aulas` — uma ocorrência de turma em uma data.
 * id determinístico: `${turmaId}_${data}` (evita aulas duplicadas)
 */
export interface Aula {
  id: string;
  turmaId: string;
  data: DataISO;
  horarioInicio: Horario;
  horarioFim: Horario;
  status: StatusAula;
  motivoCancelamento: string;
  /** Quem dá a aula (copiado da turma; no dia extra, escolhido ao criar). null = administrador */
  responsavelId?: string | null;
  /** Nome de quem dá a aula (cópia, para o aluno ver) */
  responsavelNome?: string | null;
  criadoEm: DataHoraISO;
  atualizadoEm: DataHoraISO;
}

/* ------------------------------------------------------------------ */
/* Presenças                                                           */
/* ------------------------------------------------------------------ */

/**
 * Todo aluno marca presença na aula que vai. Assim o professor sabe quem
 * vem em cada dia.
 *  - mensalista   → mensalidade em dia, sem custo por aula
 *  - day_use      → gera uma cobrança (pode pagar depois da aula)
 *  - experimental → gratuita, uma única vez
 */
export type TipoPresenca = "mensalista" | "day_use" | "experimental";

export type StatusPresenca = "confirmada" | "cancelada";

/** Coleção `presencas` */
export interface Presenca {
  id: string;
  aulaId: string;
  turmaId: string;
  /** Repetido da aula para facilitar consultas por data */
  dataAula: DataISO;
  alunoId: string;
  alunoNome: string;
  tipo: TipoPresenca;
  status: StatusPresenca;
  /** Cobrança do Day Use */
  pagamentoId: string | null;
  criadoEm: DataHoraISO;
  atualizadoEm: DataHoraISO;
}

/* ------------------------------------------------------------------ */
/* Pagamentos                                                          */
/* ------------------------------------------------------------------ */

export type TipoPagamento = "mensalidade" | "day_use";

/**
 * pendente   → a pagar (Day Use marcado e ainda não pago)
 * em_analise → aluno avisou que fez o PIX; professor precisa conferir
 * confirmado → professor confirmou o recebimento
 * recusado   → professor não encontrou o PIX da mensalidade
 * cancelado  → presença desmarcada ou aula cancelada
 *
 * Day Use recusado volta para "pendente" (a dívida continua).
 * Day Use "pendente" depois do dia da aula (meia-noite) = EM ATRASO,
 * e o aluno não consegue marcar presença em outra aula.
 */
export type StatusPagamento = "pendente" | "em_analise" | "confirmado" | "recusado" | "cancelado";

export type FormaPagamento = "pix" | "dinheiro" | "outro";

/** Coleção `pagamentos` — só o professor confirma */
export interface Pagamento {
  id: string;
  alunoId: string;
  alunoNome: string;
  tipo: TipoPagamento;
  valor: number;
  forma: FormaPagamento;
  status: StatusPagamento;
  /** Day Use: dia da aula. Depois desse dia, se não pago, está em atraso */
  vencimento: DataISO | null;
  aulaId: string | null;
  presencaId: string | null;
  /** Mensalidade */
  turmaId: string | null;
  cicloInicio: DataISO | null;
  cicloFim: DataISO | null;
  /** Quando o aluno avisou que pagou */
  informadoEm: DataHoraISO | null;
  /** Texto livre do aluno (ex.: "paguei pelo Nubank às 14h") */
  observacaoAluno: string;
  motivoRecusa: string;
  confirmadoPor: string | null;
  confirmadoEm: DataHoraISO | null;
  criadoEm: DataHoraISO;
  atualizadoEm: DataHoraISO;
}

/* ------------------------------------------------------------------ */
/* Notificações                                                        */
/* ------------------------------------------------------------------ */

export type TipoNotificacao =
  | "pagamento_confirmado"
  | "pagamento_recusado"
  | "aula_cancelada"
  | "nova_solicitacao"
  | "experimental_agendada"
  | "aviso";

/** Coleção `notificacoes` */
export interface Notificacao {
  id: string;
  /** Destinatário individual (aluno) */
  usuarioId: string | null;
  /** Ou todos os usuários de um perfil (ex.: todos os professores) */
  paraPerfil: PerfilUsuario | null;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  link: string | null;
  lida: boolean;
  criadoEm: DataHoraISO;
}

/* ------------------------------------------------------------------ */
/* Configurações                                                       */
/* ------------------------------------------------------------------ */

/** Coleção `configuracoes`, documento único `geral` */
export interface Configuracoes {
  id: "geral";
  nomeArena: string;
  chavePix: string;
  nomeRecebedorPix: string;
  cidadeRecebedorPix: string;
  valorDayUse: number;
  valorMensalidadePadrao: number;
  /** Mensalidade do mensalista associado (0 = cobra o valor normal da turma) */
  valorMensalidadeAssociado: number;
  /** false = mensalista marca presença sem custo só na própria turma */
  mensalistaQualquerTurma: boolean;
  diasCicloMensalidade: number;
  whatsappContato: string;
  atualizadoEm: DataHoraISO;
}

/** Campos que o sistema preenche sozinho ao criar um documento */
export type CamposAutomaticos = "id" | "criadoEm" | "atualizadoEm";

export type NovoDocumento<T> = Omit<T, CamposAutomaticos>;
