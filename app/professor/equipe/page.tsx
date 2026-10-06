"use client";

import { useState } from "react";
import { UsersRound } from "lucide-react";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { SecaoEquipe } from "@/componentes/professor/SecaoEquipe";
import { RelatorioAuxiliar } from "@/componentes/professor/RelatorioAuxiliar";
import { EsqueletoLista, EstadoVazio, FichasFiltro, TituloPagina } from "@/componentes/interface/Elementos";

/**
 * Equipe (só o administrador): aulas, presenças, alunos e valores de cada
 * professor auxiliar em um período, com o cálculo do repasse pela
 * porcentagem que o administrador digitar.
 */

export default function EquipeProfessor() {
  const { auxiliares, carregando } = useDadosProfessor();
  const ativos = auxiliares.filter((a) => a.ativo);
  const lista = ativos.length ? ativos : auxiliares;
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const auxiliar = lista.find((a) => a.id === escolhido) ?? lista[0];

  return (
    <>
      <TituloPagina titulo="Equipe" subtitulo="Aulas, presenças e repasse de cada professor auxiliar" />

      {carregando ? (
        <EsqueletoLista />
      ) : !auxiliar ? (
        <EstadoVazio
          icone={UsersRound}
          titulo="Comece cadastrando o auxiliar"
          descricao="Cadastre abaixo e, em Turmas, escolha ele como professor responsável das turmas que ele dá. O relatório e o repasse aparecem aqui."
        />
      ) : (
        <>
          {lista.length > 1 && (
            <div className="mb-5">
              <FichasFiltro<string>
                opcoes={lista.map((a) => ({ valor: a.id, rotulo: a.nome }))}
                ativa={auxiliar.id}
                aoMudar={setEscolhido}
              />
            </div>
          )}
          <RelatorioAuxiliar key={auxiliar.id} auxiliar={auxiliar} />
        </>
      )}

      <div className="mt-10">
        <SecaoEquipe />
      </div>
    </>
  );
}

