import type { Metadata } from "next";
import { AreaProfessor } from "./AreaProfessor";

export const metadata: Metadata = { title: "Professor" };

export default function LayoutProfessor({ children }: LayoutProps<"/professor">) {
  return <AreaProfessor>{children}</AreaProfessor>;
}
