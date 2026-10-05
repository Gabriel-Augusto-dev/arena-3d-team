"use client";

import { useEffect, useState } from "react";
import { banco, type ChaveColecao, type Documento, type Filtro, type OpcoesConsulta } from "@/lib/banco";

interface EstadoColecao<T> {
  dados: T[];
  carregando: boolean;
  erro: Error | null;
}

/**
 * Observa uma coleção em tempo real (onSnapshot no Firebase).
 * Passe `ativo = false` para não consultar ainda (ex.: esperando o uid).
 */
export function useColecao<K extends ChaveColecao>(
  colecao: K,
  filtros: Filtro[] = [],
  ativo = true,
  opcoes: OpcoesConsulta = {},
) {
  const chaveFiltros = JSON.stringify(filtros);
  const limite = opcoes.limite;
  const [estado, setEstado] = useState<EstadoColecao<Documento<K>> & { chave: string }>({
    dados: [],
    carregando: true,
    erro: null,
    chave: "",
  });

  useEffect(() => {
    if (!ativo) return;
    const chave = `${colecao}|${chaveFiltros}|${limite ?? ""}`;
    return banco.observarColecao(
      colecao,
      JSON.parse(chaveFiltros) as Filtro[],
      (dados) => setEstado({ dados, carregando: false, erro: null, chave }),
      (erro) => setEstado((anterior) => ({ ...anterior, carregando: false, erro, chave })),
      { limite },
    );
  }, [colecao, chaveFiltros, ativo, limite]);

  // Enquanto os filtros mudam, mostra carregando em vez de dados antigos
  const atual = estado.chave === `${colecao}|${chaveFiltros}|${limite ?? ""}`;
  return {
    dados: atual ? estado.dados : [],
    carregando: !ativo || !atual || estado.carregando,
    erro: atual ? estado.erro : null,
  };
}

export function useDocumento<K extends ChaveColecao>(colecao: K, id: string | null | undefined) {
  const [estado, setEstado] = useState<{ dado: Documento<K> | null; carregando: boolean; id: string | null }>({
    dado: null,
    carregando: true,
    id: null,
  });

  useEffect(() => {
    if (!id) return;
    return banco.observarDocumento(colecao, id, (dado) => setEstado({ dado, carregando: false, id }));
  }, [colecao, id]);

  const atual = !!id && estado.id === id;
  return { dado: atual ? estado.dado : null, carregando: !!id && (!atual || estado.carregando) };
}
