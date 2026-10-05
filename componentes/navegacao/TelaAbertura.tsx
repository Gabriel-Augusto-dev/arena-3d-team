import { SimboloMarca } from "@/componentes/marca/Logo";

export function TelaAbertura() {
  return (
    <div className="grid min-h-dvh place-items-center bg-marinho-900">
      <div className="flex flex-col items-center gap-4">
        <SimboloMarca className="size-20 animate-pulse rounded-3xl" prioridade />
        <p className="font-titulo text-lg font-extrabold italic uppercase tracking-wide text-white">
          <span className="text-laranja-500">3D</span> Team
        </p>
      </div>
    </div>
  );
}
