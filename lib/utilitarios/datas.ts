import type { DataISO, DiaSemana, Horario } from "@/tipos";

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** Converte um Date em "AAAA-MM-DD" no fuso local (sem deslocar para UTC) */
export function paraDataISO(data: Date): DataISO {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

/** Converte "AAAA-MM-DD" em Date ao meio-dia local (evita problemas de fuso) */
export function deDataISO(dataISO: DataISO): Date {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
}

export function hojeISO(): DataISO {
  return paraDataISO(new Date());
}

export function agoraISO(): string {
  return new Date().toISOString();
}

export function adicionarDias(dataISO: DataISO, dias: number): DataISO {
  const data = deDataISO(dataISO);
  data.setDate(data.getDate() + dias);
  return paraDataISO(data);
}

/** Diferença em dias inteiros: positivo se `fim` for depois de `inicio` */
export function diferencaEmDias(inicio: DataISO, fim: DataISO): number {
  const umDia = 24 * 60 * 60 * 1000;
  return Math.round((deDataISO(fim).getTime() - deDataISO(inicio).getTime()) / umDia);
}

export function diaDaSemana(dataISO: DataISO): DiaSemana {
  return deDataISO(dataISO).getDay() as DiaSemana;
}

export function maiorData(a: DataISO, b: DataISO): DataISO {
  return a >= b ? a : b;
}

/** Posição do dia numa semana que começa na segunda (seg = 0 … dom = 6) */
export const ordemNaSemana = (dia: DiaSemana) => (dia + 6) % 7;

export const NOMES_DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const NOMES_DIAS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

/** "Seg e Qua" / "Ter, Qui e Sáb" */
export function descreverDiasSemana(dias: DiaSemana[]): string {
  // Semana começando na segunda: domingo vai para o fim
  const nomes = [...dias].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => NOMES_DIAS_CURTOS[d]);
  if (nomes.length <= 1) return nomes.join("");
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

/** "05/10" */
export function formatarDataCurta(dataISO: DataISO): string {
  const [, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}`;
}

/** "05/10/2026" */
export function formatarData(dataISO: DataISO | null | undefined): string {
  if (!dataISO) return "—";
  const [ano, mes, dia] = dataISO.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/** "segunda-feira, 5 de outubro" */
export function formatarDataExtenso(dataISO: DataISO): string {
  const texto = deDataISO(dataISO).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "Hoje", "Amanhã" ou o dia da semana por extenso ("Sábado") */
export function formatarDiaRelativo(dataISO: DataISO): string {
  const hoje = hojeISO();
  if (dataISO === hoje) return "Hoje";
  if (dataISO === adicionarDias(hoje, 1)) return "Amanhã";
  return NOMES_DIAS[diaDaSemana(dataISO)];
}

/** "Hoje", "Amanhã" ou "Seg, 05/10" */
export function formatarDataRelativa(dataISO: DataISO): string {
  const hoje = hojeISO();
  if (dataISO === hoje) return "Hoje";
  if (dataISO === adicionarDias(hoje, 1)) return "Amanhã";
  if (dataISO === adicionarDias(hoje, -1)) return "Ontem";
  return `${NOMES_DIAS_CURTOS[diaDaSemana(dataISO)]}, ${formatarDataCurta(dataISO)}`;
}

/** "05/10 às 14:32" a partir de um ISO completo */
export function formatarDataHora(dataHoraISO: string | null | undefined): string {
  if (!dataHoraISO) return "—";
  const data = new Date(dataHoraISO);
  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)} às ${doisDigitos(
    data.getHours(),
  )}:${doisDigitos(data.getMinutes())}`;
}

/** "há 5 min", "há 2 h", "ontem" */
export function formatarTempoDecorrido(dataHoraISO: string): string {
  const segundos = Math.floor((Date.now() - new Date(dataHoraISO).getTime()) / 1000);
  if (segundos < 60) return "agora";
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return formatarData(dataHoraISO.slice(0, 10));
}

/** "AAAA-MM" — competência da mensalidade */
export function competencia(dataISO: DataISO): string {
  return dataISO.slice(0, 7);
}

export function formatarCompetencia(dataISO: DataISO): string {
  const texto = deDataISO(dataISO).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** true se a aula (data + horário de início) já começou */
export function aulaJaComecou(dataISO: DataISO, horarioInicio: Horario): boolean {
  const [hora, minuto] = horarioInicio.split(":").map(Number);
  const inicio = deDataISO(dataISO);
  inicio.setHours(hora, minuto, 0, 0);
  return inicio.getTime() <= Date.now();
}

export function saudacao(): string {
  const hora = new Date().getHours();
  if (hora < 5) return "Boa noite";
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}
