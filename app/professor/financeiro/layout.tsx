import { SomenteAdministrador } from "@/componentes/navegacao/SomenteAdministrador";

/** Financeiro: só o professor administrador */
export default function LayoutFinanceiro({ children }: { children: React.ReactNode }) {
  return <SomenteAdministrador>{children}</SomenteAdministrador>;
}
