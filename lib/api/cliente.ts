import { obterAuth } from "@/lib/firebase/clientes";

/** Erro devolvido pelas rotas /api (mensagem já pronta para mostrar na tela) */
export class ErroApi extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
  ) {
    super(mensagem);
  }
}

/**
 * Chama uma rota do próprio app (app/api/...). Por padrão envia o token do
 * usuário logado, que o servidor confere antes de fazer qualquer coisa.
 */
export async function chamarApi<T = Record<string, unknown>>(
  caminho: string,
  corpo: unknown = {},
  { autenticado = true }: { autenticado?: boolean } = {},
): Promise<T> {
  const cabecalhos: Record<string, string> = { "Content-Type": "application/json" };
  if (autenticado) {
    const usuario = obterAuth().currentUser;
    if (!usuario) throw new ErroApi("Sua sessão expirou. Entre de novo", 401);
    cabecalhos.Authorization = `Bearer ${await usuario.getIdToken()}`;
  }

  let resposta: Response;
  try {
    resposta = await fetch(caminho, { method: "POST", headers: cabecalhos, body: JSON.stringify(corpo) });
  } catch {
    throw new ErroApi("Sem conexão com a internet", 0);
  }
  const dados = (await resposta.json().catch(() => ({}))) as { erro?: string };
  if (!resposta.ok) {
    throw new ErroApi(dados.erro ?? `Não foi possível concluir. Tente novamente (erro ${resposta.status})`, resposta.status);
  }
  return dados as T;
}
