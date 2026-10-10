"use client";

import { useId, useRef, useState } from "react";
import { CalendarDays, Clock, Eye, EyeOff, type LucideIcon } from "lucide-react";

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

/** "2004-05-25" → "25/05/2004" */
function isoParaTexto(iso: string): string {
  const [a, m, d] = iso.split("-");
  return a && m && d ? `${d}/${m}/${a}` : "";
}

/** Só aceita data completa e que existe de verdade (31/02 não) */
function textoParaIso(texto: string): string {
  const n = texto.replace(/\D/g, "");
  if (n.length !== 8) return "";
  const d = Number(n.slice(0, 2));
  const m = Number(n.slice(2, 4));
  const a = Number(n.slice(4));
  const data = new Date(a, m - 1, d);
  if (a < 1900 || data.getFullYear() !== a || data.getMonth() !== m - 1 || data.getDate() !== d) return "";
  return `${n.slice(4)}-${n.slice(2, 4)}-${n.slice(0, 2)}`;
}

function mascaraData(texto: string): string {
  const n = texto.replace(/\D/g, "").slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

/**
 * Data que dá para DIGITAR (abre o teclado numérico, com a máscara DD/MM/AAAA)
 * ou escolher no calendário pelo botão ao lado. `valor` e `aoMudar` usam o
 * formato do banco (AAAA-MM-DD); enquanto a data está incompleta, vale "".
 */
export function CampoData({
  rotulo,
  erro,
  dica,
  className,
  valor,
  aoMudar,
  min,
  max,
  autoComplete = "bday",
}: Moldura & { valor: string; aoMudar(iso: string): void; min?: string; max?: string; autoComplete?: string }) {
  const id = useId();
  const calendario = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState(() => isoParaTexto(valor));
  const [valorAnterior, setValorAnterior] = useState(valor);
  const [foraDoLimite, setForaDoLimite] = useState(false);

  // Valor mudou por fora (calendário, formulário reiniciado ou filtro limpo): mostra a data nova.
  // Data incompleta ou fora do limite também chega como "", e aí o que foi digitado fica.
  if (valor !== valorAnterior) {
    setValorAnterior(valor);
    if (valor) {
      if (valor !== textoParaIso(texto)) setTexto(isoParaTexto(valor));
    } else if (textoParaIso(texto) && !foraDoLimite) {
      setTexto("");
    }
  }

  const digitar = (bruto: string) => {
    const novo = mascaraData(bruto);
    setTexto(novo);
    const iso = textoParaIso(novo);
    const fora = !!iso && ((!!max && iso > max) || (!!min && iso < min));
    setForaDoLimite(fora);
    aoMudar(fora ? "" : iso);
  };

  const abrirCalendario = () => {
    const campo = calendario.current;
    if (!campo) return;
    try {
      campo.showPicker();
    } catch {
      campo.focus();
      campo.click();
    }
  };

  const incompleta = texto.length > 0 && texto.length < 10;
  const invalida = texto.length === 10 && !textoParaIso(texto);
  const erroLocal = foraDoLimite ? "Data fora do permitido" : invalida ? "Data inválida" : undefined;

  return (
    <MolduraCampo
      id={id}
      rotulo={rotulo}
      erro={erroLocal ?? (incompleta ? undefined : erro)}
      dica={dica ?? (incompleta ? "Digite dia, mês e ano (DD/MM/AAAA)" : undefined)}
      className={className}
    >
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete={autoComplete}
          placeholder="DD/MM/AAAA"
          maxLength={10}
          aria-invalid={!!(erroLocal ?? erro)}
          className={`${estiloEntrada} h-12 pr-12`}
          value={texto}
          onChange={(e) => digitar(e.target.value)}
        />
        <button
          type="button"
          aria-label="Escolher no calendário"
          onClick={abrirCalendario}
          className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-suave transition hover:bg-fundo hover:text-tinta"
        >
          <CalendarDays className="size-5" />
        </button>
        {/* Calendário nativo, invisível: só abre pelo botão */}
        <input
          ref={calendario}
          type="date"
          tabIndex={-1}
          aria-hidden
          min={min}
          max={max}
          value={valor}
          onChange={(e) => {
            setForaDoLimite(false);
            setTexto(isoParaTexto(e.target.value));
            aoMudar(e.target.value);
          }}
          className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0"
        />
      </div>
    </MolduraCampo>
  );
}

/** "1830" → "18:30" */
function mascaraHora(texto: string): string {
  const n = texto.replace(/\D/g, "").slice(0, 4);
  return n.length <= 2 ? n : `${n.slice(0, 2)}:${n.slice(2)}`;
}

/** Só aceita horário completo e válido (00:00 a 23:59) */
function textoParaHora(texto: string): string {
  const n = texto.replace(/\D/g, "");
  if (n.length !== 4) return "";
  return Number(n.slice(0, 2)) > 23 || Number(n.slice(2)) > 59 ? "" : `${n.slice(0, 2)}:${n.slice(2)}`;
}

/** Ao sair do campo, completa o que ficou curto: "9" → "09:00", "930" → "09:30", "18" → "18:00" */
function completarHora(texto: string): string {
  const n = texto.replace(/\D/g, "");
  if (n.length === 1 || n.length === 2) return `${n.padStart(2, "0")}:00`;
  if (n.length === 3) return `0${n.slice(0, 1)}:${n.slice(1)}`;
  return texto;
}

/**
 * Horário que dá para DIGITAR (teclado numérico, máscara HH:MM) ou escolher
 * no relógio pelo botão ao lado. `valor` e `aoMudar` usam "HH:MM";
 * enquanto o horário está incompleto, vale "".
 */
export function CampoHora({
  rotulo,
  erro,
  dica,
  className,
  valor,
  aoMudar,
}: Moldura & { valor: string; aoMudar(hora: string): void }) {
  const id = useId();
  const relogio = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState(valor);
  const [valorAnterior, setValorAnterior] = useState(valor);

  // Valor mudou por fora (relógio ou formulário reiniciado): mostra o horário novo
  if (valor !== valorAnterior) {
    setValorAnterior(valor);
    if (valor && valor !== textoParaHora(texto)) setTexto(valor);
  }

  const digitar = (bruto: string) => {
    const novo = mascaraHora(bruto);
    setTexto(novo);
    aoMudar(textoParaHora(novo));
  };

  const abrirRelogio = () => {
    const campo = relogio.current;
    if (!campo) return;
    try {
      campo.showPicker();
    } catch {
      campo.focus();
      campo.click();
    }
  };

  const incompleta = texto.length > 0 && texto.length < 5;
  const invalida = texto.length === 5 && !textoParaHora(texto);
  const erroLocal = invalida ? "Horário inválido" : undefined;

  return (
    <MolduraCampo
      id={id}
      rotulo={rotulo}
      erro={erroLocal ?? (incompleta ? undefined : erro)}
      dica={dica ?? (incompleta ? "Hora e minuto (HH:MM)" : undefined)}
      className={className}
    >
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="HH:MM"
          maxLength={5}
          aria-invalid={!!(erroLocal ?? erro)}
          className={`${estiloEntrada} h-12 pr-12`}
          value={texto}
          onChange={(e) => digitar(e.target.value)}
          onBlur={() => {
            const completo = completarHora(texto);
            if (completo !== texto) digitar(completo);
          }}
        />
        <button
          type="button"
          aria-label="Escolher no relógio"
          onClick={abrirRelogio}
          className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-suave transition hover:bg-fundo hover:text-tinta"
        >
          <Clock className="size-5" />
        </button>
        {/* Relógio nativo, invisível: só abre pelo botão */}
        <input
          ref={relogio}
          type="time"
          tabIndex={-1}
          aria-hidden
          value={valor}
          onChange={(e) => {
            setTexto(e.target.value);
            aoMudar(e.target.value);
          }}
          className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0"
        />
      </div>
    </MolduraCampo>
  );
}
