import type { MapaColecoes, NovoDocumento } from "@/tipos";

export type ChaveColecao = keyof MapaColecoes;
export type Documento<K extends ChaveColecao> = MapaColecoes[K];

export type OperadorFiltro = "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "array-contains";

/** Mesmo formato do `where(campo, operador, valor)` do Firestore */
export interface Filtro {
  campo: string;
  operador: OperadorFiltro;
  valor: unknown;
}

export const onde = (campo: string, operador: OperadorFiltro, valor: unknown): Filtro => ({
  campo,
  operador,
  valor,
});

/** Opções extras de uma consulta */
export interface OpcoesConsulta {
  /**
   * Máximo de documentos. Sem ordenação explícita o Firestore devolve pela
   * ordem do id do documento (usado nas notificações, cujo id já vem do
   * mais novo para o mais antigo).
   */
  limite?: number;
}

/** Aplica filtros na memória (usado quando falta um índice composto no Firestore) */
export function aplicarFiltros<T>(documentos: T[], filtros: Filtro[]): T[] {
  return documentos.filter((documento) =>
    filtros.every(({ campo, operador, valor }) => {
      const atual = (documento as Record<string, unknown>)[campo] as never;
      const v = valor as never;
      switch (operador) {
        case "==":
          return atual === v;
        case "!=":
          return atual !== v;
        case "<":
          return atual < v;
        case "<=":
          return atual <= v;
        case ">":
          return atual > v;
        case ">=":
          return atual >= v;
        case "in":
          return (valor as unknown[]).includes(atual);
        case "array-contains":
          return Array.isArray(atual) && (atual as unknown[]).includes(valor);
      }
    }),
  );
}

export type OperacaoLote =
  | { tipo: "definir"; colecao: ChaveColecao; id: string; dados: Record<string, unknown> }
  | { tipo: "atualizar"; colecao: ChaveColecao; id: string; dados: Record<string, unknown> }
  | { tipo: "remover"; colecao: ChaveColecao; id: string };

export type CancelarObservacao = () => void;

/**
 * Contrato único de acesso a dados, implementado em `adaptadorFirebase`
 * (Cloud Firestore). As telas e serviços só conhecem esta interface.
 */
export interface AdaptadorBanco {
  /** Gera um id novo sem gravar nada (útil para operações em lote) */
  novoId(colecao: ChaveColecao): string;

  listar<K extends ChaveColecao>(colecao: K, filtros?: Filtro[], opcoes?: OpcoesConsulta): Promise<Documento<K>[]>;

  obter<K extends ChaveColecao>(colecao: K, id: string): Promise<Documento<K> | null>;

  /** Cria com id automático. Preenche id, criadoEm e atualizadoEm */
  criar<K extends ChaveColecao>(colecao: K, dados: NovoDocumento<Documento<K>>): Promise<Documento<K>>;

  /** Cria ou substitui um documento com id definido (setDoc) */
  definir<K extends ChaveColecao>(
    colecao: K,
    id: string,
    dados: NovoDocumento<Documento<K>>,
  ): Promise<Documento<K>>;

  /** Atualiza só os campos informados. Preenche atualizadoEm */
  atualizar<K extends ChaveColecao>(colecao: K, id: string, dados: Partial<Documento<K>>): Promise<void>;

  remover(colecao: ChaveColecao, id: string): Promise<void>;

  /** Grava várias operações de forma atômica (writeBatch) */
  lote(operacoes: OperacaoLote[]): Promise<void>;

  /** Tempo real (onSnapshot) de uma coleção, com filtros opcionais */
  observarColecao<K extends ChaveColecao>(
    colecao: K,
    filtros: Filtro[],
    aoMudar: (documentos: Documento<K>[]) => void,
    aoErro?: (erro: Error) => void,
    opcoes?: OpcoesConsulta,
  ): CancelarObservacao;

  /** Tempo real de um único documento */
  observarDocumento<K extends ChaveColecao>(
    colecao: K,
    id: string,
    aoMudar: (documento: Documento<K> | null) => void,
    aoErro?: (erro: Error) => void,
  ): CancelarObservacao;
}
