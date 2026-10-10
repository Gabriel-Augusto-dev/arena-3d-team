"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { destinoAposLogin, useAutenticacao } from "@/contextos/ContextoAutenticacao";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { MolduraAcesso } from "@/componentes/navegacao/MolduraAcesso";
import { Campo, CampoData, CampoSenha } from "@/componentes/interface/Campos";
import { useColecao } from "@/ganchos/useColecao";
import { useConfiguracoes } from "@/ganchos/useConfiguracoes";
import { onde } from "@/lib/banco";
import { ROTULOS_NIVEL } from "@/servicos/regras/regrasAula";
import { Botao } from "@/componentes/interface/Botao";
import { formatarCpf, formatarMoeda, formatarTelefone } from "@/lib/utilitarios/formatadores";
import { validarDadosPessoais, type DadosPessoais, type ErrosFormulario } from "@/lib/utilitarios/validacoes";
import { descreverDiasSemana, hojeISO } from "@/lib/utilitarios/datas";

type Plano = "avulso" | "mensalista";
type Formulario = DadosPessoais & { senha: string; confirmarSenha: string; turmaId: string };

export default function PaginaCadastro() {
  const { usuario, carregando, cadastrar } = useAutenticacao();
  const avisos = useAvisos();
  const router = useRouter();
  const [dados, setDados] = useState<Formulario>({
    nome: "",
    email: "",
    cpf: "",
    dataNascimento: "",
    whatsapp: "",
    senha: "",
    confirmarSenha: "",
    turmaId: "",
  });
  const [plano, setPlano] = useState<Plano | null>(null);
  const [erros, setErros] = useState<ErrosFormulario<Formulario & { plano: string }>>({});
  const { dados: turmas } = useColecao("turmas", [onde("ativa", "==", true)]);
  const { configuracoes } = useConfiguracoes();
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    // Durante o cadastro a sessão já existe: espera terminar (e-mail de confirmação) antes de sair da tela
    if (!carregando && usuario && !enviando) router.replace(destinoAposLogin(usuario));
  }, [carregando, usuario, router, enviando]);

  const alterar = (campo: keyof Formulario, valor: string) => {
    setDados((d) => ({ ...d, [campo]: valor }));
    if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }));
  };

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const novosErros: ErrosFormulario<Formulario & { plano: string }> = validarDadosPessoais(dados);
    if (!plano) novosErros.plano = "Escolha como você vai treinar";
    if (plano === "mensalista" && !dados.turmaId) novosErros.turmaId = "Escolha sua turma";
    if (dados.senha.length < 6) novosErros.senha = "Mínimo de 6 caracteres";
    if (dados.confirmarSenha !== dados.senha) novosErros.confirmarSenha = "As senhas não conferem";
    setErros(novosErros);
    if (Object.keys(novosErros).length) return;

    setEnviando(true);
    try {
      const perfil = await cadastrar({ ...dados, plano: plano!, turmaId: plano === "mensalista" ? dados.turmaId : null });
      avisos.sucesso("Conta criada! Confirme seu e-mail para entrar");
      router.replace(destinoAposLogin(perfil));
    } catch (e) {
      avisos.erro(e);
      setEnviando(false);
    }
  };

  return (
    <MolduraAcesso
      titulo="Primeira vez aqui?"
      subtitulo="Crie sua conta e marque presença nas aulas pelo celular."
    >
      <h2 className="font-titulo text-3xl font-extrabold italic uppercase">Criar conta</h2>
      <p className="mt-1 text-[15px] text-suave">Seus dados ficam só com o professor.</p>

      <form onSubmit={enviar} className="mt-6 flex flex-col gap-4" noValidate>
        <Campo
          rotulo="Nome completo"
          autoComplete="name"
          value={dados.nome}
          onChange={(e) => alterar("nome", e.target.value)}
          erro={erros.nome}
        />
        <Campo
          rotulo="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={dados.email}
          onChange={(e) => alterar("email", e.target.value)}
          erro={erros.email}
        />
        <div className="grid grid-cols-2 gap-3">
          <Campo
            rotulo="CPF"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={formatarCpf(dados.cpf)}
            onChange={(e) => alterar("cpf", e.target.value)}
            erro={erros.cpf}
          />
          <CampoData
            rotulo="Nascimento"
            max={hojeISO()}
            valor={dados.dataNascimento}
            aoMudar={(iso) => alterar("dataNascimento", iso)}
            erro={erros.dataNascimento}
          />
        </div>
        <Campo
          rotulo="WhatsApp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 98765-4321"
          value={formatarTelefone(dados.whatsapp)}
          onChange={(e) => alterar("whatsapp", e.target.value)}
          erro={erros.whatsapp}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-semibold">Como você vai treinar?</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                {
                  valor: "avulso",
                  titulo: "Day Use",
                  texto: `${formatarMoeda(configuracoes.valorDayUse)} por aula, paga só quando for`,
                },
                { valor: "mensalista", titulo: "Mensalista", texto: "Mensalidade fixa, aulas da sua turma sem custo" },
              ] as const
            ).map((opcao) => {
              const ativo = plano === opcao.valor;
              return (
                <button
                  key={opcao.valor}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => {
                    setPlano(opcao.valor);
                    setErros((e) => ({ ...e, plano: undefined }));
                  }}
                  className={`rounded-2xl p-3.5 text-left transition ${
                    ativo ? "bg-marinho-900 text-white" : "bg-white ring-1 ring-inset ring-linha hover:bg-marinho-50"
                  }`}
                >
                  <span className="block font-titulo text-xl font-bold">{opcao.titulo}</span>
                  <span className={`mt-0.5 block text-[13px] leading-snug ${ativo ? "text-marinho-100" : "text-suave"}`}>
                    {opcao.texto}
                  </span>
                </button>
              );
            })}
          </div>
          {erros.plano && <p className="text-[13px] font-medium text-erro">{erros.plano}</p>}
        </fieldset>

        {plano === "mensalista" && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-semibold">Sua turma</legend>
            {turmas.length === 0 ? (
              <p className="rounded-xl bg-alerta-fundo px-3.5 py-2.5 text-sm text-alerta">
                Nenhuma turma aberta no momento. Escolha Day Use ou fale com o professor.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {[...turmas]
                  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                  .map((turma) => {
                    const ativa = dados.turmaId === turma.id;
                    return (
                      <button
                        key={turma.id}
                        type="button"
                        aria-pressed={ativa}
                        onClick={() => alterar("turmaId", turma.id)}
                        className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition ${
                          ativa ? "bg-marinho-900 text-white" : "bg-white ring-1 ring-inset ring-linha hover:bg-marinho-50"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block font-titulo text-lg font-bold leading-tight">{turma.nome}</span>
                          <span className={`numeros block text-[13px] ${ativa ? "text-marinho-100" : "text-suave"}`}>
                            {descreverDiasSemana(turma.diasSemana)}, {turma.horarioInicio} às {turma.horarioFim}
                            {ROTULOS_NIVEL[turma.nivel] !== turma.nome ? ` · ${ROTULOS_NIVEL[turma.nivel]}` : ""}
                          </span>
                        </span>
                        <span className={`numeros shrink-0 font-semibold ${ativa ? "text-laranja-400" : "text-tinta"}`}>
                          {formatarMoeda(turma.valorMensalidade)}
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}
            {erros.turmaId && <p className="text-[13px] font-medium text-erro">{erros.turmaId}</p>}
            <p className="text-[13px] text-suave">
              Depois de criar a conta, pague a 1ª mensalidade pelo PIX. Para trocar de turma ou de plano depois, fale com
              o professor.
            </p>
          </fieldset>
        )}

        <CampoSenha
          rotulo="Senha"
          autoComplete="new-password"
          value={dados.senha}
          onChange={(e) => alterar("senha", e.target.value)}
          erro={erros.senha}
          dica="Mínimo de 6 caracteres"
        />
        <CampoSenha
          rotulo="Confirme a senha"
          autoComplete="new-password"
          value={dados.confirmarSenha}
          onChange={(e) => alterar("confirmarSenha", e.target.value)}
          erro={erros.confirmarSenha}
        />
        <Botao type="submit" tamanho="grande" larguraTotal carregando={enviando} className="mt-1">
          Criar conta
        </Botao>
      </form>

      <p className="mt-6 text-center text-[15px] text-suave">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-marinho-600 hover:text-marinho-800">
          Entrar
        </Link>
      </p>
    </MolduraAcesso>
  );
}
