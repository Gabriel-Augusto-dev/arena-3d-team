"use client";

import { useState } from "react";

/**
 * Aba inicial vinda da URL (ex.: /professor/financeiro?aba=receber).
 * As áreas logadas só montam no navegador, então ler a URL aqui é seguro.
 */
export function useAbaDaUrl<T extends string>(permitidas: readonly T[], padrao: T) {
  return useState<T>(() => {
    if (typeof window === "undefined") return padrao;
    const valor = new URLSearchParams(window.location.search).get("aba") as T | null;
    return valor && permitidas.includes(valor) ? valor : padrao;
  });
}
