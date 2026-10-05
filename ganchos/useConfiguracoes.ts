"use client";

import { ID_CONFIGURACOES, type Configuracoes } from "@/tipos";
import { CONFIGURACOES_PADRAO } from "@/servicos/servicoConfiguracoes";
import { useDocumento } from "./useColecao";

export function useConfiguracoes(): { configuracoes: Configuracoes; carregando: boolean } {
  const { dado, carregando } = useDocumento("configuracoes", ID_CONFIGURACOES);
  return { configuracoes: { ...CONFIGURACOES_PADRAO, ...dado }, carregando };
}
