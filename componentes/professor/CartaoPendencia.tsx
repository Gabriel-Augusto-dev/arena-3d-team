"use client";

import { useState } from "react";
import { Check, Quote, X } from "lucide-react";
import type { Pagamento } from "@/tipos";
import { useUsuarioLogado } from "@/contextos/ContextoAutenticacao";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { Avatar, Selo } from "@/componentes/interface/Elementos";
import { Botao } from "@/componentes/interface/Botao";
import { CampoTexto } from "@/componentes/interface/Campos";
import { Folha } from "@/componentes/interface/Folha";
import { formatarDataRelativa, formatarTempoDecorrido } from "@/lib/utilitarios/datas";
import { formatarMoeda } from "@/lib/utilitarios/formatadores";
import { ROTULOS_TIPO_PAGAMENTO, TONS_MENSALIDADE } from "@/lib/rotulos";
import { calcularSituacaoMensalidade } from "@/servicos/regras/regrasMensalidade";
import { confirmarPagamento, recusarPagamento } from "@/servicos/servicoPagamentos";

const MOTIVOS_RAPIDOS = [
  "PIX não encontrado no extrato.",
  "Valor diferente do combinado.",
  "Pagamento em duplicidade.",
];

/** Solicitação de pagamento para o professor conferir no banco */
export function CartaoPendencia({ pagamento }: { pagamento: Pagamento }) {
  const professor = useUsuarioLogado();
  const { alunoPorId, aulas, turmaPorId } = useDadosProfessor();
  const avisos = useAvisos();
  const [acao, setAcao] = useState<"confirmar" | "recusar" | null>(null);
  const [recusando, setRecusando] = useState(false);

  const aluno = alunoPorId.get(pagamento.alunoId);
  const aula = pagamento.aulaId ? aulas.find((a) => a.id === pagamento.aulaId) : undefined;
  const turma = turmaPorId.get(aula?.turmaId ?? pagamento.turmaId ?? "");
  const situacao = aluno ? calcularSituacaoMensalidade(aluno) : null;

  const confirmar = async () => {
    setAcao("confirmar");
    try {
      await confirmarPagamento(pagamento, professor.id);
      avisos.sucesso(
        pagamento.tipo === "mensalidade"
          ? `Mensalidade de ${pagamento.alunoNome} confirmada. Novo ciclo liberado`
          : `Day Use de ${pagamento.alunoNome} confirmado`,
      );
    } catch (erro) {
      avisos.erro(erro);
      setAcao(null);
    }
  };

  return (
    <article className="rounded-3xl bg-white p-4 ring-1 ring-linha/70">
      <div className="flex items-start gap-3">
        <Avatar nome={pagamento.alunoNome} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold">{pagamento.alunoNome}</p>
              <p className="text-[13px] text-suave">PIX avisado {formatarTempoDecorrido(pagamento.informadoEm ?? pagamento.criadoEm)}</p>
            </div>
            <p className="numeros shrink-0 font-titulo text-xl font-extrabold">{formatarMoeda(pagamento.valor)}</p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Selo tom={pagamento.tipo === "mensalidade" ? "escuro" : "azul"}>{ROTULOS_TIPO_PAGAMENTO[pagamento.tipo]}</Selo>
            {turma && <span className="text-[13px] text-suave">{turma.nome}</span>}
            {aula && (
              <span className="numeros text-[13px] text-suave">
                {formatarDataRelativa(aula.data)} às {aula.horarioInicio}
              </span>
            )}
            {pagamento.tipo === "mensalidade" && situacao && situacao.status !== "nao_se_aplica" && (
              <Selo tom={TONS_MENSALIDADE[situacao.status]}>{situacao.rotulo}</Selo>
            )}
          </div>

          {pagamento.observacaoAluno && (
            <p className="mt-2.5 flex gap-2 rounded-xl bg-fundo px-3 py-2 text-[13px] text-suave">
              <Quote className="mt-0.5 size-3.5 shrink-0" />
              {pagamento.observacaoAluno}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-[auto_1fr] gap-2">
        <Botao
          variante="perigo"
          icone={X}
          onClick={() => setRecusando(true)}
          disabled={acao !== null}
          aria-label={`Recusar pagamento de ${pagamento.alunoNome}`}
        >
          Recusar
        </Botao>
        <Botao variante="sucesso" icone={Check} carregando={acao === "confirmar"} onClick={confirmar}>
          Confirmar
          <span className="max-sm:hidden">recebimento</span>
        </Botao>
      </div>

      {recusando && (
        <FolhaRecusar
          pagamento={pagamento}
          aoFechar={() => setRecusando(false)}
          aoRecusar={async (motivo) => {
            setAcao("recusar");
            try {
              await recusarPagamento(pagamento, motivo, professor.id);
              avisos.avisar(`Pagamento de ${pagamento.alunoNome} recusado. Aluno avisado`);
              setRecusando(false);
            } catch (erro) {
              avisos.erro(erro);
              setAcao(null);
            }
          }}
          enviando={acao === "recusar"}
        />
      )}
    </article>
  );
}

function FolhaRecusar({
  pagamento,
  aoFechar,
  aoRecusar,
  enviando,
}: {
  pagamento: Pagamento;
  aoFechar(): void;
  aoRecusar(motivo: string): void;
  enviando: boolean;
}) {
  const [motivo, setMotivo] = useState(MOTIVOS_RAPIDOS[0]);
  return (
    <Folha
      aberta
      aoFechar={aoFechar}
      titulo="Recusar pagamento"
      descricao={`${pagamento.alunoNome} · ${ROTULOS_TIPO_PAGAMENTO[pagamento.tipo]} de ${formatarMoeda(pagamento.valor)}`}
      rodape={
        <Botao variante="perigo" tamanho="grande" larguraTotal carregando={enviando} onClick={() => aoRecusar(motivo)}>
          Recusar e avisar aluno
        </Botao>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {MOTIVOS_RAPIDOS.map((m) => (
            <button
              key={m}
              onClick={() => setMotivo(m)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                motivo === m ? "bg-marinho-900 text-white" : "bg-white ring-1 ring-linha hover:bg-marinho-50"
              }`}
            >
              {m.replace(".", "")}
            </button>
          ))}
        </div>
        <CampoTexto
          rotulo="Mensagem para o aluno"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={200}
          dica={pagamento.tipo === "day_use" ? "O Day Use volta a ficar em aberto para o aluno pagar." : undefined}
        />
      </div>
    </Folha>
  );
}
