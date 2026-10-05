import type { Usuario } from "@/tipos";

export interface DadosNovaConta {
  nome: string;
  email: string;
  senha: string;
  cpf: string;
  dataNascimento: string;
  whatsapp: string;
  /** Escolhido pelo próprio aluno no cadastro. Depois, só o professor altera */
  plano: "mensalista" | "avulso";
  /** Turma escolhida (obrigatória para mensalista) */
  turmaId: string | null;
}

/** Dados do perfil do aluno criados pelo professor (sem senha) */
export type DadosPerfilAluno = Omit<Usuario, "id" | "criadoEm" | "atualizadoEm">;

/**
 * Contrato de autenticação. O sistema descobre se a pessoa é professor
 * ou aluno lendo o campo `perfil` do documento `usuarios/{uid}` —
 * ninguém escolhe o perfil na tela de login.
 */
export interface AdaptadorAutenticacao {
  /** Retorna o uid da conta autenticada */
  entrar(email: string, senha: string): Promise<string>;

  /** Cadastro feito pelo próprio aluno. Cria a conta e o documento em `usuarios` */
  cadastrarAluno(dados: DadosNovaConta): Promise<string>;

  /** Cadastro feito pelo professor, sem trocar a sessão dele */
  criarContaPeloProfessor(perfil: DadosPerfilAluno, senhaInicial: string): Promise<string>;

  sair(): Promise<void>;

  enviarRedefinicaoSenha(email: string): Promise<void>;

  /** Avisa sempre que a sessão muda. Recebe o uid ou null */
  observarSessao(aoMudar: (uid: string | null) => void): () => void;
}

export class ErroAutenticacao extends Error {}
