"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CircleCheck, CircleX, Info, X } from "lucide-react";

type TipoAviso = "sucesso" | "erro" | "info";

interface Aviso {
  id: number;
  tipo: TipoAviso;
  mensagem: string;
}

interface ValorAvisos {
  avisar(mensagem: string, tipo?: TipoAviso): void;
  sucesso(mensagem: string): void;
  erro(erroOuMensagem: unknown): void;
}

const ContextoAvisos = createContext<ValorAvisos | null>(null);

let proximoId = 1;

export function ProvedorAvisos({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const remover = useCallback((id: number) => setAvisos((lista) => lista.filter((a) => a.id !== id)), []);

  const avisar = useCallback(
    (mensagem: string, tipo: TipoAviso = "info") => {
      const id = proximoId++;
      setAvisos((lista) => [...lista.slice(-2), { id, tipo, mensagem }]);
      setTimeout(() => remover(id), tipo === "erro" ? 5000 : 3200);
    },
    [remover],
  );

  const valor = useMemo<ValorAvisos>(
    () => ({
      avisar,
      sucesso: (mensagem) => avisar(mensagem, "sucesso"),
      erro: (erro) =>
        avisar(erro instanceof Error ? erro.message : String(erro || "Algo deu errado. Tente novamente"), "erro"),
    }),
    [avisar],
  );

  const icones = { sucesso: CircleCheck, erro: CircleX, info: Info };
  const cores = {
    sucesso: "bg-marinho-900 text-white [&_svg]:text-laranja-400",
    erro: "bg-erro text-white",
    info: "bg-marinho-900 text-white [&_svg]:text-marinho-200",
  };

  return (
    <ContextoAvisos.Provider value={valor}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] lg:inset-x-auto lg:right-6 lg:top-auto lg:bottom-6 lg:items-end"
      >
        {avisos.map((aviso) => {
          const Icone = icones[aviso.tipo];
          return (
            <div
              key={aviso.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm animate-subir items-start gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg shadow-marinho-950/20 ${cores[aviso.tipo]}`}
            >
              <Icone className="mt-0.5 size-5 shrink-0" />
              <p className="flex-1 leading-snug">{aviso.mensagem}</p>
              <button onClick={() => remover(aviso.id)} aria-label="Fechar aviso" className="opacity-70 hover:opacity-100">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ContextoAvisos.Provider>
  );
}

export function useAvisos() {
  const contexto = useContext(ContextoAvisos);
  if (!contexto) throw new Error("useAvisos precisa estar dentro de ProvedorAvisos");
  return contexto;
}
