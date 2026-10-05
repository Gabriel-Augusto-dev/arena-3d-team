import type { PerfilUsuario, Usuario } from "@/tipos";

/**
 * Quem pode o quê. As mesmas regras estão no firestore.rules
 * (a tela só esconde; quem barra de verdade é o Firestore).
 *
 *  professor (administrador) → tudo
 *  auxiliar                  → vê alunos, aulas, presenças e se cada aluno pagou.
 *                              Não confirma pagamentos, não cadastra nem edita
 *                              alunos/turmas e não mexe nos ajustes.
 *  aluno                     → a própria área
 */

export const ROTULOS_PERFIL: Record<PerfilUsuario, string> = {
  professor: "Professor",
  auxiliar: "Professor auxiliar",
  aluno: "Aluno",
};

/** Administrador da arena (o "professor dono") */
export const ehAdministrador = (usuario: Pick<Usuario, "perfil"> | null | undefined) =>
  usuario?.perfil === "professor";

/** Professor ou professor auxiliar: usam a área /professor */
export const ehEquipe = (usuario: Pick<Usuario, "perfil"> | null | undefined) =>
  usuario?.perfil === "professor" || usuario?.perfil === "auxiliar";

/** Perfis que entram na área da equipe */
export const PERFIS_EQUIPE: PerfilUsuario[] = ["professor", "auxiliar"];

/** Rota inicial de cada perfil — o sistema decide sozinho após o login */
export function rotaInicialDoPerfil(usuario: Pick<Usuario, "perfil">): string {
  return ehEquipe(usuario) ? "/professor" : "/aluno";
}
