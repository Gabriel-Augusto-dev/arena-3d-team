"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { rotaInicialDoPerfil, useAutenticacao } from "@/contextos/ContextoAutenticacao";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { autenticacao } from "@/lib/autenticacao";
import { firebaseAtivo } from "@/lib/firebase/configuracao";
import { SENHA_DEMONSTRACAO } from "@/lib/dados/dadosIniciais";
import { validarEmail } from "@/lib/utilitarios/validacoes";
import { MolduraAcesso } from "@/componentes/navegacao/MolduraAcesso";
import { Campo, CampoSenha } from "@/componentes/interface/Campos";
import { Botao } from "@/componentes/interface/Botao";

const CONTAS_DEMONSTRACAO = [
  { rotulo: "Professor", email: "professor@arena3d.com" },
  { rotulo: "Aluna em dia", email: "aluno@arena3d.com" },
  { rotulo: "Mensalidade atrasada", email: "bruno@arena3d.com" },
  { rotulo: "Avulsa nova", email: "carla@arena3d.com" },
  { rotulo: "Day Use em atraso", email: "gabriela@arena3d.com" },
  { rotulo: "Avulso a pagar", email: "marcos@arena3d.com" },
];

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

  // Já logado? Vai direto para a área certa
  useEffect(() => {
    if (!carregando && usuario) router.replace(rotaInicialDoPerfil(usuario));
  }, [carregando, usuario, router]);

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErro("");
    if (!validarEmail(email)) return setErro("Digite um e-mail válido");
    if (!senha) return setErro("Digite sua senha");
    setEnviando(true);
    try {
      const perfil = await entrar(email, senha);
      router.replace(rotaInicialDoPerfil(perfil));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível entrar");
      setEnviando(false);
    }
  };

  const esqueciSenha = async () => {
    if (!validarEmail(email)) return setErro("Digite seu e-mail acima para receber o link");
    try {
      await autenticacao.enviarRedefinicaoSenha(email);
      avisos.sucesso("Enviamos um link de redefinição para o seu e-mail");
    } catch (e) {
      avisos.erro(e);
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
          <button type="button" onClick={esqueciSenha} className="text-sm font-semibold text-marinho-600 hover:text-marinho-800">
            Esqueci minha senha
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

      {!firebaseAtivo && (
        <div className="mt-8 rounded-3xl border border-dashed border-areia-400 bg-areia-50 p-4">
          
          
          <div className="mt-3 grid grid-cols-2 gap-2">
            {CONTAS_DEMONSTRACAO.map((conta) => (
              <button
                key={conta.email}
                type="button"
                onClick={() => {
                  setEmail(conta.email);
                  setSenha(SENHA_DEMONSTRACAO);
                  setErro("");
                }}
                className="rounded-xl bg-white px-3 py-2 text-left ring-1 ring-linha transition hover:ring-marinho-200"
              >
                <span className="block text-[13px] font-semibold">{conta.rotulo}</span>
                <span className="block truncate text-xs text-suave">{conta.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </MolduraAcesso>
  );
}
