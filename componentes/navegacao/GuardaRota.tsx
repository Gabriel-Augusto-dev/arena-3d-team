"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PerfilUsuario } from "@/tipos";
import { rotaInicialDoPerfil, useAutenticacao } from "@/contextos/ContextoAutenticacao";
import { TelaAbertura } from "./TelaAbertura";

/**
 * Protege uma área do app: sem sessão → /entrar;
 * perfil diferente → manda para a área certa do usuário.
 */
export function GuardaRota({ perfil, children }: { perfil: PerfilUsuario; children: React.ReactNode }) {
  const { usuario, carregando } = useAutenticacao();
  const router = useRouter();

  const liberado = !!usuario && usuario.perfil === perfil && usuario.ativo;

  useEffect(() => {
    if (carregando) return;
    if (!usuario || !usuario.ativo) router.replace("/entrar");
    else if (usuario.perfil !== perfil) router.replace(rotaInicialDoPerfil(usuario));
  }, [carregando, usuario, perfil, router]);

  if (carregando || !liberado) return <TelaAbertura />;
  return <>{children}</>;
}
