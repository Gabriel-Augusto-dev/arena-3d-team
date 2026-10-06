import { Clock, MapPin, UserRound } from "lucide-react";
import { descreverQuadra, nomeDoProfessor } from "@/servicos/regras/regrasAula";
import type { Aula, Turma } from "@/tipos";
import { deDataISO, formatarDataRelativa, formatarDiaRelativo } from "@/lib/utilitarios/datas";

/**
 * A próxima aula do aluno em formato de ingresso destacável —
 * o elemento de identidade do app.
 */
export function IngressoAula({
  aula,
  turma,
  rotulo = "Próxima aula",
  status,
  animar = false,
}: {
  aula: Aula;
  turma: Turma | undefined;
  rotulo?: string;
  status?: React.ReactNode;
  animar?: boolean;
}) {
  const data = deDataISO(aula.data);
  const diaSemana = data.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  const mes = data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  const professor = nomeDoProfessor(aula, turma);
  const quadra = descreverQuadra(turma?.local);

  return (
    <article
      className={`relative flex overflow-hidden rounded-[26px] bg-marinho-900 text-white shadow-xl shadow-marinho-900/25 ${
        animar ? "animate-entrada-ingresso" : ""
      }`}
      aria-label={`${rotulo}: ${turma?.nome ?? "Aula"}, ${formatarDataRelativa(aula.data)} às ${aula.horarioInicio}`}
    >
      {/* Rede da quadra ao fundo */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden>
        <defs>
          <pattern id="rede" width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M14 0H0V14" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#rede)" />
      </svg>

      <div className="relative min-w-0 flex-1 p-5 pr-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-marinho-200">{rotulo}</span>
          {status}
        </div>
        <h3 className="mt-2 truncate font-titulo text-[34px] font-extrabold italic uppercase leading-none">
          {turma?.nome ?? "Aula"}
        </h3>
        <p className="mt-1 text-[15px] font-medium text-laranja-300">{formatarDiaRelativo(aula.data)}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-marinho-100">
          <span className="numeros inline-flex items-center gap-1.5">
            <Clock className="size-4 text-laranja-400" />
            {aula.horarioInicio} – {aula.horarioFim}
          </span>
          {quadra && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4 text-laranja-400" />
              {quadra}
            </span>
          )}
          {professor && (
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-4 text-laranja-400" />
              Prof. {professor}
            </span>
          )}
        </div>
      </div>

      {/* Picote */}
      <div className="relative w-0 border-l-2 border-dashed border-marinho-950/40" aria-hidden>
        <span className="absolute -left-[13px] -top-3 size-6 rounded-full bg-fundo" />
        <span className="absolute -bottom-3 -left-[13px] size-6 rounded-full bg-fundo" />
      </div>

      {/* Canhoto */}
      <div className="relative flex w-[86px] shrink-0 flex-col items-center justify-center bg-laranja-500 text-marinho-950">
        <span className="text-xs font-bold capitalize">{diaSemana}</span>
        <span className="numeros font-titulo text-[46px] font-extrabold italic leading-none">
          {String(data.getDate()).padStart(2, "0")}
        </span>
        <span className="text-xs font-bold capitalize">{mes}</span>
      </div>
    </article>
  );
}
