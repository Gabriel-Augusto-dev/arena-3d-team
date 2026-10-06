"use client";

import { valorMensalidadeDoAluno } from "@/servicos/regras/regrasPreco";
import { useState } from "react";
import { Folha } from "@/componentes/interface/Folha";
import { Botao } from "@/componentes/interface/Botao";
import { CampoTexto } from "@/componentes/interface/Campos";
import { PainelPix } from "./PainelPix";
import { CarimboEnviado } from "./CarimboEnviado";
import { useDadosAluno } from "@/contextos/ContextoDadosAluno";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { informarPagamentoMensalidade } from "@/servicos/servicoPagamentos";
import { competencia, hojeISO } from "@/lib/utilitarios/datas";
import type { Turma } from "@/tipos";

export function FolhaPagarMensalidade({ turma: minhaTurma, aoFechar }: { turma: Turma; aoFechar(): void }) {
  const { aluno, configuracoes } = useDadosAluno();
  const avisos = useAvisos();
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const enviar = async () => {
    setEnviando(true);
    try {
      await informarPagamentoMensalidade(aluno, minhaTurma, observacao);
      setEnviado(true);
    } catch (erro) {
      avisos.erro(erro);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Folha
      aberta
      aoFechar={aoFechar}
      titulo={enviado ? undefined : "Pagar mensalidade"}
      descricao={enviado ? undefined : `Turma ${minhaTurma.nome} · ${configuracoes.diasCicloMensalidade} dias de acesso`}
      rodape={
        enviado ? (
          <Botao tamanho="grande" larguraTotal onClick={aoFechar}>
            Entendi
          </Botao>
        ) : (
          <Botao
            tamanho="grande"
            larguraTotal
            carregando={enviando}
            onClick={enviar}
            disabled={!configuracoes.chavePix}
          >
            Já fiz o PIX
          </Botao>
        )
      }
    >
      {enviado ? (
        <CarimboEnviado
          tipo="aguardando"
          titulo="Pagamento em análise"
          descricao="Assim que o professor confirmar, seu novo ciclo é liberado e você recebe um aviso aqui."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <PainelPix
            configuracoes={configuracoes}
            valor={valorMensalidadeDoAluno(aluno, minhaTurma, configuracoes)}
            identificador={`MS${competencia(hojeISO()).replace("-", "")}${aluno.id.slice(0, 5)}${minhaTurma.id.slice(0, 3)}`}
            descricao={`Mensalidade ${minhaTurma.nome}`}
          />
          <CampoTexto
            rotulo="Recado para o professor (opcional)"
            placeholder="Ex.: paguei pela conta da minha mãe"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            maxLength={140}
          />
        </div>
      )}
    </Folha>
  );
}
