"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PerfilUsuario } from "@/tipos";
import { guardarDestino, limparDestino, rotaInicialDoPerfil, useAutenticacao } from "@/contextos/ContextoAutenticacao";
import { TelaAbertura } from "./TelaAbertura";

/**
 * Protege uma área do app: sem sessão → /entrar;
 * perfil que não pode entrar aqui → manda para a área certa do usuário.
 */
export function GuardaRota({ perfis, children }: { perfis: PerfilUsuario[]; children: React.ReactNode }) {
  const { usuario, carregando, sair } = useAutenticacao();
  const router = useRouter();

  const permitido = !!usuario && perfis.includes(usuario.perfil);
  const liberado = permitido && usuario.ativo;

  useEffect(() => {
    if (carregando) return;
    if (!usuario) {
      // Guarda o link (ex.: presença do dia extra) para voltar a ele após o login
      guardarDestino(window.location.pathname + window.location.search);
      router.replace("/entrar");
    } else if (!usuario.ativo) {
      // Conta desativada pelo professor: encerra a sessão
      sair().finally(() => router.replace("/entrar"));
    }
    else if (!permitido) router.replace(rotaInicialDoPerfil(usuario));
    else limparDestino();
  }, [carregando, usuario, permitido, router, sair]);

  if (carregando || !liberado) return <TelaAbertura />;
  return <>{children}</>;
}
