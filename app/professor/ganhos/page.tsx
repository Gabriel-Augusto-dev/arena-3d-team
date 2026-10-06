"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAutenticacao, useUsuarioLogado } from "@/contextos/ContextoAutenticacao";
import { RelatorioAuxiliar } from "@/componentes/professor/RelatorioAuxiliar";
import { Carregando, TituloPagina } from "@/componentes/interface/Elementos";

/**
 * Ganhos do professor auxiliar: os alunos que tiveram aula com ele, o que
 * já foi confirmado pelo professor e quanto ele recebe pela porcentagem.
 * (O administrador vê o mesmo relatório na página Equipe.)
 */
export default function GanhosAuxiliar() {
  const auxiliar = useUsuarioLogado();
  const { ehAdministrador } = useAutenticacao();
  const router = useRouter();

  useEffect(() => {
    if (ehAdministrador) router.replace("/professor/equipe");
  }, [ehAdministrador, router]);

  if (ehAdministrador) return <Carregando />;

  return (
    <>
      <TituloPagina titulo="Ganhos" subtitulo="Suas aulas, alunos e valores confirmados" />
      <RelatorioAuxiliar auxiliar={auxiliar} visao="auxiliar" />
    </>
  );
}
