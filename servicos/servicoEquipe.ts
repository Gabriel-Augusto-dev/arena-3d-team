import { autenticacao, type ResultadoNovaConta } from "@/lib/autenticacao";
import { somenteNumeros } from "@/lib/utilitarios/formatadores";

export interface DadosAuxiliar {
  nome: string;
  email: string;
  whatsapp: string;
}

/**
 * Professor administrador cadastra um professor auxiliar.
 * O auxiliar recebe um e-mail para criar a senha e entra no mesmo app,
 * vendo alunos, aulas, presenças e quem pagou — sem confirmar pagamentos.
 */
export async function cadastrarAuxiliar(dados: DadosAuxiliar): Promise<ResultadoNovaConta> {
  return autenticacao.criarContaPeloProfessor({
    perfil: "auxiliar",
    nome: dados.nome.trim(),
    email: dados.email.trim().toLowerCase(),
    cpf: "",
    dataNascimento: "",
    whatsapp: somenteNumeros(dados.whatsapp),
    plano: "avulso",
    turmaId: null,
    validadeMensalidade: null,
    usouExperimental: true,
    ativo: true,
    observacoes: "",
  });
}
