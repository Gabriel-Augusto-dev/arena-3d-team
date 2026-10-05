import { firebaseAtivo } from "@/lib/firebase/configuracao";
import { criarAutenticacaoFirebase } from "./autenticacaoFirebase";
import { criarAutenticacaoLocal } from "./autenticacaoLocal";
import type { AdaptadorAutenticacao } from "./tiposAutenticacao";

export * from "./tiposAutenticacao";

let instancia: AdaptadorAutenticacao | null = null;

function obterInstancia(): AdaptadorAutenticacao {
  instancia ??= firebaseAtivo ? criarAutenticacaoFirebase() : criarAutenticacaoLocal();
  return instancia;
}

export const autenticacao: AdaptadorAutenticacao = new Proxy({} as AdaptadorAutenticacao, {
  get: (_alvo, propriedade) => Reflect.get(obterInstancia(), propriedade),
});
