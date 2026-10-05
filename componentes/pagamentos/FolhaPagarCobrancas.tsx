"use client";

import { useState } from "react";
import type { Pagamento } from "@/tipos";
import { Folha } from "@/componentes/interface/Folha";
import { Botao } from "@/componentes/interface/Botao";
import { CampoTexto } from "@/componentes/interface/Campos";
import { PainelPix } from "./PainelPix";
import { CarimboEnviado } from "./CarimboEnviado";
import { useDadosAluno } from "@/contextos/ContextoDadosAluno";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { formatarDataRelativa } from "@/lib/utilitarios/datas";
import { formatarMoeda } from "@/lib/utilitarios/formatadores";
import { estaEmAtraso, somaValores } from "@/servicos/regras/regrasPagamento";
import { informarPagamentoDayUse } from "@/servicos/servicoPagamentos";

/** Paga um ou mais Day Use de uma vez (um PIX só) */
export function FolhaPagarCobrancas({ cobrancas, aoFechar }: { cobrancas: Pagamento[]; aoFechar(): void }) {
  const { aluno, configuracoes, aulas, turmaPorId } = useDadosAluno();
  const avisos = useAvisos();
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const total = somaValores(cobrancas);

  const descrever = (p: Pagamento) => {
    const aula = aulas.find((a) => a.id === p.aulaId);
    const turma = turmaPorId.get(p.turmaId ?? "");
    return `${turma?.nome ?? "Aula"} — ${formatarDataRelativa(aula?.data ?? p.vencimento ?? "")}`;
  };

  const enviar = async () => {
    setEnviando(true);
    try {
      await informarPagamentoDayUse(aluno, cobrancas, observacao);
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
      titulo={enviado ? undefined : cobrancas.length > 1 ? `Pagar ${cobrancas.length} Day Use` : "Pagar Day Use"}
      rodape={
        enviado ? (
          <Botao tamanho="grande" larguraTotal onClick={aoFechar}>
            Entendi
          </Botao>
        ) : (
          <Botao tamanho="grande" larguraTotal carregando={enviando} onClick={enviar} disabled={!configuracoes.chavePix}>
            Já fiz o PIX de {formatarMoeda(total)}
          </Botao>
        )
      }
    >
      {enviado ? (
        <CarimboEnviado
          tipo="aguardando"
          titulo="Pagamento em análise"
          descricao="O professor vai conferir o PIX. Você já pode marcar presença nas próximas aulas."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y divide-linha/70 rounded-2xl bg-white px-4 ring-1 ring-linha/70">
            {cobrancas.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
                <span className="min-w-0 truncate">{descrever(p)}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {estaEmAtraso(p) && <span className="text-xs font-bold text-erro">em atraso</span>}
                  <span className="numeros font-semibold">{formatarMoeda(p.valor)}</span>
                </span>
              </li>
            ))}
          </ul>
          <PainelPix
            configuracoes={configuracoes}
            valor={total}
            identificador={`DU${aluno.id.slice(0, 8)}${cobrancas.length}`}
            descricao="Day Use 3D Team"
          />
          <CampoTexto
            rotulo="Recado para o professor (opcional)"
            placeholder="Ex.: paguei pelo app do Inter às 14h"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            maxLength={140}
          />
        </div>
      )}
    </Folha>
  );
}
