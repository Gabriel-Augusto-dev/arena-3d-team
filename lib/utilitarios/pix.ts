import { removerAcentos } from "./formatadores";
import { validarCpf } from "./validacoes";

/**
 * Gera o código PIX "copia e cola" (BR Code estático, padrão EMV do Banco
 * Central). O mesmo texto é usado para desenhar o QR Code.
 */
export interface DadosPix {
  chave: string;
  nomeRecebedor: string;
  cidadeRecebedor: string;
  valor?: number;
  /** Identificador da transação: até 25 letras/números */
  identificador?: string;
  descricao?: string;
}

function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

function limparTexto(texto: string, tamanhoMaximo: number): string {
  return removerAcentos(texto)
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .trim()
    .slice(0, tamanhoMaximo);
}

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF) */
function calcularCrc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Deixa a chave PIX no formato que os bancos aceitam no QR Code:
 *  - CPF / CNPJ  → só números
 *  - telefone    → +55 + DDD + número
 *  - e-mail      → minúsculas
 *  - aleatória   → como está (minúsculas, com os hífens)
 */
export function normalizarChavePix(chave: string): string {
  const texto = chave.trim();
  if (!texto) return "";
  if (texto.includes("@")) return texto.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(texto)) return texto.toLowerCase();

  const numeros = texto.replace(/\D/g, "");
  const pareceTelefone = texto.startsWith("+") || /[()]/.test(texto);
  if (!pareceTelefone) {
    if (numeros.length === 14) return numeros; // CNPJ
    if (numeros.length === 11 && validarCpf(numeros)) return numeros; // CPF
  }
  if (numeros.length === 10 || numeros.length === 11) return `+55${numeros}`; // DDD + número
  if ((numeros.length === 12 || numeros.length === 13) && numeros.startsWith("55")) return `+${numeros}`;
  return texto;
}

export function gerarCodigoPix(dados: DadosPix): string {
  const contaPix =
    campo("00", "br.gov.bcb.pix") +
    campo("01", normalizarChavePix(dados.chave)) +
    (dados.descricao ? campo("02", limparTexto(dados.descricao, 40)) : "");

  const identificador = (dados.identificador || "***").replace(/[^A-Za-z0-9*]/g, "").slice(0, 25) || "***";

  const semCrc =
    campo("00", "01") +
    campo("26", contaPix) +
    campo("52", "0000") +
    campo("53", "986") +
    (dados.valor && dados.valor > 0 ? campo("54", dados.valor.toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", limparTexto(dados.nomeRecebedor, 25) || "RECEBEDOR") +
    campo("60", limparTexto(dados.cidadeRecebedor, 15) || "BRASIL") +
    campo("62", campo("05", identificador)) +
    "6304";

  return semCrc + calcularCrc16(semCrc);
}
