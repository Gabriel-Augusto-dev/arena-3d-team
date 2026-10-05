import { criarAdaptadorFirebase } from "./adaptadorFirebase";
import type { AdaptadorBanco } from "./tiposAdaptador";

export * from "./tiposAdaptador";

let instancia: AdaptadorBanco | null = null;

function obterInstancia(): AdaptadorBanco {
  instancia ??= criarAdaptadorFirebase();
  return instancia;
}

/**
 * Ponto único de acesso ao banco (Cloud Firestore).
 * As telas e serviços nunca falam com o Firebase direto: usam `banco`.
 * A instância só é criada no primeiro uso (no navegador).
 */
export const banco: AdaptadorBanco = new Proxy({} as AdaptadorBanco, {
  get: (_alvo, propriedade) => Reflect.get(obterInstancia(), propriedade),
});
