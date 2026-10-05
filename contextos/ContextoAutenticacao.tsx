"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { autenticacao, ErroAutenticacao, type DadosNovaConta } from "@/lib/autenticacao";
import { banco } from "@/lib/banco";
import type { Usuario } from "@/tipos";
import { notificarNovoCadastro } from "@/servicos/servicoNotificacoes";

interface ValorAutenticacao {
  usuario: Usuario | null;
  /** true até sabermos se há sessão e carregarmos o documento do usuário */
  carregando: boolean;
  ehProfessor: boolean;
  entrar(email: string, senha: string): Promise<Usuario>;
  cadastrar(dados: DadosNovaConta): Promise<Usuario>;
  sair(): Promise<void>;
}

const ContextoAutenticacao = createContext<ValorAutenticacao | null>(null);

/** Rota inicial de cada perfil — o sistema decide sozinho após o login */
export function rotaInicialDoPerfil(usuario: Usuario): string {
  return usuario.perfil === "professor" ? "/professor" : "/aluno";
}

/**
 * Link aberto sem estar logado (ex.: link de presença enviado no WhatsApp):
 * guardamos o endereço para voltar a ele depois do login/cadastro.
 */
const CHAVE_DESTINO = "arena3d:destino";

export function guardarDestino(caminho: string) {
  try {
    window.sessionStorage.setItem(CHAVE_DESTINO, caminho);
  } catch {
    /* navegador sem sessionStorage: segue sem lembrar o destino */
  }
}

/** Chamado quando o usuário já chegou na área logada */
export function limparDestino() {
  try {
    window.sessionStorage.removeItem(CHAVE_DESTINO);
  } catch {
    /* ignora */
  }
}

/** Para onde ir depois de entrar: o link guardado (se for da área do usuário) ou a tela inicial */
export function destinoAposLogin(usuario: Usuario): string {
  const inicial = rotaInicialDoPerfil(usuario);
  try {
    const guardado = window.sessionStorage.getItem(CHAVE_DESTINO);
    if (guardado && guardado.startsWith(inicial) && !guardado.startsWith("//")) return guardado;
  } catch {
    /* ignora */
  }
  return inicial;
}

export function ProvedorAutenticacao({ children }: { children: React.ReactNode }) {
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  const [usuarioCarregado, setUsuarioCarregado] = useState<{ uid: string; usuario: Usuario | null } | null>(null);

  useEffect(() => autenticacao.observarSessao(setUid), []);

  useEffect(() => {
    if (!uid) return;
    return banco.observarDocumento("usuarios", uid, (usuario) => setUsuarioCarregado({ uid, usuario }));
  }, [uid]);

  const usuario = uid && usuarioCarregado?.uid === uid ? usuarioCarregado.usuario : null;
  const carregando = uid === undefined || (!!uid && usuarioCarregado?.uid !== uid);

  const entrar = useCallback(async (email: string, senha: string) => {
    const novoUid = await autenticacao.entrar(email, senha);
    const perfil = await banco.obter("usuarios", novoUid);
    if (!perfil) {
      await autenticacao.sair();
      throw new ErroAutenticacao("Conta sem cadastro na arena. Fale com o professor");
    }
    if (!perfil.ativo) {
      await autenticacao.sair();
      throw new ErroAutenticacao("Sua conta está desativada. Fale com o professor");
    }
    return perfil;
  }, []);

  const cadastrar = useCallback(async (dados: DadosNovaConta) => {
    const novoUid = await autenticacao.cadastrarAluno(dados);
    const perfil = await banco.obter("usuarios", novoUid);
    if (!perfil) throw new ErroAutenticacao("Não foi possível concluir o cadastro");
    const turma = perfil.turmaId ? await banco.obter("turmas", perfil.turmaId) : null;
    // O aviso ao professor não pode impedir o cadastro de terminar
    await notificarNovoCadastro(perfil, turma).catch(() => undefined);
    return perfil;
  }, []);

  const sair = useCallback(() => autenticacao.sair(), []);

  const valor = useMemo<ValorAutenticacao>(
    () => ({
      usuario,
      carregando,
      ehProfessor: usuario?.perfil === "professor",
      entrar,
      cadastrar,
      sair,
    }),
    [usuario, carregando, entrar, cadastrar, sair],
  );

  return <ContextoAutenticacao.Provider value={valor}>{children}</ContextoAutenticacao.Provider>;
}

export function useAutenticacao() {
  const contexto = useContext(ContextoAutenticacao);
  if (!contexto) throw new Error("useAutenticacao precisa estar dentro de ProvedorAutenticacao");
  return contexto;
}

/** Use dentro das áreas protegidas, onde o usuário com certeza existe */
export function useUsuarioLogado(): Usuario {
  const { usuario } = useAutenticacao();
  if (!usuario) throw new Error("Nenhum usuário logado");
  return usuario;
}
