"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { autenticacao } from "@/lib/autenticacao";
import { destinoAposLogin, useAutenticacao } from "@/contextos/ContextoAutenticacao";
import { MolduraAcesso } from "@/componentes/navegacao/MolduraAcesso";
import { CampoSenha } from "@/componentes/interface/Campos";
import { Botao, BotaoLink } from "@/componentes/interface/Botao";
import { Carregando } from "@/componentes/interface/Elementos";

/**
 * Tela aberta pelo link do e-mail (conta criada pelo professor ou
 * "Esqueci minha senha"). A pessoa cria a senha e já entra no app.
 */
export default function PaginaCriarSenha() {
  return (
    <MolduraAcesso titulo="Sua senha" subtitulo="Crie a senha que você vai usar para entrar no app.">
      <Suspense fallback={<Carregando />}>
        <FormularioSenha />
      </Suspense>
    </MolduraAcesso>
  );
}

type Estado = { tipo: "conferindo" } | { tipo: "valido"; email: string } | { tipo: "invalido"; mensagem: string };

function FormularioSenha() {
  const codigo = useSearchParams().get("codigo") ?? "";
  const { entrar, sair, usuario } = useAutenticacao();
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ tipo: "conferindo" });
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    const conferir = codigo
      ? autenticacao.verificarCodigoSenha(codigo)
      : Promise.reject(new Error("Link incompleto. Abra de novo o link do e-mail"));
    conferir
      .then((email) => ativo && setEstado({ tipo: "valido", email }))
      .catch((e: unknown) =>
        ativo && setEstado({ tipo: "invalido", mensagem: e instanceof Error ? e.message : "Link inválido" }),
      );
    return () => {
      ativo = false;
    };
  }, [codigo]);

  const salvar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (estado.tipo !== "valido") return;
    setErro("");
    if (senha.length < 6) return setErro("A senha precisa ter pelo menos 6 caracteres");
    if (senha !== confirmar) return setErro("As senhas não conferem");
    setSalvando(true);
    try {
      await autenticacao.definirSenha(codigo, senha);
      // Se havia outra pessoa logada neste aparelho, troca a sessão
      if (usuario && usuario.email !== estado.email) await sair();
      const perfil = await entrar(estado.email, senha);
      router.replace(destinoAposLogin(perfil));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar a senha");
      setSalvando(false);
    }
  };

  if (estado.tipo === "conferindo") return <Carregando texto="Conferindo o link…" />;

  if (estado.tipo === "invalido") {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="font-titulo text-3xl font-extrabold italic uppercase">Link expirado</h2>
        <p role="alert" className="rounded-xl bg-erro-fundo px-3.5 py-2.5 text-sm font-medium text-erro">
          {estado.mensagem}
        </p>
        <p className="text-[15px] text-suave">
          Na tela de entrada, digite seu e-mail e toque em <strong>Esqueci minha senha</strong> para receber um link
          novo.
        </p>
        <BotaoLink href="/entrar" tamanho="grande" larguraTotal>
          Ir para a entrada
        </BotaoLink>
      </div>
    );
  }

  return (
    <>
      <h2 className="font-titulo text-3xl font-extrabold italic uppercase">Criar senha</h2>
      <p className="mt-1 break-all text-[15px] text-suave">
        Conta: <strong className="text-tinta">{estado.email}</strong>
      </p>

      <form onSubmit={salvar} className="mt-6 flex flex-col gap-4" noValidate>
        <CampoSenha
          rotulo="Senha nova"
          autoComplete="new-password"
          placeholder="Mínimo de 6 caracteres"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <CampoSenha
          rotulo="Repita a senha"
          autoComplete="new-password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
        />
        {erro && (
          <p role="alert" className="rounded-xl bg-erro-fundo px-3.5 py-2.5 text-sm font-medium text-erro">
            {erro}
          </p>
        )}
        <Botao type="submit" tamanho="grande" larguraTotal carregando={salvando}>
          Salvar e entrar
        </Botao>
      </form>
    </>
  );
}
