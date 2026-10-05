import { SomenteAdministrador } from "@/componentes/navegacao/SomenteAdministrador";

/** Ajustes e equipe: só o professor administrador */
export default function LayoutConfiguracoes({ children }: { children: React.ReactNode }) {
  return <SomenteAdministrador>{children}</SomenteAdministrador>;
}
