"use client";

import { useState } from "react";
import { Banknote, MessageCircle } from "lucide-react";
import type { Pagamento } from "@/tipos";
import { useUsuarioLogado } from "@/contextos/ContextoAutenticacao";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { Avatar, Selo } from "@/componentes/interface/Elementos";
import { Botao } from "@/componentes/interface/Botao";
import { formatarDataRelativa } from "@/lib/utilitarios/datas";
import { formatarMoeda, linkWhatsapp, primeiroNome } from "@/lib/utilitarios/formatadores";
import { diasDeAtraso, estaEmAtraso } from "@/servicos/regras/regrasPagamento";
import { confirmarPagamento } from "@/servicos/servicoPagamentos";

/** Day Use ainda não pago: cobrar no WhatsApp ou marcar como recebido */
export function CartaoCobranca({ pagamento }: { pagamento: Pagamento }) {
  const professor = useUsuarioLogado();
  const { alunoPorId, turmaPorId } = useDadosProfessor();
  const avisos = useAvisos();
  const [recebendo, setRecebendo] = useState(false);

  const aluno = alunoPorId.get(pagamento.alunoId);
  const turma = turmaPorId.get(pagamento.turmaId ?? "");
  const atrasado = estaEmAtraso(pagamento);
  const dias = diasDeAtraso(pagamento);
  const quando = pagamento.vencimento ? formatarDataRelativa(pagamento.vencimento) : "";

  const receber = async () => {
    setRecebendo(true);
    try {
      await confirmarPagamento(pagamento, professor.id, "dinheiro");
      avisos.sucesso(`Day Use de ${pagamento.alunoNome} recebido`);
    } catch (erro) {
      avisos.erro(erro);
      setRecebendo(false);
    }
  };

  return (
    <article className={`rounded-3xl bg-white p-4 ring-1 ${atrasado ? "ring-erro/40" : "ring-linha/70"}`}>
      <div className="flex items-center gap-3">
        <Avatar nome={pagamento.alunoNome} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{pagamento.alunoNome}</p>
          <p className="truncate text-[13px] text-suave">
            {turma?.nome ?? "Aula"} · {quando}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="numeros font-titulo text-xl font-extrabold">{formatarMoeda(pagamento.valor)}</span>
          {atrasado ? (
            <Selo tom="vermelho">{dias > 1 ? `${dias} dias de atraso` : "Em atraso"}</Selo>
          ) : (
            <Selo tom="amarelo">A pagar</Selo>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {aluno?.whatsapp ? (
          <a
            href={linkWhatsapp(
              aluno.whatsapp,
              `Oi ${primeiroNome(aluno.nome)}! Tudo bem? Ficou em aberto o Day Use de ${formatarMoeda(pagamento.valor)} da aula de ${quando.toLowerCase()}. Dá para pagar pelo app, na aba Pagamentos. Valeu!`,
            )}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-ok-fundo text-sm font-semibold text-ok hover:bg-ok hover:text-white"
          >
            <MessageCircle className="size-4" />
            Cobrar
          </a>
        ) : (
          <span />
        )}
        <Botao variante="secundario" icone={Banknote} carregando={recebendo} onClick={receber}>
          Recebi
        </Botao>
      </div>
    </article>
  );
}
