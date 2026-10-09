"use client";

import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { chamarApi } from "@/lib/api/cliente";
import { useAutenticacao } from "@/contextos/ContextoAutenticacao";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { MolduraAcesso } from "./MolduraAcesso";
import { Botao } from "@/componentes/interface/Botao";
import type { Usuario } from "@/tipos";

const ESPERA_REENVIO_S = 60;

/**
 * Aluno que se cadastrou e ainda não abriu o link do e-mail. O acesso libera
 * sozinho assim que o cadastro é marcado como confirmado (o documento do
 * usuário é observado em tempo real).
 */
export function TelaConfirmarEmail({ usuario }: { usuario: Usuario }) {
  const { sair } = useAutenticacao();
  const avisos = useAvisos();
  const [conferindo, setConferindo] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  // Ao voltar para o app (depois de abrir o e-mail), confere sozinho
  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === "visible") {
        void chamarApi("/api/emails/confirmado", { email: usuario.email }, { autenticado: false }).catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => document.removeEventListener("visibilitychange", aoVoltar);
  }, [usuario.email]);

  const jaConfirmei = async () => {
    setConferindo(true);
    try {
      const { confirmado } = await chamarApi<{ confirmado: boolean }>(
        "/api/emails/confirmado",
        { email: usuario.email },
        { autenticado: false },
      );
      if (!confirmado) avisos.erro("Ainda não encontramos a confirmação. Abra o link que enviamos no seu e-mail");
    } catch (e) {
      avisos.erro(e);
    } finally {
      setConferindo(false);
    }
  };

  const reenviar = async () => {
    setReenviando(true);
    try {
      const { confirmado } = await chamarApi<{ confirmado: boolean }>("/api/emails/confirmacao");
      if (!confirmado) {
        avisos.sucesso("E-mail enviado! Confira também a caixa de spam");
        setEspera(ESPERA_REENVIO_S);
      }
    } catch (e) {
      avisos.erro(e);
    } finally {
      setReenviando(false);
    }
  };

  return (
    <MolduraAcesso titulo="Quase lá!" subtitulo="Falta só confirmar seu e-mail para começar a usar o app.">
      <div className="flex flex-col gap-4">
        <MailCheck className="size-12 text-laranja-500" aria-hidden />
        <h2 className="font-titulo text-3xl font-extrabold italic uppercase">Confirme seu e-mail</h2>
        <p className="text-[15px] leading-relaxed text-suave">
          Enviamos um link para <strong className="break-all text-tinta">{usuario.email}</strong>. Abra o e-mail e toque
          em <strong className="text-tinta">Confirmar meu e-mail</strong>. Se não aparecer, confira a caixa de spam.
        </p>
        <Botao tamanho="grande" larguraTotal carregando={conferindo} onClick={jaConfirmei}>
          Já confirmei
        </Botao>
        <Botao
          variante="secundario"
          tamanho="grande"
          larguraTotal
          carregando={reenviando}
          disabled={espera > 0}
          onClick={reenviar}
        >
          {espera > 0 ? `Reenviar e-mail (${espera}s)` : "Reenviar e-mail"}
        </Botao>
        <Botao variante="fantasma" larguraTotal onClick={() => void sair()}>
          Sair e usar outro e-mail
        </Botao>
      </div>
    </MolduraAcesso>
  );
}
