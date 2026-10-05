"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, type LucideIcon } from "lucide-react";
import { useAutenticacao, useUsuarioLogado } from "@/contextos/ContextoAutenticacao";
import { Avatar } from "@/componentes/interface/Elementos";
import { Botao } from "@/componentes/interface/Botao";
import { Folha } from "@/componentes/interface/Folha";
import { Logo } from "@/componentes/marca/Logo";
import { SinoNotificacoes } from "./SinoNotificacoes";

export interface ItemNavegacao {
  rotulo: string;
  href: string;
  icone: LucideIcon;
  /** Número de pendências exibido sobre o ícone */
  contador?: number;
}

function estaAtivo(caminho: string, href: string, raiz: string) {
  const base = href.split("?")[0];
  return base === raiz ? caminho === raiz : caminho.startsWith(base);
}

/**
 * Casca do app.
 *  Celular: barra superior + barra de abas inferior (polegar).
 *  Computador (lg+): menu lateral fixo.
 */
export function EstruturaApp({
  itens,
  raiz,
  rotuloPerfil,
  children,
}: {
  itens: ItemNavegacao[];
  raiz: string;
  rotuloPerfil: string;
  children: React.ReactNode;
}) {
  const caminho = usePathname();
  const router = useRouter();
  const usuario = useUsuarioLogado();
  const { sair } = useAutenticacao();

  const [contaAberta, setContaAberta] = useState(false);
  const [saindo, setSaindo] = useState(false);

  const encerrarSessao = async () => {
    setSaindo(true);
    await sair();
    router.replace("/entrar");
  };

  return (
    <div className="min-h-dvh lg:flex">
      {/* Menu lateral — computador */}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col bg-marinho-900 px-5 py-6 text-white lg:flex">
        <div className="flex items-center justify-between px-2">
          <Link href={raiz} aria-label="Início">
            <Logo claro />
          </Link>
          <SinoNotificacoes claro />
        </div>

        <nav className="mt-10 flex flex-col gap-1" aria-label="Principal">
          {itens.map((item) => {
            const ativo = estaAtivo(caminho, item.href, raiz);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={`group flex h-12 items-center gap-3 rounded-2xl px-4 text-[15px] font-semibold transition ${
                  ativo ? "bg-white text-marinho-900" : "text-marinho-100 hover:bg-white/8 hover:text-white"
                }`}
              >
                <item.icone className={`size-5 ${ativo ? "text-marinho-600" : ""}`} strokeWidth={2.1} />
                <span className="flex-1">{item.rotulo}</span>
                {!!item.contador && (
                  <span className="numeros grid h-6 min-w-6 place-items-center rounded-full bg-laranja-500 px-1.5 text-xs font-bold text-marinho-950">
                    {item.contador}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-3 rounded-2xl bg-white/6 p-3">
          <Avatar nome={usuario.nome} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{usuario.nome}</p>
            <p className="text-xs text-marinho-200">{rotuloPerfil}</p>
          </div>
          <button
            onClick={encerrarSessao}
            className="flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-marinho-200 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-[18px]" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior — celular */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-fundo/85 px-4 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-md lg:hidden">
          <Link href={raiz} aria-label="Início">
            <Logo compacto />
          </Link>
          <div className="flex items-center gap-2">
            <SinoNotificacoes />
            <button
              onClick={() => setContaAberta(true)}
              aria-label="Minha conta"
              className="rounded-full ring-2 ring-white transition active:scale-95"
            >
              <Avatar nome={usuario.nome} tamanho="pequeno" />
            </button>
          </div>
        </header>

        <Folha
          aberta={contaAberta}
          aoFechar={() => setContaAberta(false)}
          titulo="Minha conta"
          rodape={
            <Botao variante="perigo" tamanho="grande" icone={LogOut} larguraTotal carregando={saindo} onClick={encerrarSessao}>
              Sair da conta
            </Botao>
          }
        >
          <div className="flex items-center gap-4 rounded-3xl bg-white p-4 ring-1 ring-linha/70">
            <Avatar nome={usuario.nome} tamanho="grande" />
            <div className="min-w-0">
              <p className="truncate font-titulo text-xl font-bold">{usuario.nome}</p>
              <p className="truncate text-sm text-suave">{usuario.email}</p>
              <p className="mt-1 text-[13px] font-semibold text-marinho-600">{rotuloPerfil}</p>
            </div>
          </div>
        </Folha>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-3 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          {children}
        </main>

        {/* Abas inferiores — celular */}
        <nav
          aria-label="Principal"
          className="pb-seguro fixed inset-x-0 bottom-0 z-30 border-t border-linha/80 bg-white/95 px-2 pt-1.5 backdrop-blur-md lg:hidden"
        >
          <ul className="mx-auto flex max-w-md">
            {itens.map((item) => {
              const ativo = estaAtivo(caminho, item.href, raiz);
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    aria-current={ativo ? "page" : undefined}
                    className="flex flex-col items-center gap-0.5 py-1"
                  >
                    <span
                      className={`relative grid h-8 w-14 place-items-center rounded-full transition ${
                        ativo ? "bg-marinho-900 text-laranja-400" : "text-suave"
                      }`}
                    >
                      <item.icone className="size-[21px]" strokeWidth={ativo ? 2.4 : 2} />
                      {!!item.contador && (
                        <span className="numeros absolute -right-0.5 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-laranja-500 px-1 text-[10px] font-bold text-marinho-950 ring-2 ring-white">
                          {item.contador}
                        </span>
                      )}
                    </span>
                    <span className={`text-[11px] font-semibold ${ativo ? "text-tinta" : "text-suave"}`}>
                      {item.rotulo}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
