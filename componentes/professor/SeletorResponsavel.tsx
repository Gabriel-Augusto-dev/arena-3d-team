"use client";

import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { CampoSelecao } from "@/componentes/interface/Campos";

/**
 * Quem dá a aula: o próprio professor administrador ou um auxiliar.
 * Some quando ainda não há auxiliar cadastrado.
 */
export function SeletorResponsavel({
  valor,
  aoMudar,
  dica,
}: {
  valor: string | null;
  aoMudar(responsavelId: string | null): void;
  dica?: string;
}) {
  const { auxiliares } = useDadosProfessor();
  const opcoes = auxiliares.filter((a) => a.ativo || a.id === valor);
  if (!opcoes.length) return null;
  return (
    <CampoSelecao
      rotulo="Professor responsável"
      value={valor ?? ""}
      onChange={(e) => aoMudar(e.target.value || null)}
      dica={dica ?? "As presenças e os pagamentos dessas aulas entram no relatório da Equipe"}
    >
      <option value="">Eu mesmo</option>
      {opcoes.map((a) => (
        <option key={a.id} value={a.id}>
          {a.nome}
          {a.ativo ? "" : " (desativado)"}
        </option>
      ))}
    </CampoSelecao>
  );
}
