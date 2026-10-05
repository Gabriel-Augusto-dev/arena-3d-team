import Image from "next/image";

/** Cabeça do lobo da logo — usado no topo, menu e tela de abertura */
export function SimboloMarca({ className = "size-10", prioridade = false }: { className?: string; prioridade?: boolean }) {
  return (
    <Image
      src="/marca/lobo.webp"
      alt=""
      width={256}
      height={256}
      priority={prioridade}
      className={`shrink-0 rounded-xl object-cover ring-1 ring-white/10 ${className}`}
    />
  );
}

/** Logo completa do professor (escudo com o lobo e "3D TEAM") */
export function LogoCompleta({ className = "w-40" }: { className?: string }) {
  return (
    <Image
      src="/marca/logo-3d-team.webp"
      alt="3D Team Assessoria Esportiva"
      width={520}
      height={877}
      priority
      className={`h-auto ${className}`}
    />
  );
}

/** Símbolo + nome, no estilo da logo: "3D" laranja e "TEAM" */
export function Logo({ claro = false, compacto = false }: { claro?: boolean; compacto?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <SimboloMarca className={compacto ? "size-9" : "size-11"} prioridade />
      <span className="leading-none">
        <span
          className={`block font-titulo font-extrabold italic uppercase leading-[0.9] tracking-tight ${
            compacto ? "text-[22px]" : "text-[26px]"
          } ${claro ? "text-white" : "text-tinta"}`}
        >
          <span className="text-laranja-500">3D</span> Team
        </span>
        <span
          className={`mt-0.5 block text-[9px] font-bold tracking-[0.16em] ${claro ? "text-marinho-200" : "text-suave"}`}
        >
          ASSESSORIA ESPORTIVA
        </span>
      </span>
    </span>
  );
}
