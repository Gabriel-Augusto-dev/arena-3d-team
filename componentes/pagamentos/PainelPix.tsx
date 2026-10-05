"use client";

import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import type { Configuracoes } from "@/tipos";
import { gerarCodigoPix } from "@/lib/utilitarios/pix";
import { formatarMoeda } from "@/lib/utilitarios/formatadores";

async function copiarTexto(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    // Navegadores antigos / sem HTTPS
    const campo = document.createElement("textarea");
    campo.value = texto;
    document.body.appendChild(campo);
    campo.select();
    document.execCommand("copy");
    campo.remove();
  }
}

export function PainelPix({
  configuracoes,
  valor,
  identificador,
  descricao,
  mostrarPassos = true,
}: {
  configuracoes: Configuracoes;
  valor: number;
  identificador: string;
  descricao: string;
  /** Passo a passo de como pagar (escondido na prévia dos Ajustes) */
  mostrarPassos?: boolean;
}) {
  const [copiado, setCopiado] = useState<"codigo" | "chave" | null>(null);

  const codigo = useMemo(
    () =>
      configuracoes.chavePix
        ? gerarCodigoPix({
            chave: configuracoes.chavePix,
            nomeRecebedor: configuracoes.nomeRecebedorPix,
            cidadeRecebedor: configuracoes.cidadeRecebedorPix,
            valor,
            identificador,
            descricao,
          })
        : "",
    [configuracoes, valor, identificador, descricao],
  );

  const copiar = async (texto: string, qual: "codigo" | "chave") => {
    await copiarTexto(texto);
    setCopiado(qual);
    setTimeout(() => setCopiado(null), 2200);
  };

  if (!configuracoes.chavePix) {
    return (
      <div className="flex gap-3 rounded-2xl bg-alerta-fundo p-4 text-sm text-alerta">
        <TriangleAlert className="size-5 shrink-0" />
        <p>O professor ainda não cadastrou a chave PIX. Fale com ele antes de pagar.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center rounded-3xl bg-white p-5 ring-1 ring-linha/70">
        <p className="text-sm text-suave">Valor a pagar</p>
        <p className="numeros font-titulo text-4xl font-extrabold tracking-tight">{formatarMoeda(valor)}</p>
        <div className="mt-4 rounded-2xl bg-white p-2.5 ring-1 ring-linha">
          <QRCodeSVG value={codigo} size={172} level="M" fgColor="#0b2a3d" />
        </div>
        <p className="mt-3 text-center text-[13px] text-suave">
          Para <strong className="text-tinta">{configuracoes.nomeRecebedorPix}</strong>
        </p>
      </div>

      <button
        onClick={() => copiar(codigo, "codigo")}
        className={`flex h-13 items-center justify-center gap-2 rounded-2xl font-semibold transition ${
          copiado === "codigo" ? "bg-ok text-white" : "bg-laranja-500 text-marinho-950 hover:bg-laranja-400"
        }`}
      >
        {copiado === "codigo" ? <Check className="size-5" /> : <Copy className="size-5" />}
        {copiado === "codigo" ? "Código copiado" : "Copiar código PIX"}
      </button>

      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-linha/70">
        <div className="min-w-0">
          <p className="text-xs text-suave">Ou use a chave PIX</p>
          <p className="truncate text-[15px] font-semibold">{configuracoes.chavePix}</p>
        </div>
        <button
          onClick={() => copiar(configuracoes.chavePix, "chave")}
          className="shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-marinho-700 hover:bg-marinho-100/70"
        >
          {copiado === "chave" ? "Copiada" : "Copiar"}
        </button>
      </div>

      {mostrarPassos && (
        <ol className="flex flex-col gap-2 text-sm text-suave">
          {["Abra o app do seu banco e escolha PIX copia e cola", "Cole o código e confira o valor", "Volte aqui e toque em “Já fiz o PIX”"].map(
            (passo, i) => (
              <li key={passo} className="flex items-center gap-3">
                <span className="numeros grid size-6 shrink-0 place-items-center rounded-full bg-marinho-100 text-xs font-bold text-marinho-700">
                  {i + 1}
                </span>
                {passo}
              </li>
            ),
          )}
        </ol>
      )}
    </div>
  );
}
