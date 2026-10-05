"use client";

import { useState } from "react";
import type { FormaPagamento, Usuario } from "@/tipos";
import { useUsuarioLogado } from "@/contextos/ContextoAutenticacao";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { Folha } from "@/componentes/interface/Folha";
import { Botao } from "@/componentes/interface/Botao";
import { Campo, SeletorOpcoes } from "@/componentes/interface/Campos";
import { adicionarDias, formatarData, hojeISO } from "@/lib/utilitarios/datas";
import { calcularNovoCiclo } from "@/servicos/regras/regrasMensalidade";
import { registrarMensalidadeRecebida } from "@/servicos/servicoPagamentos";

/** Professor recebeu a mensalidade direto (dinheiro ou PIX fora do app) */
export function FolhaRegistrarPagamento({ aluno, aoFechar }: { aluno: Usuario; aoFechar(): void }) {
  const professor = useUsuarioLogado();
  const { turmaPorId, configuracoes } = useDadosProfessor();
  const avisos = useAvisos();
  const turma = aluno.turmaId ? turmaPorId.get(aluno.turmaId) : undefined;
  const [valor, setValor] = useState(turma?.valorMensalidade ?? configuracoes.valorMensalidadePadrao);
  const [forma, setForma] = useState<FormaPagamento>("dinheiro");
  const [salvando, setSalvando] = useState(false);

  if (!turma) return null;
  const ciclo = calcularNovoCiclo(aluno.validadeMensalidade, configuracoes.diasCicloMensalidade);

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
