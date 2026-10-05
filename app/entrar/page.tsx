"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { destinoAposLogin, useAutenticacao } from "@/contextos/ContextoAutenticacao";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { autenticacao } from "@/lib/autenticacao";
import { validarEmail } from "@/lib/utilitarios/validacoes";
import { MolduraAcesso } from "@/componentes/navegacao/MolduraAcesso";
import { Campo, CampoSenha } from "@/componentes/interface/Campos";
import { Botao } from "@/componentes/interface/Botao";

/**
 * Uma única tela de login para todos. Depois de autenticar, o sistema lê
 * o perfil do usuário e abre a área do professor ou do aluno.
 */
export default function PaginaEntrar() {
  const { usuario, carregando, entrar } = useAutenticacao();
  const avisos = useAvisos();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviandoLink, setEnviandoLink] = useState(false);

  // Já logado? Vai direto para a área certa
  useEffect(() => {
    if (!carregando && usuario?.ativo) router.replace(destinoAposLogin(usuario));
  }, [carregando, usuario, router]);

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErro("");
    if (!validarEmail(email)) return setErro("Digite um e-mail válido");
    if (!senha) return setErro("Digite sua senha");
    setEnviando(true);
    try {
      const perfil = await entrar(email, senha);
      router.replace(destinoAposLogin(perfil));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível entrar");
      setEnviando(false);
    }
  };

  const esqueciSenha = async () => {
    if (!validarEmail(email)) return setErro("Digite seu e-mail acima para receber o link");
    setErro("");
    setEnviandoLink(true);
    try {
      await autenticacao.enviarRedefinicaoSenha(email);
      avisos.sucesso("Se o e-mail estiver cadastrado, você vai receber um link para criar uma senha nova");
    } catch (e) {
      avisos.erro(e);
    } finally {
      setEnviandoLink(false);
    }
  };

  return (
    <MolduraAcesso titulo="Bora treinar" subtitulo="Marque presença nas aulas e pague pelo PIX.">
      <h2 className="font-titulo text-3xl font-extrabold italic uppercase">Entrar</h2>
      <p className="mt-1 text-[15px] text-suave">Use o e-mail cadastrado com o professor.</p>

      <form onSubmit={enviar} className="mt-6 flex flex-col gap-4" noValidate>
        <Campo
          rotulo="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          icone={Mail}
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <CampoSenha
          rotulo="Senha"
          autoComplete="current-password"
          placeholder="Sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <div className="-mt-1 flex justify-end">
          <button
            type="button"
            onClick={esqueciSenha}
            disabled={enviandoLink}
            className="text-sm font-semibold text-marinho-600 hover:text-marinho-800 disabled:opacity-50"
          >
            {enviandoLink ? "Enviando link…" : "Esqueci minha senha"}
          </button>
        </div>

        {erro && (
          <p role="alert" className="rounded-xl bg-erro-fundo px-3.5 py-2.5 text-sm font-medium text-erro">
            {erro}
          </p>
        )}

        <Botao type="submit" tamanho="grande" larguraTotal carregando={enviando}>
          Entrar
        </Botao>
      </form>

      <p className="mt-6 text-center text-[15px] text-suave">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-marinho-600 hover:text-marinho-800">
          Criar conta
        </Link>
      </p>
    </MolduraAcesso>
  );
}
