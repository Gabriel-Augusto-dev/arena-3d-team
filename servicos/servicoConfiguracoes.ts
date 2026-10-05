import { banco } from "@/lib/banco";
import { ID_CONFIGURACOES, type Configuracoes } from "@/tipos";

export const CONFIGURACOES_PADRAO: Configuracoes = {
  id: "geral",
  nomeArena: "3D Team",
  chavePix: "",
  nomeRecebedorPix: "3D Team",
  cidadeRecebedorPix: "Sao Paulo",
  valorDayUse: 15,
  valorMensalidadePadrao: 160,
  mensalistaQualquerTurma: false,
  diasCicloMensalidade: 30,
  whatsappContato: "",
  atualizadoEm: "",
};

export async function obterConfiguracoes(): Promise<Configuracoes> {
  const salvas = await banco.obter("configuracoes", ID_CONFIGURACOES);
  return { ...CONFIGURACOES_PADRAO, ...salvas };
}

export async function salvarConfiguracoes(dados: Omit<Configuracoes, "id" | "atualizadoEm">) {
  await banco.definir("configuracoes", ID_CONFIGURACOES, dados as never);
}
