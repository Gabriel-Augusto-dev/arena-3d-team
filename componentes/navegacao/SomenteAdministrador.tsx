"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAutenticacao } from "@/contextos/ContextoAutenticacao";
import { Carregando } from "@/componentes/interface/Elementos";

/** Páginas só do professor administrador (Financeiro, Ajustes). O auxiliar volta ao início */
export function SomenteAdministrador({ children }: { children: React.ReactNode }) {
  const { ehAdministrador } = useAutenticacao();
  const router = useRouter();

  useEffect(() => {
    if (!ehAdministrador) router.replace("/professor");
  }, [ehAdministrador, router]);

  if (!ehAdministrador) return <Carregando />;
  return <>{children}</>;
}
