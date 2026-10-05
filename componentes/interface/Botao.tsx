"use client";

import Link from "next/link";
import { LoaderCircle, type LucideIcon } from "lucide-react";

type Variante = "primario" | "destaque" | "secundario" | "fantasma" | "perigo" | "sucesso";
type Tamanho = "pequeno" | "medio" | "grande";

const variantes: Record<Variante, string> = {
  primario: "bg-marinho-900 text-white hover:bg-marinho-800 active:bg-marinho-950",
  destaque: "bg-laranja-500 text-marinho-950 hover:bg-laranja-400 active:bg-laranja-600",
  secundario: "bg-white text-tinta ring-1 ring-inset ring-linha hover:bg-marinho-50",
  fantasma: "text-marinho-700 hover:bg-marinho-100/70",
  perigo: "bg-erro-fundo text-erro hover:bg-erro hover:text-white",
  sucesso: "bg-ok text-white hover:brightness-110",
};

const tamanhos: Record<Tamanho, string> = {
  pequeno: "h-9 px-3 text-sm gap-1.5 rounded-xl",
  medio: "h-11 px-4 text-[15px] gap-2 rounded-xl",
  grande: "h-13 px-5 text-base gap-2 rounded-2xl",
};

interface PropriedadesBase {
  variante?: Variante;
  tamanho?: Tamanho;
  icone?: LucideIcon;
  carregando?: boolean;
  larguraTotal?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function classes({ variante = "primario", tamanho = "medio", larguraTotal, className = "" }: PropriedadesBase) {
  // Largura total: ocupa o espaço que sobrar (também dentro de linhas com outros botões)
  const largura = larguraTotal ? "w-full min-w-0" : "shrink-0";
  return `inline-flex items-center justify-center font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 ${variantes[variante]} ${tamanhos[tamanho]} ${largura} ${className}`;
}

export function Botao({
  variante,
  tamanho,
  icone: Icone,
  carregando,
  larguraTotal,
  className,
  children,
  disabled,
  ...resto
}: PropriedadesBase & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={disabled || carregando}
      className={classes({ variante, tamanho, larguraTotal, className })}
      {...resto}
    >
      {carregando ? (
        <LoaderCircle className="size-[1.15em] animate-spin" />
      ) : (
        Icone && <Icone className="size-[1.15em]" strokeWidth={2.2} />
      )}
      {children}
    </button>
  );
}

export function BotaoLink({
  href,
  variante,
  tamanho,
  icone: Icone,
  larguraTotal,
  className,
  children,
}: PropriedadesBase & { href: string }) {
  return (
    <Link href={href} className={classes({ variante, tamanho, larguraTotal, className })}>
      {Icone && <Icone className="size-[1.15em]" strokeWidth={2.2} />}
      {children}
    </Link>
  );
}
