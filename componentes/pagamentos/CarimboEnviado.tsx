import { Hourglass, CircleCheck } from "lucide-react";

/** Confirmação visual depois de enviar um PIX ou agendar experimental */
export function CarimboEnviado({
  tipo,
  titulo,
  descricao,
}: {
  tipo: "aguardando" | "confirmado";
  titulo: string;
  descricao: string;
}) {
  const aguardando = tipo === "aguardando";
  const Icone = aguardando ? Hourglass : CircleCheck;
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div
        className={`grid size-24 animate-carimbo place-items-center rounded-full border-4 border-dashed ${
          aguardando ? "border-laranja-500 bg-alerta-fundo text-alerta" : "border-ok bg-ok-fundo text-ok"
        }`}
      >
        <Icone className="size-10" />
      </div>
      <h3 className="mt-5 font-titulo text-2xl font-extrabold">{titulo}</h3>
      <p className="mt-2 max-w-xs text-[15px] text-suave">{descricao}</p>
    </div>
  );
}
