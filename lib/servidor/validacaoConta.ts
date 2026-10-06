import type { Usuario } from "@/tipos";
import { ErroHttp } from "./rotas";
import { camposDasMatriculas } from "@/servicos/regras/regrasMensalidade";

const texto = (valor: unknown, maximo = 200) => (typeof valor === "string" ? valor.trim().slice(0, maximo) : "");
const numeros = (valor: unknown) => texto(valor, 40).replace(/\D/g, "");
const dataOuVazio = (valor: unknown) => (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : "");

export type PerfilNovaConta = Omit<Usuario, "id" | "criadoEm" | "atualizadoEm"> & { perfil: "aluno" | "auxiliar" };

/**
 * Monta o documento `usuarios/{uid}` a partir do que veio da tela,
 * campo a campo (nada além do esperado entra no banco).
 */
export function validarNovaConta(entrada: unknown): PerfilNovaConta {
  const dados = (entrada ?? {}) as Record<string, unknown>;
  const perfil = dados.perfil;
  if (perfil !== "aluno" && perfil !== "auxiliar") throw new ErroHttp(400, "Tipo de conta inválido");

  const nome = texto(dados.nome, 120);
  const email = texto(dados.email, 200).toLowerCase();
  if (nome.split(/\s+/).length < 2) throw new ErroHttp(400, "Informe nome e sobrenome");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErroHttp(400, "E-mail inválido");

  if (perfil === "auxiliar") {
    return {
      perfil,
      nome,
      email,
      cpf: "",
      dataNascimento: "",
      whatsapp: numeros(dados.whatsapp),
      plano: "avulso",
      turmaId: null,
      validadeMensalidade: null,
      turmasIds: [],
      validades: {},
      usouExperimental: true,
      ativo: true,
      observacoes: "",
    };
  }

  const plano = dados.plano === "mensalista" ? "mensalista" : "avulso";
  // Mensalista pode ter mais de uma turma, cada uma com a validade da sua mensalidade
  const ids = [dados.turmaId, ...(Array.isArray(dados.turmasIds) ? dados.turmasIds : [])]
    .map((id) => texto(id, 100))
    .filter((id, i, lista) => id && lista.indexOf(id) === i)
    .slice(0, 10);
  const validadesRecebidas = (dados.validades ?? {}) as Record<string, unknown>;
  const matriculas =
    plano === "mensalista"
      ? ids.map((turmaId, i) => ({
          turmaId,
          validade:
            dataOuVazio(validadesRecebidas[turmaId]) || (i === 0 ? dataOuVazio(dados.validadeMensalidade) : "") || null,
        }))
      : [];
  if (plano === "mensalista" && !matriculas.length) throw new ErroHttp(400, "Escolha a turma do mensalista");

  return {
    perfil,
    nome,
    email,
    cpf: numeros(dados.cpf),
    dataNascimento: dataOuVazio(dados.dataNascimento),
    whatsapp: numeros(dados.whatsapp),
    plano,
    ...camposDasMatriculas(matriculas),
    usouExperimental: dados.usouExperimental === true,
    associado: plano === "mensalista" && dados.associado === true,
    ativo: dados.ativo !== false,
    observacoes: texto(dados.observacoes, 1000),
  };
}
