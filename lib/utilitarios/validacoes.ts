import { somenteNumeros } from "./formatadores";

export function validarCpf(cpf: string): boolean {
  const n = somenteNumeros(cpf);
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;

  const calcularDigito = (base: string, pesoInicial: number) => {
    const soma = base
      .split("")
      .reduce((total, digito, indice) => total + Number(digito) * (pesoInicial - indice), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const digito1 = calcularDigito(n.slice(0, 9), 10);
  const digito2 = calcularDigito(n.slice(0, 10), 11);
  return digito1 === Number(n[9]) && digito2 === Number(n[10]);
}

export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").trim());
}

export function validarTelefone(telefone: string): boolean {
  const n = somenteNumeros(telefone);
  return n.length === 10 || n.length === 11;
}

export type ErrosFormulario<T> = Partial<Record<keyof T, string>>;

export interface DadosPessoais {
  nome: string;
  email: string;
  cpf: string;
  dataNascimento: string;
  whatsapp: string;
}

/** Validação compartilhada entre cadastro, perfil e cadastro pelo professor */
export function validarDadosPessoais(dados: DadosPessoais): ErrosFormulario<DadosPessoais> {
  const erros: ErrosFormulario<DadosPessoais> = {};
  if (dados.nome.trim().split(/\s+/).length < 2) erros.nome = "Informe nome e sobrenome";
  if (!validarEmail(dados.email)) erros.email = "E-mail inválido";
  if (!validarCpf(dados.cpf)) erros.cpf = "CPF inválido";
  if (!dados.dataNascimento) erros.dataNascimento = "Informe a data de nascimento";
  if (!validarTelefone(dados.whatsapp)) erros.whatsapp = "WhatsApp com DDD";
  return erros;
}
