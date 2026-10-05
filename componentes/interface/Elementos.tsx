"use client";

import Link from "next/link";
import { ChevronRight, LoaderCircle, type LucideIcon } from "lucide-react";
import { iniciais } from "@/lib/utilitarios/formatadores";

/* ---------------- Selo (status) ---------------- */

export type Tom = "verde" | "vermelho" | "amarelo" | "azul" | "cinza" | "escuro";

const tons: Record<Tom, string> = {
  verde: "bg-ok-fundo text-ok",
  vermelho: "bg-erro-fundo text-erro",
  amarelo: "bg-alerta-fundo text-alerta",
  azul: "bg-marinho-100 text-marinho-700",
  cinza: "bg-fundo text-suave ring-1 ring-inset ring-linha",
  escuro: "bg-marinho-900 text-white",
};

export function Selo({
  tom = "cinza",
  children,
  ponto = false,
  className = "",
}: {
  tom?: Tom;
  children: React.ReactNode;
  ponto?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tons[tom]} ${className}`}
    >
      {ponto && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ---------------- Avatar ---------------- */

const coresAvatar = [
  "bg-marinho-600 text-white",
  "bg-laranja-500 text-marinho-950",
  "bg-areia-200 text-marinho-900",
  "bg-marinho-800 text-laranja-300",
  "bg-marinho-200 text-marinho-900",
];

export function Avatar({ nome, tamanho = "medio" }: { nome: string; tamanho?: "pequeno" | "medio" | "grande" }) {
  const indice = [...nome].reduce((t, c) => t + c.charCodeAt(0), 0) % coresAvatar.length;
  const medidas = { pequeno: "size-9 text-xs", medio: "size-11 text-sm", grande: "size-16 text-xl" };
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-titulo font-bold ${medidas[tamanho]} ${coresAvatar[indice]}`}
    >
      {iniciais(nome)}
    </span>
  );
}

/* ---------------- Cartão ---------------- */

export function Cartao({
  children,
  className = "",
  ...resto
}: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-3xl bg-white p-4 ring-1 ring-linha/70 sm:p-5 ${className}`} {...resto}>
      {children}
    </div>
  );
}

/* ---------------- Cabeçalhos ---------------- */

export function TituloPagina({
  titulo,
  subtitulo,
  acao,
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-titulo text-[34px] font-extrabold italic uppercase leading-none sm:text-[42px]">{titulo}</h1>
        {subtitulo && <p className="mt-2 text-[15px] text-suave">{subtitulo}</p>}
      </div>
      {acao}
    </header>
  );
}

export function TituloSecao({
  titulo,
  acao,
  className = "",
}: {
  titulo: React.ReactNode;
  acao?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-3 flex items-center justify-between gap-3 ${className}`}>
      <h2 className="font-titulo text-xl font-bold">{titulo}</h2>
      {acao}
    </div>
  );
}

export function LinkSecao({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-0.5 text-sm font-semibold text-marinho-600 hover:text-marinho-800">
      {children}
      <ChevronRight className="size-4" />
    </Link>
  );
}

/* ---------------- Estados ---------------- */

export function EstadoVazio({
  icone: Icone,
  titulo,
  descricao,
  acao,
  compacto = false,
}: {
  icone: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  compacto?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-3xl border border-dashed border-linha bg-white/50 text-center ${
        compacto ? "px-4 py-6" : "px-6 py-10"
      }`}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-marinho-100 text-marinho-600">
        <Icone className="size-6" />
      </span>
      <p className="mt-3 font-semibold">{titulo}</p>
      {descricao && <p className="mt-1 max-w-xs text-sm text-suave">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-suave">
      <LoaderCircle className="size-5 animate-spin text-marinho-500" />
      {texto}
    </div>
  );
}

export function EsqueletoLista({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden>
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-white/70" />
      ))}
    </div>
  );
}

/* ---------------- Abas (controle segmentado) ---------------- */

export function Abas<T extends string>({
  abas,
  ativa,
  aoMudar,
  className = "",
}: {
  abas: { valor: T; rotulo: string; contador?: number }[];
  ativa: T;
  aoMudar(valor: T): void;
  className?: string;
}) {
  return (
    <div role="tablist" className={`flex gap-1 rounded-2xl bg-marinho-100/60 p-1 ${className}`}>
      {abas.map((aba) => {
        const selecionada = aba.valor === ativa;
        return (
          <button
            key={aba.valor}
            role="tab"
            aria-selected={selecionada}
            onClick={() => aoMudar(aba.valor)}
            className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-1.5 text-[13px] font-semibold transition min-[360px]:px-2 min-[360px]:text-sm sm:px-3 ${
              selecionada ? "bg-white text-tinta shadow-sm" : "text-suave hover:text-tinta"
            }`}
          >
            {aba.rotulo}
            {aba.contador !== undefined && aba.contador > 0 && (
              <span
                className={`grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold leading-5 ${
                  selecionada ? "bg-laranja-500 text-marinho-950" : "bg-marinho-200 text-marinho-800"
                }`}
              >
                {aba.contador}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Fichas de filtro ---------------- */

export function FichasFiltro<T extends string>({
  opcoes,
  ativa,
  aoMudar,
}: {
  opcoes: { valor: T; rotulo: string; contador?: number }[];
  ativa: T;
  aoMudar(valor: T): void;
}) {
  return (
    <div className="sem-barra -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {opcoes.map((opcao) => {
        const selecionada = opcao.valor === ativa;
        return (
          <button
            key={opcao.valor}
            onClick={() => aoMudar(opcao.valor)}
            aria-pressed={selecionada}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition ${
              selecionada ? "bg-marinho-900 text-white" : "bg-white text-suave ring-1 ring-inset ring-linha hover:text-tinta"
            }`}
          >
            {opcao.rotulo}
            {opcao.contador !== undefined && (
              <span className={`numeros text-xs ${selecionada ? "text-laranja-400" : "text-suave/70"}`}>{opcao.contador}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Números ---------------- */

export function CartaoNumero({
  rotulo,
  valor,
  detalhe,
  icone: Icone,
  href,
  realce = false,
}: {
  rotulo: string;
  valor: React.ReactNode;
  detalhe?: React.ReactNode;
  icone: LucideIcon;
  href?: string;
  realce?: boolean;
}) {
  const conteudo = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className={`truncate text-[13px] font-semibold ${realce ? "text-marinho-100" : "text-suave"}`}>{rotulo}</span>
        <Icone className={`size-[18px] shrink-0 ${realce ? "text-laranja-400" : "text-marinho-500"}`} />
      </div>
      <p className="numeros mt-2 truncate font-titulo text-[26px] font-extrabold leading-none sm:text-[30px]">{valor}</p>
      {detalhe && <p className={`mt-1.5 truncate text-xs ${realce ? "text-marinho-100" : "text-suave"}`}>{detalhe}</p>}
    </>
  );
  const estilo = `block min-w-0 rounded-3xl p-4 transition ${
    realce ? "bg-marinho-900 text-white" : "bg-white ring-1 ring-linha/70"
  } ${href ? "hover:-translate-y-0.5 hover:shadow-md" : ""}`;
  return href ? (
    <Link href={href} className={estilo}>
      {conteudo}
    </Link>
  ) : (
    <div className={estilo}>{conteudo}</div>
  );
}

/* ---------------- Linha de definição ---------------- */

export function LinhaInfo({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-[15px]">
      <dt className="text-suave">{rotulo}</dt>
      <dd className="text-right font-semibold">{valor}</dd>
    </div>
  );
}
