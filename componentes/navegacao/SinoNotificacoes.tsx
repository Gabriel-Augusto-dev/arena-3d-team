"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  CalendarX,
  CircleCheck,
  CircleX,
  Inbox,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { onde } from "@/lib/banco";
import { useColecao } from "@/ganchos/useColecao";
import { useUsuarioLogado } from "@/contextos/ContextoAutenticacao";
import { Folha } from "@/componentes/interface/Folha";
import { EstadoVazio } from "@/componentes/interface/Elementos";
import { formatarTempoDecorrido } from "@/lib/utilitarios/datas";
import { marcarComoLida, marcarTodasComoLidas } from "@/servicos/servicoNotificacoes";
import type { Notificacao, TipoNotificacao } from "@/tipos";

const icones: Record<TipoNotificacao, { icone: LucideIcon; cor: string }> = {
  pagamento_confirmado: { icone: CircleCheck, cor: "bg-ok-fundo text-ok" },
  pagamento_recusado: { icone: CircleX, cor: "bg-erro-fundo text-erro" },
  aula_cancelada: { icone: CalendarX, cor: "bg-erro-fundo text-erro" },
  nova_solicitacao: { icone: Inbox, cor: "bg-alerta-fundo text-alerta" },
  experimental_agendada: { icone: Sparkles, cor: "bg-marinho-100 text-marinho-700" },
  aviso: { icone: Bell, cor: "bg-marinho-100 text-marinho-700" },
};

export function SinoNotificacoes({ claro = false }: { claro?: boolean }) {
  const usuario = useUsuarioLogado();
  const router = useRouter();
  const [aberta, setAberta] = useState(false);

  const filtro =
    usuario.perfil === "professor" ? [onde("paraPerfil", "==", "professor")] : [onde("usuarioId", "==", usuario.id)];
  const { dados } = useColecao("notificacoes", filtro);

  const notificacoes = useMemo(
    () => [...dados].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).slice(0, 40),
    [dados],
  );
  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  const abrir = async (notificacao: Notificacao) => {
    if (!notificacao.lida) await marcarComoLida(notificacao.id);
    if (notificacao.link) {
      setAberta(false);
      router.push(notificacao.link);
    }
  };

  return (
    <>
      <button
        onClick={() => setAberta(true)}
        aria-label={naoLidas ? `Notificações, ${naoLidas} novas` : "Notificações"}
        className={`relative grid size-10 place-items-center rounded-full transition ${
          claro ? "text-white hover:bg-white/10" : "bg-white text-tinta ring-1 ring-linha hover:bg-marinho-50"
        }`}
      >
        <Bell className="size-5" />
        {naoLidas > 0 && (
          <span className="numeros absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-laranja-500 px-1 text-[11px] font-bold text-marinho-950 ring-2 ring-fundo">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      <Folha
        aberta={aberta}
        aoFechar={() => setAberta(false)}
        titulo="Notificações"
        descricao={naoLidas ? `${naoLidas} não ${naoLidas === 1 ? "lida" : "lidas"}` : "Tudo em dia"}
        rodape={
          naoLidas > 0 && (
            <button
              onClick={() => marcarTodasComoLidas(notificacoes)}
              className="h-11 w-full rounded-xl text-sm font-semibold text-marinho-700 hover:bg-marinho-100/70"
            >
              Marcar todas como lidas
            </button>
          )
        }
      >
        {notificacoes.length === 0 ? (
          <EstadoVazio icone={BellOff} titulo="Nenhuma notificação" descricao="Avisos de pagamentos e aulas aparecem aqui." />
        ) : (
          <ul className="flex flex-col gap-2">
            {notificacoes.map((n) => {
              const { icone: Icone, cor } = icones[n.tipo] ?? icones.aviso;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => abrir(n)}
                    className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition ${
                      n.lida ? "bg-transparent hover:bg-white" : "bg-white ring-1 ring-linha/70"
                    }`}
                  >
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${cor}`}>
                      <Icone className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={`text-[15px] ${n.lida ? "font-medium text-suave" : "font-bold"}`}>{n.titulo}</span>
                        <span className="shrink-0 text-xs text-suave">{formatarTempoDecorrido(n.criadoEm)}</span>
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug text-suave">{n.mensagem}</span>
                    </span>
                    {!n.lida && <span className="mt-2 size-2 shrink-0 rounded-full bg-laranja-500" aria-label="Não lida" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Folha>
    </>
  );
}
