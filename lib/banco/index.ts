import { firebaseAtivo } from "@/lib/firebase/configuracao";
import { criarAdaptadorFirebase } from "./adaptadorFirebase";
import { criarAdaptadorLocal } from "./adaptadorLocal";
import type { AdaptadorBanco } from "./tiposAdaptador";

export * from "./tiposAdaptador";

let instancia: AdaptadorBanco | null = null;

function obterInstancia(): AdaptadorBanco {
  instancia ??= firebaseAtivo ? criarAdaptadorFirebase() : criarAdaptadorLocal();
  return instancia;
}

/**
 * Ponto único de acesso ao banco. Troca entre localStorage e Firestore
 * pela variável NEXT_PUBLIC_USAR_FIREBASE, sem mudar nenhuma tela.
 */
export const banco: AdaptadorBanco = new Proxy({} as AdaptadorBanco, {
  get: (_alvo, propriedade) => Reflect.get(obterInstancia(), propriedade),
});
