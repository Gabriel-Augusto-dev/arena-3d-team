"use client";

import { CalendarDays, House, Settings, Users, Wallet } from "lucide-react";
import { GuardaRota } from "@/componentes/navegacao/GuardaRota";
import { EstruturaApp, type ItemNavegacao } from "@/componentes/navegacao/EstruturaApp";
import { ProvedorDadosProfessor, useDadosProfessor } from "@/contextos/ContextoDadosProfessor";

function NavegacaoProfessor({ children }: { children: React.ReactNode }) {
  const { paraConferir } = useDadosProfessor();
  const itens: ItemNavegacao[] = [
    { rotulo: "Início", href: "/professor", icone: House },
    { rotulo: "Alunos", href: "/professor/alunos", icone: Users },
    { rotulo: "Turmas", href: "/professor/aulas", icone: CalendarDays },
    { rotulo: "Financeiro", href: "/professor/financeiro", icone: Wallet, contador: paraConferir.length },
    { rotulo: "Ajustes", href: "/professor/configuracoes", icone: Settings },
  ];
  return (
    <EstruturaApp itens={itens} raiz="/professor" rotuloPerfil="Professor">
      {children}
    </EstruturaApp>
  );
}

/** Só quem tem perfil "professor" entra aqui — o GuardaRota redireciona os demais */
export function AreaProfessor({ children }: { children: React.ReactNode }) {
  return (
    <GuardaRota perfil="professor">
      <ProvedorDadosProfessor>
        <NavegacaoProfessor>{children}</NavegacaoProfessor>
      </ProvedorDadosProfessor>
    </GuardaRota>
  );
}
