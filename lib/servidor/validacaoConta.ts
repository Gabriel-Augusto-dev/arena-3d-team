import type { Usuario } from "@/tipos";
import { ErroHttp } from "./rotas";

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
      usouExperimental: true,
      ativo: true,
      observacoes: "",
    };
  }

  const plano = dados.plano === "mensalista" ? "mensalista" : "avulso";
  const turmaId = plano === "mensalista" ? texto(dados.turmaId, 100) : "";
  if (plano === "mensalista" && !turmaId) throw new ErroHttp(400, "Escolha a turma do mensalista");
  const validade = dataOuVazio(dados.validadeMensalidade);

  return {
    perfil,
    nome,
    email,
    cpf: numeros(dados.cpf),
    dataNascimento: dataOuVazio(dados.dataNascimento),
    whatsapp: numeros(dados.whatsapp),
    plano,
    turmaId: turmaId || null,
    validadeMensalidade: validade || null,
    usouExperimental: dados.usouExperimental === true,
    associado: plano === "mensalista" && dados.associado === true,
    ativo: dados.ativo !== false,
    observacoes: texto(dados.observacoes, 1000),
  };
}
