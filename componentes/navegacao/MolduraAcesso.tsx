import { LogoCompleta } from "@/componentes/marca/Logo";

/**
 * Moldura das telas de entrada e cadastro.
 * Celular: logo no topo azul-marinho e formulário abaixo.
 * Computador: painel com a logo à esquerda, formulário à direita.
 */
export function MolduraAcesso({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-fundo lg:flex-row">
      <section className="relative flex items-center gap-5 overflow-hidden bg-marinho-900 px-6 pb-14 pt-[max(env(safe-area-inset-top),1.75rem)] text-white lg:w-[44%] lg:flex-col lg:items-start lg:justify-center lg:gap-10 lg:p-14">
        {/* Faixa diagonal laranja, como na logo */}
        <div
          className="pointer-events-none absolute -right-10 top-0 h-full w-28 skew-x-[-14deg] bg-laranja-500 lg:-right-16 lg:w-48"
          aria-hidden
        />
        <LogoCompleta className="relative w-24 shrink-0 drop-shadow-xl sm:w-28 lg:w-56" />
        <div className="relative max-w-md pr-16 lg:pr-0">
          <h1 className="font-titulo text-[34px] font-extrabold italic uppercase leading-[0.95] lg:text-6xl">{titulo}</h1>
          <p className="mt-2 text-[15px] text-marinho-100 lg:mt-4 lg:text-lg">{subtitulo}</p>
        </div>
      </section>

      <section className="relative -mt-8 flex flex-1 justify-center rounded-t-[32px] bg-fundo px-5 pb-10 pt-8 lg:mt-0 lg:items-center lg:rounded-none lg:px-14">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </div>
  );
}
