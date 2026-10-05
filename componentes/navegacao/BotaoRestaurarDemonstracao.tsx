"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useAutenticacao } from "@/contextos/ContextoAutenticacao";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { Botao } from "@/componentes/interface/Botao";
import { restaurarDadosDemonstracao } from "@/lib/banco/adaptadorLocal";
import { apagarContasLocais } from "@/lib/autenticacao/autenticacaoLocal";

/** Só aparece no modo demonstração: apaga tudo e recria os dados de exemplo */
export function BotaoRestaurarDemonstracao() {
  const avisos = useAvisos();
  const router = useRouter();
  const { sair } = useAutenticacao();
  return (
    <Botao
      variante="fantasma"
      icone={RotateCcw}
      larguraTotal
      onClick={async () => {
        restaurarDadosDemonstracao();
        apagarContasLocais();
        await sair();
        avisos.sucesso("Dados de demonstração restaurados");
        router.replace("/entrar");
      }}
    >
      Restaurar dados de demonstração
    </Botao>
  );
}
