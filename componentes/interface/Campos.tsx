"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";

const estiloEntrada =
  "w-full rounded-xl bg-white px-3.5 text-[15px] text-tinta ring-1 ring-inset ring-linha placeholder:text-suave/60 transition focus:outline-none focus:ring-2 focus:ring-marinho-500 disabled:bg-fundo disabled:text-suave aria-[invalid=true]:ring-erro";

interface Moldura {
  rotulo?: string;
  erro?: string;
  dica?: string;
  className?: string;
}

function MolduraCampo({
  id,
  rotulo,
  erro,
  dica,
  className = "",
  children,
}: Moldura & { id: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {rotulo && (
        <label htmlFor={id} className="text-sm font-semibold text-tinta">
          {rotulo}
        </label>
      )}
      {children}
      {erro ? (
        <p className="text-[13px] font-medium text-erro">{erro}</p>
      ) : (
        dica && <p className="text-[13px] text-suave">{dica}</p>
      )}
    </div>
  );
}

export function Campo({
  rotulo,
  erro,
  dica,
  className,
  icone: Icone,
  ...resto
}: Moldura & { icone?: LucideIcon } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <MolduraCampo id={id} rotulo={rotulo} erro={erro} dica={dica} className={className}>
      <div className="relative">
        {Icone && <Icone className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-suave" />}
        <input
          id={id}
          aria-invalid={!!erro}
          className={`${estiloEntrada} h-12 ${Icone ? "pl-10" : ""}`}
          {...resto}
        />
      </div>
    </MolduraCampo>
  );
}

export function CampoSenha({
  rotulo,
  erro,
  dica,
  className,
  ...resto
}: Moldura & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const [visivel, setVisivel] = useState(false);
  return (
    <MolduraCampo id={id} rotulo={rotulo} erro={erro} dica={dica} className={className}>
      <div className="relative">
        <input
          id={id}
          type={visivel ? "text" : "password"}
          aria-invalid={!!erro}
          className={`${estiloEntrada} h-12 pr-12`}
          {...resto}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
          className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-suave hover:bg-fundo"
        >
          {visivel ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      </div>
    </MolduraCampo>
  );
}

export function CampoSelecao({
  rotulo,
  erro,
  dica,
  className,
  children,
  ...resto
}: Moldura & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <MolduraCampo id={id} rotulo={rotulo} erro={erro} dica={dica} className={className}>
      <select id={id} aria-invalid={!!erro} className={`${estiloEntrada} h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23587080%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:18px] bg-[right_0.9rem_center] bg-no-repeat pr-10`} {...resto}>
        {children}
      </select>
    </MolduraCampo>
  );
}

export function CampoTexto({
  rotulo,
  erro,
  dica,
  className,
  ...resto
}: Moldura & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <MolduraCampo id={id} rotulo={rotulo} erro={erro} dica={dica} className={className}>
      <textarea id={id} aria-invalid={!!erro} rows={3} className={`${estiloEntrada} resize-none py-3`} {...resto} />
    </MolduraCampo>
  );
}

/** Botões de escolha única lado a lado (ex.: plano mensalista/avulso) */
export function SeletorOpcoes<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
}: {
  rotulo?: string;
  opcoes: { valor: T; rotulo: string; descricao?: string }[];
  valor: T;
  aoMudar(valor: T): void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      {rotulo && <legend className="mb-1.5 text-sm font-semibold">{rotulo}</legend>}
      <div className="grid grid-cols-2 gap-2">
        {opcoes.map((opcao) => {
          const ativo = opcao.valor === valor;
          return (
            <button
              key={opcao.valor}
              type="button"
              aria-pressed={ativo}
              onClick={() => aoMudar(opcao.valor)}
              className={`rounded-xl px-3 py-2.5 text-left transition ${
                ativo ? "bg-marinho-900 text-white" : "bg-white ring-1 ring-inset ring-linha hover:bg-marinho-50"
              }`}
            >
              <span className="block text-sm font-semibold">{opcao.rotulo}</span>
              {opcao.descricao && (
                <span className={`block text-xs ${ativo ? "text-marinho-100" : "text-suave"}`}>{opcao.descricao}</span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
