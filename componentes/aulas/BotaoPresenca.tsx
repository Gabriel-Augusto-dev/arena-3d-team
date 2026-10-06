"use client";

import { useState } from "react";
import { Check, Hourglass, Lock } from "lucide-react";
import type { AulaDoAluno } from "@/ganchos/useAgendaAluno";
import { useDadosAluno } from "@/contextos/ContextoDadosAluno";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { Botao } from "@/componentes/interface/Botao";
import { marcarPresenca } from "@/servicos/servicoPresencas";

/**
 * Ação rápida no cartão da aula.
 * Mensalista em dia: marca presença com UM toque.
 * Day Use / bloqueado: abre a folha com os detalhes.
 */
export function BotaoPresenca({ item, aoAbrir }: { item: AulaDoAluno; aoAbrir(): void }) {
  const { aluno } = useDadosAluno();
  const avisos = useAvisos();
  const [marcando, setMarcando] = useState(false);
  const { situacao } = item;

  if (situacao.tipo === "confirmada") {
    return (
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ok text-white" aria-label="Presença marcada">
        <Check className="size-5" strokeWidth={3} />
      </span>
    );
  }
  const aguardando =
    (situacao.tipo === "bloqueada" && !situacao.emAtraso.length) ||
    (situacao.tipo === "mensalidade_pendente" && situacao.emAnalise);
  if (aguardando) {
    return (
      <Botao variante="secundario" tamanho="pequeno" icone={Hourglass} onClick={aoAbrir}>
        Em análise
      </Botao>
    );
  }
  if (situacao.tipo === "bloqueada" || situacao.tipo === "mensalidade_pendente") {
    return (
      <Botao variante="perigo" tamanho="pequeno" icone={Lock} onClick={aoAbrir}>
        Pagar
      </Botao>
    );
  }
  if (situacao.tipo === "livre_mensalista") {
    return (
      <Botao
        variante="destaque"
        tamanho="pequeno"
        carregando={marcando}
        onClick={async () => {
          setMarcando(true);
          try {
            await marcarPresenca(aluno, item.aula);
            avisos.sucesso(`Presença marcada: ${item.turma?.nome ?? "aula"} às ${item.aula.horarioInicio}`);
          } catch (erro) {
            avisos.erro(erro);
          } finally {
            setMarcando(false);
          }
        }}
      >
        Vou
      </Botao>
    );
  }
  if (situacao.tipo === "day_use") {
    return (
      <Botao variante="secundario" tamanho="pequeno" onClick={aoAbrir}>
        Vou
      </Botao>
    );
  }
  return null;
}
