import type { Metadata } from "next";
import { AreaAluno } from "./AreaAluno";

export const metadata: Metadata = { title: "Aluno" };

export default function LayoutAluno({ children }: LayoutProps<"/aluno">) {
  return <AreaAluno>{children}</AreaAluno>;
}
