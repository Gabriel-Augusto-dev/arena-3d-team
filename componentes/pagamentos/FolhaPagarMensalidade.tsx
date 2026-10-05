"use client";

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

export function FolhaPagarMensalidade({ aoFechar }: { aoFechar(): void }) {
  const { aluno, minhaTurma, configuracoes } = useDadosAluno();
  const avisos = useAvisos();
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  if (!minhaTurma) return null;

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
            valor={minhaTurma.valorMensalidade}
            identificador={`MS${competencia(hojeISO()).replace("-", "")}${aluno.id.slice(0, 8)}`}
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
