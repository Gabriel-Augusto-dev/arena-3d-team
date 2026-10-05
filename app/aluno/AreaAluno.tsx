"use client";

import { CalendarDays, House, UserRound, Wallet } from "lucide-react";
import { GuardaRota } from "@/componentes/navegacao/GuardaRota";
import { EstruturaApp, type ItemNavegacao } from "@/componentes/navegacao/EstruturaApp";
import { ProvedorDadosAluno, useDadosAluno } from "@/contextos/ContextoDadosAluno";

function NavegacaoAluno({ children }: { children: React.ReactNode }) {
  const { meusPagamentos } = useDadosAluno();
  const pendentes = meusPagamentos.filter((p) => p.status === "pendente").length;

  const itens: ItemNavegacao[] = [
    { rotulo: "Início", href: "/aluno", icone: House },
    { rotulo: "Aulas", href: "/aluno/aulas", icone: CalendarDays },
    { rotulo: "Pagamentos", href: "/aluno/pagamentos", icone: Wallet, contador: pendentes },
    { rotulo: "Perfil", href: "/aluno/perfil", icone: UserRound },
  ];

  return (
    <EstruturaApp itens={itens} raiz="/aluno" rotuloPerfil="Aluno">
      {children}
    </EstruturaApp>
  );
}

export function AreaAluno({ children }: { children: React.ReactNode }) {
  return (
    <GuardaRota perfil="aluno">
      <ProvedorDadosAluno>
        <NavegacaoAluno>{children}</NavegacaoAluno>
      </ProvedorDadosAluno>
    </GuardaRota>
  );
}
