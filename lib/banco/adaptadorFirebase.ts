import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
  type QueryConstraint,
} from "firebase/firestore";
import { obterAppFirebase } from "@/lib/firebase/configuracao";
import type { AdaptadorBanco, ChaveColecao, Documento, Filtro } from "./tiposAdaptador";

/**
 * Implementação do banco usando Cloud Firestore.
 * Ative com NEXT_PUBLIC_USAR_FIREBASE=true no arquivo .env.local
 */

const agora = () => new Date().toISOString();

function paraRestricoes(filtros: Filtro[] = []): QueryConstraint[] {
  return filtros.map((f) => where(f.campo, f.operador, f.valor));
}

function comId<K extends ChaveColecao>(id: string, dados: DocumentData): Documento<K> {
  return { ...dados, id } as Documento<K>;
}

/** O Firestore não aceita `undefined`: remove esses campos antes de gravar */
function limpar(dados: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(dados).filter(([, valor]) => valor !== undefined));
}

export function criarAdaptadorFirebase(): AdaptadorBanco {
  let instancia: Firestore | null = null;
  const db = () => (instancia ??= getFirestore(obterAppFirebase()));

  return {
    novoId: (colecao) => doc(collection(db(), colecao)).id,

    async listar(colecao, filtros) {
      const consulta = query(collection(db(), colecao), ...paraRestricoes(filtros));
      const resultado = await getDocs(consulta);
      return resultado.docs.map((d) => comId<typeof colecao>(d.id, d.data()));
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

    observarColecao(colecao, filtros, aoMudar, aoErro) {
      const consulta = query(collection(db(), colecao), ...paraRestricoes(filtros));
      return onSnapshot(
        consulta,
        (resultado) => aoMudar(resultado.docs.map((d) => comId<typeof colecao>(d.id, d.data()))),
        (erro) => aoErro?.(erro),
      );
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
