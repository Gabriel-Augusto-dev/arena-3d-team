import { cpfEmUso, ErroHttp, lerCorpo, responder, tratarErro } from "@/lib/servidor/rotas";

/** Limite simples por IP (por instância do servidor) para ninguém varrer CPFs */
const consultas = new Map<string, { inicio: number; total: number }>();
const JANELA_MS = 10 * 60_000;
const MAXIMO = 20;

/**
 * POST /api/contas/cpf — usado no cadastro feito pelo próprio aluno (ainda sem
 * login): diz se o CPF já está em outra conta. Só responde sim/não.
 */
export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const agora = Date.now();
    const atual = consultas.get(ip);
    if (!atual || agora - atual.inicio > JANELA_MS) consultas.set(ip, { inicio: agora, total: 1 });
    else if (++atual.total > MAXIMO) throw new ErroHttp(429, "Muitas tentativas. Aguarde alguns minutos");
    if (consultas.size > 5000) consultas.clear();

    const { cpf: bruto } = await lerCorpo<{ cpf: string }>(request);
    const cpf = typeof bruto === "string" ? bruto.replace(/\D/g, "") : "";
    if (cpf.length !== 11) throw new ErroHttp(400, "CPF inválido");
    return responder({ disponivel: !(await cpfEmUso(cpf)) });
  } catch (erro) {
    return tratarErro(erro);
  }
}
