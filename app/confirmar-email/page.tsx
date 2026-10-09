"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { autenticacao } from "@/lib/autenticacao";
import { chamarApi } from "@/lib/api/cliente";
import { MolduraAcesso } from "@/componentes/navegacao/MolduraAcesso";
import { BotaoLink } from "@/componentes/interface/Botao";
import { Carregando } from "@/componentes/interface/Elementos";

/** Tela aberta pelo link do e-mail de confirmação (cadastro feito pelo próprio aluno) */
export default function PaginaConfirmarEmail() {
  return (
    <MolduraAcesso titulo="Seu e-mail" subtitulo="Confirmando o e-mail da sua conta.">
      <Suspense fallback={<Carregando />}>
        <Confirmacao />
      </Suspense>
    </MolduraAcesso>
  );
}

type Estado = { tipo: "confirmando" } | { tipo: "confirmado"; email: string } | { tipo: "invalido"; mensagem: string };

// O link pode ser aberto duas vezes (React em modo de desenvolvimento, ou o
// usuário recarregando): guarda a promessa para aplicar o código uma vez só
const emAndamento = new Map<string, Promise<string>>();

function Confirmacao() {
  const codigo = useSearchParams().get("codigo") ?? "";
  const [estado, setEstado] = useState<Estado>({ tipo: "confirmando" });

  useEffect(() => {
    let ativo = true;
    let promessa = emAndamento.get(codigo);
    if (!promessa) {
      promessa = codigo
        ? autenticacao.confirmarEmail(codigo).then(async (email) => {
            // Libera o acesso no cadastro (vale mesmo se o app estiver aberto em outro aparelho)
            await chamarApi("/api/emails/confirmado", { email }, { autenticado: false }).catch(() => undefined);
            return email;
          })
        : Promise.reject(new Error("Link incompleto. Abra de novo o link do e-mail"));
      if (codigo) emAndamento.set(codigo, promessa);
    }
    promessa
      .then((email) => ativo && setEstado({ tipo: "confirmado", email }))
      .catch((e: unknown) =>
        ativo && setEstado({ tipo: "invalido", mensagem: e instanceof Error ? e.message : "Link inválido" }),
      );
    return () => {
      ativo = false;
    };
  }, [codigo]);

  if (estado.tipo === "confirmando") return <Carregando texto="Confirmando seu e-mail…" />;

  if (estado.tipo === "invalido") {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="font-titulo text-3xl font-extrabold italic uppercase">Link expirado</h2>
        <p role="alert" className="rounded-xl bg-erro-fundo px-3.5 py-2.5 text-sm font-medium text-erro">
          {estado.mensagem}
        </p>
        <p className="text-[15px] text-suave">
          Se você já confirmou antes, é só entrar normalmente. Se não, entre no app e toque em{" "}
          <strong>Reenviar e-mail</strong> para receber um link novo.
        </p>
        <BotaoLink href="/entrar" tamanho="grande" larguraTotal>
          Ir para a entrada
        </BotaoLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CircleCheck className="size-12 text-ok" aria-hidden />
      <h2 className="font-titulo text-3xl font-extrabold italic uppercase">E-mail confirmado!</h2>
      <p className="break-all text-[15px] text-suave">
        Tudo certo com <strong className="text-tinta">{estado.email}</strong>. Seu acesso ao app está liberado.
      </p>
      <BotaoLink href="/entrar" tamanho="grande" larguraTotal>
        Abrir o app
      </BotaoLink>
    </div>
  );
}
