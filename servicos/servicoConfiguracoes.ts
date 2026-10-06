import { banco } from "@/lib/banco";
import { ID_CONFIGURACOES, type Configuracoes } from "@/tipos";

export const CONFIGURACOES_PADRAO: Configuracoes = {
  id: "geral",
  nomeArena: "3D Team",
  chavePix: "",
  nomeRecebedorPix: "3D Team",
  cidadeRecebedorPix: "",
  valorDayUse: 15,
  valorMensalidadePadrao: 160,
  valorMensalidadeAssociado: 0,
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

/**
 * Garante que configuracoes/geral exista (as regras do Firestore conferem o
 * valor do Day Use nele). Chamado quando o administrador abre o app.
 */
export async function garantirConfiguracoes() {
  if (await banco.obter("configuracoes", ID_CONFIGURACOES)) return;
  const { id: _id, atualizadoEm: _atualizado, ...padrao } = CONFIGURACOES_PADRAO;
  void _id;
  void _atualizado;
  await banco.definir("configuracoes", ID_CONFIGURACOES, padrao as never);
}
