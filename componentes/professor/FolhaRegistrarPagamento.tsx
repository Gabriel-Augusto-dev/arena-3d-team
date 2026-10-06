"use client";

import { valorMensalidadeDoAluno } from "@/servicos/regras/regrasPreco";
import { useState } from "react";
import type { FormaPagamento, Usuario } from "@/tipos";
import { useUsuarioLogado } from "@/contextos/ContextoAutenticacao";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { Folha } from "@/componentes/interface/Folha";
import { Botao } from "@/componentes/interface/Botao";
import { Campo, SeletorOpcoes } from "@/componentes/interface/Campos";
import { adicionarDias, formatarData, hojeISO } from "@/lib/utilitarios/datas";
import { calcularNovoCiclo, matriculasDoAluno, validadeNaTurma } from "@/servicos/regras/regrasMensalidade";
import { registrarMensalidadeRecebida } from "@/servicos/servicoPagamentos";

/** Professor recebeu a mensalidade direto (dinheiro ou PIX fora do app) */
export function FolhaRegistrarPagamento({ aluno, aoFechar }: { aluno: Usuario; aoFechar(): void }) {
  const professor = useUsuarioLogado();
  const { turmaPorId, configuracoes } = useDadosProfessor();
  const avisos = useAvisos();
  // Mensalista de mais de uma turma: escolhe de qual turma é a mensalidade
  const turmasDoAluno = matriculasDoAluno(aluno).flatMap((m) => {
    const t = turmaPorId.get(m.turmaId);
    return t ? [t] : [];
  });
  const [turmaId, setTurmaId] = useState(turmasDoAluno[0]?.id ?? "");
  const turma = turmasDoAluno.find((t) => t.id === turmaId);
  const [valor, setValor] = useState(
    turma ? valorMensalidadeDoAluno(aluno, turma, configuracoes) : configuracoes.valorMensalidadePadrao,
  );
  const [forma, setForma] = useState<FormaPagamento>("dinheiro");
  const [salvando, setSalvando] = useState(false);

  if (!turma) return null;
  const ciclo = calcularNovoCiclo(validadeNaTurma(aluno, turma.id), configuracoes.diasCicloMensalidade);
  const trocarTurma = (id: string) => {
    setTurmaId(id);
    const nova = turmasDoAluno.find((t) => t.id === id);
    if (nova) setValor(valorMensalidadeDoAluno(aluno, nova, configuracoes));
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      await registrarMensalidadeRecebida(aluno, turma, valor, forma, professor.id);
      avisos.sucesso(`Mensalidade registrada. Válida até ${formatarData(ciclo.cicloFim)}`);
      aoFechar();
    } catch (erro) {
      avisos.erro(erro);
      setSalvando(false);
    }
  };

  return (
    <Folha
      aberta
      aoFechar={aoFechar}
      titulo="Registrar mensalidade"
      descricao={`${aluno.nome} · ${turma.nome}`}
      rodape={
        <Botao variante="sucesso" tamanho="grande" larguraTotal carregando={salvando} onClick={salvar}>
          Registrar recebimento
        </Botao>
      }
    >
      <div className="flex flex-col gap-4">
        {turmasDoAluno.length > 1 && (
          <SeletorOpcoes<string>
            rotulo="Mensalidade da turma"
            opcoes={turmasDoAluno.map((t) => ({ valor: t.id, rotulo: t.nome }))}
            valor={turma.id}
            aoMudar={trocarTurma}
          />
        )}
        <SeletorOpcoes<FormaPagamento>
          rotulo="Como recebeu"
          opcoes={[
            { valor: "dinheiro", rotulo: "Dinheiro" },
            { valor: "pix", rotulo: "PIX direto" },
          ]}
          valor={forma}
          aoMudar={setForma}
        />
        <Campo
          rotulo="Valor (R$)"
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(Number(e.target.value))}
        />
        <div className="rounded-2xl bg-marinho-50 px-4 py-3 text-sm">
          <p className="font-semibold">Novo ciclo</p>
          <p className="text-suave">
            {formatarData(ciclo.cicloInicio)} até {formatarData(ciclo.cicloFim)}
            {ciclo.cicloInicio > hojeISO() &&
              ` (emenda no ciclo atual, que vai até ${formatarData(adicionarDias(ciclo.cicloInicio, -1))})`}
          </p>
        </div>
      </div>
    </Folha>
  );
}
