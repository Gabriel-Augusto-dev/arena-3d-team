"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import type { Aula } from "@/tipos";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { Botao } from "@/componentes/interface/Botao";
import { formatarDataExtenso } from "@/lib/utilitarios/datas";
import { formatarMoeda } from "@/lib/utilitarios/formatadores";
import { linkPresencaDaAula } from "@/servicos/regras/regrasAula";

/** Copia texto para a área de transferência (com plano B para navegadores antigos) */
async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const campo = document.createElement("textarea");
      campo.value = texto;
      campo.setAttribute("readonly", "");
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(campo);
      return ok;
    } catch {
      return false;
    }
  }
}

/** Mensagem pronta para o WhatsApp, com o link da lista de presença */
export function mensagemDiaExtra(aula: Aula, valorDiaria: number) {
  return (
    `Dia extra de treino! ${formatarDataExtenso(aula.data)}, das ${aula.horarioInicio} às ${aula.horarioFim}.\n` +
    `Diária: ${formatarMoeda(valorDiaria)} (para todos, inclusive mensalistas).\n` +
    `Marque sua presença: ${linkPresencaDaAula(aula.id)}`
  );
}

/**
 * Link que leva o aluno direto para marcar presença no dia extra.
 * O professor copia e envia no WhatsApp para quem quiser.
 */
export function CompartilharLinkAula({ aula, compacto = false }: { aula: Aula; compacto?: boolean }) {
  const { configuracoes } = useDadosProfessor();
  const avisos = useAvisos();
  const [copiado, setCopiado] = useState(false);
  const link = linkPresencaDaAula(aula.id);
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(mensagemDiaExtra(aula, configuracoes.valorDayUse))}`;

  const copiar = async () => {
    if (await copiarTexto(link)) {
      setCopiado(true);
      avisos.sucesso("Link copiado. É só colar no WhatsApp");
      setTimeout(() => setCopiado(false), 2500);
    } else {
      avisos.erro(new Error("Não foi possível copiar. Segure o link para copiar"));
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${compacto ? "" : "rounded-2xl bg-white p-3 ring-1 ring-linha/70"}`}>
      {!compacto && (
        <>
          <p className="text-sm font-semibold">Link da lista de presença</p>
          <p className="select-all break-all rounded-xl bg-fundo px-3 py-2 font-mono text-[13px] text-marinho-800">{link}</p>
        </>
      )}
      <div className="flex gap-2">
        <Botao
          variante={copiado ? "sucesso" : "primario"}
          tamanho={compacto ? "pequeno" : "medio"}
          icone={copiado ? Check : Copy}
          larguraTotal
          onClick={copiar}
        >
          {copiado ? "Link copiado" : "Copiar link"}
        </Botao>
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          aria-label="Enviar no WhatsApp"
          className={`flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-ok-fundo px-3 font-semibold text-ok hover:bg-ok hover:text-white ${
            compacto ? "h-9 text-sm" : "h-11 text-sm"
          }`}
        >
          <MessageCircle className="size-4" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
