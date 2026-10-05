import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { obterFirestore } from "@/lib/firebase/clientes";
import {
  aplicarFiltros,
  type AdaptadorBanco,
  type ChaveColecao,
  type Documento,
  type Filtro,
  type OpcoesConsulta,
} from "./tiposAdaptador";

/** Implementação do banco usando o Cloud Firestore */

const agora = () => new Date().toISOString();

function paraRestricoes(filtros: Filtro[] = [], opcoes: OpcoesConsulta = {}): QueryConstraint[] {
  const restricoes: QueryConstraint[] = filtros.map((f) => where(f.campo, f.operador, f.valor));
  if (opcoes.limite) restricoes.push(limit(opcoes.limite));
  return restricoes;
}

/**
 * Consulta com igualdade + intervalo em campos diferentes precisa de um
 * índice composto (firestore.indexes.json). Se o índice ainda não foi
 * criado, o app não para: busca só pelo primeiro filtro (a igualdade, que
 * as regras exigem) e aplica o resto na memória. Funciona igual, só lê mais.
 */
const faltaIndice = (erro: unknown) => (erro as { code?: string })?.code === "failed-precondition";

function avisarIndice(colecao: string, erro: unknown) {
  console.warn(
    `[firestore] Falta um índice composto em "${colecao}". O app continua funcionando, mas lendo mais documentos. ` +
      "Crie os índices de firestore.indexes.json (veja o README). Detalhe:",
    (erro as Error)?.message,
  );
}

function comId<K extends ChaveColecao>(id: string, dados: DocumentData): Documento<K> {
  return { ...dados, id } as Documento<K>;
}

/** O Firestore não aceita `undefined`: remove esses campos antes de gravar */
function limpar(dados: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(dados).filter(([, valor]) => valor !== undefined));
}

export function criarAdaptadorFirebase(): AdaptadorBanco {
  const db = obterFirestore;

  return {
    novoId: (colecao) => doc(collection(db(), colecao)).id,

    async listar(colecao, filtros = [], opcoes) {
      const buscar = async (lista: Filtro[]) => {
        const resultado = await getDocs(query(collection(db(), colecao), ...paraRestricoes(lista, opcoes)));
        return resultado.docs.map((d) => comId<typeof colecao>(d.id, d.data()));
      };
      try {
        return await buscar(filtros);
      } catch (erro) {
        if (!faltaIndice(erro) || filtros.length < 2) throw erro;
        avisarIndice(colecao, erro);
        return aplicarFiltros(await buscar(filtros.slice(0, 1)), filtros.slice(1));
      }
    },

    async obter(colecao, id) {
      const resultado = await getDoc(doc(db(), colecao, id));
      return resultado.exists() ? comId<typeof colecao>(resultado.id, resultado.data()) : null;
    },

    async criar(colecao, novo) {
      const referencia = doc(collection(db(), colecao));
      const dados = { ...limpar(novo as Record<string, unknown>), criadoEm: agora(), atualizadoEm: agora() };
      await setDoc(referencia, dados);
      return comId<typeof colecao>(referencia.id, dados);
    },

    async definir(colecao, id, novo) {
      const referencia = doc(db(), colecao, id);
      const existente = await getDoc(referencia);
      const dados = {
        ...limpar(novo as Record<string, unknown>),
        criadoEm: existente.exists() ? existente.data().criadoEm : agora(),
        atualizadoEm: agora(),
      };
      await setDoc(referencia, dados);
      return comId<typeof colecao>(id, dados);
    },

    async atualizar(colecao, id, parcial) {
      const dados: Record<string, unknown> = { ...limpar(parcial as Record<string, unknown>), atualizadoEm: agora() };
      delete dados.id;
      await updateDoc(doc(db(), colecao, id), dados);
    },

    async remover(colecao, id) {
      await deleteDoc(doc(db(), colecao, id));
    },

    async lote(operacoes) {
      const loteFirestore = writeBatch(db());
      for (const op of operacoes) {
        const referencia = doc(db(), op.colecao, op.id);
        if (op.tipo === "remover") loteFirestore.delete(referencia);
        else if (op.tipo === "definir")
          loteFirestore.set(referencia, {
            ...limpar(op.dados),
            criadoEm: (op.dados.criadoEm as string) ?? agora(),
            atualizadoEm: agora(),
          });
        else loteFirestore.update(referencia, { ...limpar(op.dados), atualizadoEm: agora() });
      }
      await loteFirestore.commit();
    },

    observarColecao(colecao, filtros, aoMudar, aoErro, opcoes) {
      let cancelar = () => {};
      const observar = (lista: Filtro[], locais: Filtro[]) => {
        cancelar = onSnapshot(
          query(collection(db(), colecao), ...paraRestricoes(lista, opcoes)),
          (resultado) => {
            const documentos = resultado.docs.map((d) => comId<typeof colecao>(d.id, d.data()));
            aoMudar(locais.length ? aplicarFiltros(documentos, locais) : documentos);
          },
          (erro) => {
            if (faltaIndice(erro) && lista.length > 1) {
              avisarIndice(colecao, erro);
              observar(lista.slice(0, 1), lista.slice(1));
            } else aoErro?.(erro);
          },
        );
      };
      observar(filtros, []);
      return () => cancelar();
    },

    observarDocumento(colecao, id, aoMudar, aoErro) {
      return onSnapshot(
        doc(db(), colecao, id),
        (resultado) => aoMudar(resultado.exists() ? comId<typeof colecao>(resultado.id, resultado.data()) : null),
        (erro) => aoErro?.(erro),
      );
    },
  };
}
