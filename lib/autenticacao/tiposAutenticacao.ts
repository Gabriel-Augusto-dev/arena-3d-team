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

/** Perfil completo de uma conta criada pelo professor (aluno ou professor auxiliar) */
export type DadosPerfilConta = Omit<Usuario, "id" | "criadoEm" | "atualizadoEm"> & {
  perfil: "aluno" | "auxiliar";
};

export interface ResultadoNovaConta {
  uid: string;
  /** false = o e-mail não saiu (Brevo não configurado ou falhou) */
  emailEnviado: boolean;
  /** Link para a pessoa criar a senha — só vem quando o e-mail não saiu */
  linkSenha: string | null;
}

/**
 * Contrato de autenticação. O sistema descobre o perfil da pessoa
 * (professor, auxiliar ou aluno) lendo o campo `perfil` do documento
 * `usuarios/{uid}` — ninguém escolhe o perfil na tela de login.
 */
export interface AdaptadorAutenticacao {
  /** Retorna o uid da conta autenticada */
  entrar(email: string, senha: string): Promise<string>;

  /** Cadastro feito pelo próprio aluno. Cria a conta e o documento em `usuarios` */
  cadastrarAluno(dados: DadosNovaConta): Promise<string>;

  /**
   * Cadastro feito pelo professor (aluno ou professor auxiliar), pelo servidor.
   * A pessoa recebe um e-mail para criar a própria senha.
   */
  criarContaPeloProfessor(perfil: DadosPerfilConta): Promise<ResultadoNovaConta>;

  /** Professor reenvia o e-mail de acesso (link para criar/trocar a senha) */
  reenviarAcesso(uid: string): Promise<ResultadoNovaConta>;

  sair(): Promise<void>;

  enviarRedefinicaoSenha(email: string): Promise<void>;

  /** Confere o código do link de senha e devolve o e-mail da conta */
  verificarCodigoSenha(codigo: string): Promise<string>;

  /** Grava a senha nova a partir do código do link */
  definirSenha(codigo: string, novaSenha: string): Promise<void>;

  /** Aplica o código do link de confirmação de e-mail e devolve o e-mail confirmado */
  confirmarEmail(codigo: string): Promise<string>;

  /** Avisa sempre que a sessão muda. Recebe o uid ou null */
  observarSessao(aoMudar: (uid: string | null) => void): () => void;
}

export class ErroAutenticacao extends Error {}
