"use client";

import { CalendarDays, House, Settings, Users, UsersRound, Wallet } from "lucide-react";
import { GuardaRota } from "@/componentes/navegacao/GuardaRota";
import { EstruturaApp, type ItemNavegacao } from "@/componentes/navegacao/EstruturaApp";
import { ProvedorDadosProfessor, useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAutenticacao, useUsuarioLogado } from "@/contextos/ContextoAutenticacao";
import { PERFIS_EQUIPE, ROTULOS_PERFIL } from "@/lib/permissoes";

function NavegacaoProfessor({ children }: { children: React.ReactNode }) {
  const usuario = useUsuarioLogado();
  const { ehAdministrador } = useAutenticacao();
  const { paraConferir } = useDadosProfessor();

  // O professor auxiliar não vê o Financeiro nem os Ajustes
  const itens: ItemNavegacao[] = ehAdministrador
    ? [
        { rotulo: "Início", href: "/professor", icone: House },
        { rotulo: "Alunos", href: "/professor/alunos", icone: Users },
        { rotulo: "Turmas", href: "/professor/aulas", icone: CalendarDays },
        { rotulo: "Financeiro", href: "/professor/financeiro", icone: Wallet, contador: paraConferir.length },
        { rotulo: "Equipe", href: "/professor/equipe", icone: UsersRound },
        { rotulo: "Ajustes", href: "/professor/configuracoes", icone: Settings },
      ]
    : [
        { rotulo: "Início", href: "/professor", icone: House },
        { rotulo: "Alunos", href: "/professor/alunos", icone: Users },
        { rotulo: "Aulas", href: "/professor/aulas?aba=agenda", icone: CalendarDays },
      ];

  return (
    <EstruturaApp itens={itens} raiz="/professor" rotuloPerfil={ROTULOS_PERFIL[usuario.perfil]}>
      {children}
    </EstruturaApp>
  );
}

/** Professor e professor auxiliar entram aqui — o GuardaRota redireciona os demais */
export function AreaProfessor({ children }: { children: React.ReactNode }) {
  return (
    <GuardaRota perfis={PERFIS_EQUIPE}>
      <ProvedorDadosProfessor>
        <NavegacaoProfessor>{children}</NavegacaoProfessor>
      </ProvedorDadosProfessor>
    </GuardaRota>
  );
}
