"use client";

import { useState } from "react";
import { Check, Copy, MailCheck, MessageCircle } from "lucide-react";
import type { ResultadoNovaConta } from "@/lib/autenticacao";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { Folha } from "@/componentes/interface/Folha";
import { Botao } from "@/componentes/interface/Botao";
import { CarimboEnviado } from "@/componentes/pagamentos/CarimboEnviado";
import { copiarTexto } from "@/lib/utilitarios/areaTransferencia";
import { primeiroNome } from "@/lib/utilitarios/formatadores";

/**
 * Resultado de um cadastro (ou reenvio de acesso) feito pelo professor.
 * Se o e-mail saiu, só confirma. Se não saiu (Brevo fora do ar ou não
 * configurado), mostra o link para criar a senha, para mandar no WhatsApp.
 */
export function FolhaAcessoEnviado({
  nome,
  email,
  resultado,
  aoFechar,
}: {
  nome: string;
  email?: string;
  resultado: ResultadoNovaConta;
  aoFechar(): void;
}) {
  const avisos = useAvisos();
  const { configuracoes } = useDadosProfessor();
  const [copiado, setCopiado] = useState(false);
  const mensagem = resultado.linkSenha
    ? `Oi ${primeiroNome(nome)}! Seu acesso ao app da ${configuracoes.nomeArena} está pronto. Crie sua senha por este link (vale por 1 hora): ${resultado.linkSenha}`
    : "";

  const copiar = async () => {
    if (await copiarTexto(resultado.linkSenha ?? "")) {
      setCopiado(true);
      avisos.sucesso("Link copiado");
      setTimeout(() => setCopiado(false), 2500);
    } else {
      avisos.erro(new Error("Não foi possível copiar. Segure o link para copiar"));
    }
  };

  return (
    <Folha
      aberta
      aoFechar={aoFechar}
      rodape={
        <Botao tamanho="grande" variante="secundario" larguraTotal onClick={aoFechar}>
          Pronto
        </Botao>
      }
    >
      {resultado.emailEnviado ? (
        <CarimboEnviado
          tipo="confirmado"
          titulo="Acesso enviado!"
          descricao={`${primeiroNome(nome)} recebeu um e-mail${email ? ` em ${email}` : ""} com o link para criar a senha. Se não chegar, peça para olhar o spam.`}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-2xl bg-alerta-fundo px-4 py-3 text-sm text-alerta">
            <MailCheck className="mt-0.5 size-5 shrink-0" />
            <p>
              <strong>Conta pronta, mas o e-mail não foi enviado.</strong> Mande o link abaixo para{" "}
              {primeiroNome(nome)} criar a senha. Ele vale por 1 hora; depois disso, basta usar “Esqueci minha senha” na
              tela de entrada.
            </p>
          </div>
          {resultado.linkSenha && (
            <>
              <p className="select-all break-all rounded-xl bg-fundo px-3 py-2 font-mono text-[12px] text-marinho-800">
                {resultado.linkSenha}
              </p>
              <div className="flex gap-2">
                <Botao variante={copiado ? "sucesso" : "primario"} icone={copiado ? Check : Copy} larguraTotal onClick={copiar}>
                  {copiado ? "Link copiado" : "Copiar link"}
                </Botao>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-ok-fundo px-3 text-sm font-semibold text-ok hover:bg-ok hover:text-white"
                >
                  <MessageCircle className="size-4" />
                  WhatsApp
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </Folha>
  );
}
