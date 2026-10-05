import { gerarDadosIniciais } from "@/lib/dados/dadosIniciais";
import { gerarId } from "@/lib/utilitarios/identificadores";
import type {
  AdaptadorBanco,
  ChaveColecao,
  Documento,
  Filtro,
  OperacaoLote,
} from "./tiposAdaptador";

/**
 * Banco de demonstração salvo no localStorage do navegador.
 * Imita o comportamento do Firestore (inclusive tempo real entre abas),
 * para o sistema funcionar completo antes da integração com o Firebase.
 */

export const CHAVE_BANCO_LOCAL = "arena3d:banco:v5";

type Tabela = Record<string, Record<string, unknown>>;
type BancoEmMemoria = Partial<Record<ChaveColecao, Tabela>>;

let dados: BancoEmMemoria | null = null;
const ouvintes = new Map<ChaveColecao, Set<() => void>>();
let ouvindoOutrasAbas = false;

function carregar(): BancoEmMemoria {
  if (dados) return dados;
  if (typeof window === "undefined") return {};

  const salvo = window.localStorage.getItem(CHAVE_BANCO_LOCAL);
  if (salvo) {
    dados = JSON.parse(salvo) as BancoEmMemoria;
  } else {
    dados = gerarDadosIniciais().banco;
    salvar();
  }

  if (!ouvindoOutrasAbas) {
    ouvindoOutrasAbas = true;
    // Outra aba gravou algo: recarrega e avisa todos os observadores
    window.addEventListener("storage", (evento) => {
      if (evento.key !== CHAVE_BANCO_LOCAL) return;
      dados = evento.newValue ? (JSON.parse(evento.newValue) as BancoEmMemoria) : null;
      ouvintes.forEach((conjunto) => conjunto.forEach((avisar) => avisar()));
    });
  }
  return dados;
}

function salvar() {
  if (typeof window === "undefined" || !dados) return;
  window.localStorage.setItem(CHAVE_BANCO_LOCAL, JSON.stringify(dados));
}

function tabela(colecao: ChaveColecao): Tabela {
  const banco = carregar();
  if (!banco[colecao]) banco[colecao] = {};
  return banco[colecao]!;
}

function avisar(colecoes: Iterable<ChaveColecao>) {
  const unicas = new Set(colecoes);
  // Assíncrono, como o onSnapshot
  queueMicrotask(() => {
    unicas.forEach((colecao) => ouvintes.get(colecao)?.forEach((fn) => fn()));
  });
}

function lerCampo(documento: Record<string, unknown>, caminho: string): unknown {
  return caminho.split(".").reduce<unknown>((valor, parte) => {
    if (valor && typeof valor === "object") return (valor as Record<string, unknown>)[parte];
    return undefined;
  }, documento);
}

function atendeFiltro(documento: Record<string, unknown>, filtro: Filtro): boolean {
  const valor = lerCampo(documento, filtro.campo) as never;
  const alvo = filtro.valor as never;
  switch (filtro.operador) {
    case "==":
      return valor === alvo;
    case "!=":
      return valor !== alvo;
    case "<":
      return valor < alvo;
    case "<=":
      return valor <= alvo;
    case ">":
      return valor > alvo;
    case ">=":
      return valor >= alvo;
    case "in":
      return Array.isArray(filtro.valor) && (filtro.valor as unknown[]).includes(valor);
    case "array-contains":
      return Array.isArray(valor) && (valor as unknown[]).includes(filtro.valor);
  }
}

function filtrar<K extends ChaveColecao>(colecao: K, filtros: Filtro[] = []): Documento<K>[] {
  const documentos = Object.values(tabela(colecao));
  return documentos
    .filter((doc) => filtros.every((f) => atendeFiltro(doc, f)))
    .map((doc) => structuredClone(doc) as unknown as Documento<K>);
}

const agora = () => new Date().toISOString();

function aplicarOperacao(operacao: OperacaoLote) {
  const t = tabela(operacao.colecao);
  if (operacao.tipo === "remover") {
    delete t[operacao.id];
    return;
  }
  if (operacao.tipo === "definir") {
    const existente = t[operacao.id];
    t[operacao.id] = {
      ...operacao.dados,
      id: operacao.id,
      criadoEm: (existente?.criadoEm as string) ?? agora(),
      atualizadoEm: agora(),
    };
    return;
  }
  const existente = t[operacao.id];
  if (!existente) throw new Error(`Documento ${operacao.colecao}/${operacao.id} não encontrado`);
  t[operacao.id] = { ...existente, ...operacao.dados, id: operacao.id, atualizadoEm: agora() };
}

export function criarAdaptadorLocal(): AdaptadorBanco {
  return {
    novoId: () => gerarId(),

    async listar(colecao, filtros) {
      return filtrar(colecao, filtros);
    },

    async obter(colecao, id) {
      const doc = tabela(colecao)[id];
      return doc ? (structuredClone(doc) as unknown as Documento<typeof colecao>) : null;
    },

    async criar(colecao, novo) {
      const id = gerarId();
      aplicarOperacao({ tipo: "definir", colecao, id, dados: novo as Record<string, unknown> });
      salvar();
      avisar([colecao]);
      return structuredClone(tabela(colecao)[id]) as unknown as Documento<typeof colecao>;
    },

    async definir(colecao, id, novo) {
      aplicarOperacao({ tipo: "definir", colecao, id, dados: novo as Record<string, unknown> });
      salvar();
      avisar([colecao]);
      return structuredClone(tabela(colecao)[id]) as unknown as Documento<typeof colecao>;
    },

    async atualizar(colecao, id, parcial) {
      aplicarOperacao({ tipo: "atualizar", colecao, id, dados: parcial as Record<string, unknown> });
      salvar();
      avisar([colecao]);
    },

    async remover(colecao, id) {
      aplicarOperacao({ tipo: "remover", colecao, id });
      salvar();
      avisar([colecao]);
    },

    async lote(operacoes) {
      // Atômico: valida tudo numa cópia antes de aplicar
      const copia = structuredClone(carregar());
      try {
        operacoes.forEach(aplicarOperacao);
      } catch (erro) {
        dados = copia;
        throw erro;
      }
      salvar();
      avisar(operacoes.map((op) => op.colecao));
    },

    observarColecao(colecao, filtros, aoMudar) {
      const emitir = () => aoMudar(filtrar(colecao, filtros));
      if (!ouvintes.has(colecao)) ouvintes.set(colecao, new Set());
      ouvintes.get(colecao)!.add(emitir);
      queueMicrotask(emitir);
      return () => ouvintes.get(colecao)?.delete(emitir);
    },

    observarDocumento(colecao, id, aoMudar) {
      const emitir = () => {
        const doc = tabela(colecao)[id];
        aoMudar(doc ? (structuredClone(doc) as unknown as Documento<typeof colecao>) : null);
      };
      if (!ouvintes.has(colecao)) ouvintes.set(colecao, new Set());
      ouvintes.get(colecao)!.add(emitir);
      queueMicrotask(emitir);
      return () => ouvintes.get(colecao)?.delete(emitir);
    },
  };
}

/** Apaga tudo e recria os dados de exemplo (botão "Restaurar demonstração") */
export function restaurarDadosDemonstracao() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CHAVE_BANCO_LOCAL);
  dados = null;
  carregar();
  ouvintes.forEach((conjunto) => conjunto.forEach((fn) => fn()));
}
