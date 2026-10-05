"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Janela que sobe de baixo no celular (bottom sheet) e aparece centralizada
 * no computador. Fecha com Esc, tocando fora ou no X.
 */
export function Folha({
  aberta,
  aoFechar,
  titulo,
  descricao,
  children,
  rodape,
  larga = false,
}: {
  aberta: boolean;
  aoFechar(): void;
  titulo?: React.ReactNode;
  descricao?: React.ReactNode;
  children: React.ReactNode;
  rodape?: React.ReactNode;
  larga?: boolean;
}) {
  const painel = useRef<HTMLDivElement>(null);
  const fecharRef = useRef(aoFechar);

  useEffect(() => {
    fecharRef.current = aoFechar;
  });

  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && fecharRef.current();
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", aoTeclar);
    painel.current?.focus();
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [aberta]);

  if (!aberta || typeof document === "undefined") return null;

  // Renderiza direto no <body>: assim a janela sempre ocupa a tela inteira,
  // mesmo quando o botão que a abriu está dentro de um elemento com
  // desfoque/transformação (ex.: a barra superior do celular)
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-aparecer bg-marinho-950/45 backdrop-blur-[2px]" onClick={aoFechar} />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`relative flex max-h-[92dvh] w-full animate-subir flex-col rounded-t-[28px] bg-fundo shadow-2xl outline-none sm:rounded-[28px] ${
          larga ? "sm:max-w-2xl" : "sm:max-w-lg"
        }`}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-linha sm:hidden" />
        {(titulo || descricao) && (
          <div className="flex shrink-0 items-start gap-3 px-5 pb-2 pt-3 sm:px-6 sm:pt-5">
            <div className="flex-1">
              {titulo && <h2 className="font-titulo text-2xl font-bold leading-tight">{titulo}</h2>}
              {descricao && <p className="mt-1 text-sm text-suave">{descricao}</p>}
            </div>
            <button
              onClick={aoFechar}
              aria-label="Fechar"
              className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full bg-white text-suave ring-1 ring-linha hover:text-tinta"
            >
              <X className="size-[18px]" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-2 sm:px-6">{children}</div>
        {rodape && (
          <div className="pb-seguro shrink-0 border-t border-linha bg-white/70 px-5 pt-3 sm:rounded-b-[28px] sm:px-6 sm:pb-4">
            {rodape}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
