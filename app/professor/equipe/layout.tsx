import { SomenteAdministrador } from "@/componentes/navegacao/SomenteAdministrador";

/** Equipe (relatório e repasse dos auxiliares): só o professor administrador */
export default function LayoutEquipe({ children }: { children: React.ReactNode }) {
  return <SomenteAdministrador>{children}</SomenteAdministrador>;
}
