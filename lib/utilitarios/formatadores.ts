const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarMoeda(valor: number): string {
  return formatadorMoeda.format(valor || 0);
}

export function somenteNumeros(texto: string): string {
  return (texto || "").replace(/\D/g, "");
}

/** 123.456.789-09 */
export function formatarCpf(cpf: string): string {
  const n = somenteNumeros(cpf).slice(0, 11);
  return n
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** (11) 98765-4321 */
export function formatarTelefone(telefone: string): string {
  const n = somenteNumeros(telefone).slice(0, 11);
  if (n.length <= 2) return n.length ? `(${n}` : "";
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

/** Link para conversar no WhatsApp */
export function linkWhatsapp(telefone: string, mensagem?: string): string {
  let n = somenteNumeros(telefone);
  if (n.length <= 11) n = `55${n}`;
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : "";
  return `https://wa.me/${n}${texto}`;
}

/** "Ana Souza" → "AS" */
export function iniciais(nome: string): string {
  const partes = (nome || "?").trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function primeiroNome(nome: string): string {
  return (nome || "").trim().split(/\s+/)[0] ?? "";
}

/** Remove acentos: "São Paulo" → "Sao Paulo" */
export function removerAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Comparação de busca sem acento e sem diferenciar maiúsculas */
export function contemTexto(alvo: string, busca: string): boolean {
  return removerAcentos(alvo.toLowerCase()).includes(removerAcentos(busca.toLowerCase().trim()));
}

export function calcularIdade(dataNascimento: string): number | null {
  if (!dataNascimento) return null;
  const [ano, mes, dia] = dataNascimento.split("-").map(Number);
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) idade--;
  return idade;
}
