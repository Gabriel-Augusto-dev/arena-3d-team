"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { rotaInicialDoPerfil, useAutenticacao } from "@/contextos/ContextoAutenticacao";
import { TelaAbertura } from "@/componentes/navegacao/TelaAbertura";

/** Porta de entrada: manda cada pessoa para a sua área */
export default function PaginaInicial() {
  const { usuario, carregando } = useAutenticacao();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;
    router.replace(usuario ? rotaInicialDoPerfil(usuario) : "/entrar");
  }, [carregando, usuario, router]);

  return <TelaAbertura />;
}
