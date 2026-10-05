import { criarAutenticacaoFirebase } from "./autenticacaoFirebase";
import type { AdaptadorAutenticacao } from "./tiposAutenticacao";

export * from "./tiposAutenticacao";

let instancia: AdaptadorAutenticacao | null = null;

function obterInstancia(): AdaptadorAutenticacao {
  instancia ??= criarAutenticacaoFirebase();
  return instancia;
}

/** Autenticação (Firebase Auth). A instância só é criada no primeiro uso */
export const autenticacao: AdaptadorAutenticacao = new Proxy({} as AdaptadorAutenticacao, {
  get: (_alvo, propriedade) => Reflect.get(obterInstancia(), propriedade),
});
