"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut, Pencil, UsersRound } from "lucide-react";
import { useAutenticacao, useUsuarioLogado } from "@/contextos/ContextoAutenticacao";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { Avatar, Carregando, Cartao, TituloPagina, TituloSecao } from "@/componentes/interface/Elementos";
import { Botao } from "@/componentes/interface/Botao";
import { Campo } from "@/componentes/interface/Campos";
import { Folha } from "@/componentes/interface/Folha";
import { PainelPix } from "@/componentes/pagamentos/PainelPix";
import { chamarApi } from "@/lib/api/cliente";
import { validarEmail, validarTelefone } from "@/lib/utilitarios/validacoes";
import Link from "next/link";
import { formatarTelefone, somenteNumeros } from "@/lib/utilitarios/formatadores";
import { normalizarChavePix } from "@/lib/utilitarios/pix";
import { salvarConfiguracoes } from "@/servicos/servicoConfiguracoes";
import type { Configuracoes } from "@/tipos";

type Formulario = Omit<Configuracoes, "id" | "atualizadoEm">;

export default function ConfiguracoesProfessor() {
  const { configuracoes, carregando } = useDadosProfessor();
  // Espera carregar para o formulário não começar com valores padrão
  if (carregando) return <Carregando />;
  return <FormularioAjustes configuracoes={configuracoes} />;
}

function FormularioAjustes({ configuracoes }: { configuracoes: Configuracoes }) {
  const professor = useUsuarioLogado();
  const { sair } = useAutenticacao();
  const avisos = useAvisos();
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [editandoConta, setEditandoConta] = useState(false);
  const [dados, setDados] = useState<Formulario>(() => {
    const { id: _id, atualizadoEm: _atualizado, ...resto } = configuracoes;
    void _id;
    void _atualizado;
    return resto;
  });

  const alterar = <C extends keyof Formulario>(campo: C, valor: Formulario[C]) =>
    setDados((d) => ({ ...d, [campo]: valor }));

  const salvar = async () => {
    if (dados.valorDayUse <= 0) return avisos.erro("O valor do Day Use precisa ser maior que zero");
    if (dados.diasCicloMensalidade < 1) return avisos.erro("O ciclo precisa ter pelo menos 1 dia");
    if (dados.valorMensalidadeAssociado < 0) {
      return avisos.erro("O valor não pode ser negativo");
    }
    setSalvando(true);
    try {
      const chavePix = normalizarChavePix(dados.chavePix);
      setDados((d) => ({ ...d, chavePix }));
      await salvarConfiguracoes({ ...dados, chavePix, whatsappContato: somenteNumeros(dados.whatsappContato) });
      avisos.sucesso("Configurações salvas");
    } catch (erro) {
      avisos.erro(erro);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <TituloPagina titulo="Ajustes" subtitulo="PIX, valores, equipe e dados da arena" />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="flex flex-col gap-6">
          <section>
            <TituloSecao titulo="Recebimento via PIX" />
            <Cartao className="flex flex-col gap-4">
              <Campo
                rotulo="Chave PIX"
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                value={dados.chavePix}
                onChange={(e) => alterar("chavePix", e.target.value)}
                dica="Pode digitar com pontos e traços: ao salvar, o app ajusta o formato (CPF/CNPJ só números, telefone com +55)"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                  rotulo="Nome do recebedor"
                  value={dados.nomeRecebedorPix}
                  onChange={(e) => alterar("nomeRecebedorPix", e.target.value)}
                  maxLength={25}
                />
                <Campo
                  rotulo="Cidade"
                  value={dados.cidadeRecebedorPix}
                  onChange={(e) => alterar("cidadeRecebedorPix", e.target.value)}
                  maxLength={15}
                />
              </div>
            </Cartao>
          </section>

          <section>
            <TituloSecao titulo="Valores e regras" />
            <Cartao className="grid gap-4 sm:grid-cols-2">
              <Campo
                rotulo="Day Use (R$)"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={dados.valorDayUse}
                onChange={(e) => alterar("valorDayUse", Number(e.target.value))}
              />
              <Campo
                rotulo="Mensalidade padrão (R$)"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={dados.valorMensalidadePadrao}
                onChange={(e) => alterar("valorMensalidadePadrao", Number(e.target.value))}
                dica="Sugerido ao criar turmas"
              />
              <Campo
                rotulo="Mensalidade associado (R$)"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={dados.valorMensalidadeAssociado || ""}
                onChange={(e) => alterar("valorMensalidadeAssociado", Number(e.target.value) || 0)}
              />
              <Campo
                rotulo="Dias de cada ciclo"
                type="number"
                min={1}
                inputMode="numeric"
                value={dados.diasCicloMensalidade}
                onChange={(e) => alterar("diasCicloMensalidade", Number(e.target.value))}
                dica="Acesso liberado após confirmar a mensalidade"
              />
              <Campo
                rotulo="WhatsApp da arena"
                type="tel"
                value={formatarTelefone(dados.whatsappContato)}
                onChange={(e) => alterar("whatsappContato", e.target.value)}
                dica="Botão “Falar com o professor” dos alunos"
              />
              <Campo
                className="sm:col-span-2"
                rotulo="Nome da equipe"
                value={dados.nomeArena}
                onChange={(e) => alterar("nomeArena", e.target.value)}
              />
            </Cartao>
          </section>

          <Botao tamanho="grande" larguraTotal carregando={salvando} onClick={salvar}>
            Salvar ajustes
          </Botao>

          <section>
            <TituloSecao titulo="Equipe" />
            <Link
              href="/professor/equipe"
              className="flex items-center gap-3 rounded-3xl bg-white p-4 ring-1 ring-linha/70 transition hover:ring-marinho-200"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-marinho-100 text-marinho-700">
                <UsersRound className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Professores auxiliares</span>
                <span className="block text-sm text-suave">Cadastro, aulas de cada um e cálculo do repasse</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-suave" />
            </Link>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section>
            <TituloSecao titulo="Como o aluno vê o PIX" />
            <PainelPix
              configuracoes={{ ...configuracoes, ...dados }}
              valor={dados.valorDayUse}
              identificador="PREVIA"
              descricao="Day Use"
              mostrarPassos={false}
            />
          </section>

          <Cartao className="flex items-center gap-3">
            <Avatar nome={professor.nome} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{professor.nome}</p>
              <p className="truncate text-sm text-suave">{professor.email}</p>
            </div>
            <Botao variante="secundario" tamanho="pequeno" icone={Pencil} onClick={() => setEditandoConta(true)}>
              Editar
            </Botao>
            <Botao
              variante="perigo"
              tamanho="pequeno"
              icone={LogOut}
              onClick={async () => {
                await sair();
                router.replace("/entrar");
              }}
            >
              Sair
            </Botao>
          </Cartao>
        </aside>
      </div>

      {editandoConta && <FolhaMeusDados aoFechar={() => setEditandoConta(false)} />}
    </>
  );
}

interface RespostaMeusDados {
  emailMudou: boolean;
  emailEnviado: boolean;
  linkSenha: string | null;
}

/** O professor responsável edita nome, e-mail (login) e WhatsApp da própria conta */
function FolhaMeusDados({ aoFechar }: { aoFechar(): void }) {
  const professor = useUsuarioLogado();
  const { sair } = useAutenticacao();
  const avisos = useAvisos();
  const router = useRouter();
  const [nome, setNome] = useState(professor.nome);
  const [email, setEmail] = useState(professor.email);
  const [whatsapp, setWhatsapp] = useState(professor.whatsapp ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<{ nome?: string; email?: string; whatsapp?: string }>({});
  const [resultado, setResultado] = useState<RespostaMeusDados | null>(null);

  const emailMudou = email.trim().toLowerCase() !== professor.email.trim().toLowerCase();

  const encerrar = async () => {
    await sair().catch(() => undefined);
    router.replace("/entrar");
  };

  const salvar = async () => {
    const novos: typeof erros = {};
    if (nome.trim().split(/\s+/).length < 2) novos.nome = "Informe nome e sobrenome";
    if (!validarEmail(email)) novos.email = "E-mail inválido";
    if (whatsapp.trim() && !validarTelefone(whatsapp)) novos.whatsapp = "WhatsApp com DDD";
    setErros(novos);
    if (Object.keys(novos).length) return;
    setSalvando(true);
    try {
      const resposta = await chamarApi<RespostaMeusDados>("/api/contas/meus-dados", {
        nome,
        email,
        whatsapp: somenteNumeros(whatsapp),
      });
      if (!resposta.emailMudou) {
        avisos.sucesso("Dados atualizados");
        aoFechar();
        return;
      }
      setResultado(resposta);
    } catch (erro) {
      avisos.erro(erro);
    } finally {
      setSalvando(false);
    }
  };

  if (resultado) {
    return (
      <Folha
        aberta
        aoFechar={encerrar}
        titulo="E-mail de acesso alterado"
        rodape={
          <Botao tamanho="grande" larguraTotal onClick={encerrar}>
            Entendi, sair
          </Botao>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          <p>
            Agora o login da conta de professor é <strong>{email.trim().toLowerCase()}</strong>. A senha antiga deixou de
            valer e esta sessão será encerrada.
          </p>
          {resultado.emailEnviado ? (
            <p>Enviamos para esse e-mail o link para criar a nova senha (vale por 1 hora).</p>
          ) : (
            <>
              <p>
                Não foi possível enviar o e-mail. Copie o link abaixo e mande para o novo professor criar a senha (vale
                por 1 hora). Se expirar, use “Esqueci minha senha” na tela de entrar.
              </p>
              {resultado.linkSenha && (
                <Botao
                  variante="secundario"
                  larguraTotal
                  onClick={async () => {
                    await navigator.clipboard.writeText(resultado.linkSenha ?? "");
                    avisos.sucesso("Link copiado");
                  }}
                >
                  Copiar link
                </Botao>
              )}
            </>
          )}
        </div>
      </Folha>
    );
  }

  return (
    <Folha
      aberta
      aoFechar={aoFechar}
      titulo="Meus dados"
      descricao="Dados da conta de professor responsável"
      rodape={
        <Botao tamanho="grande" larguraTotal carregando={salvando} onClick={salvar}>
          Salvar
        </Botao>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} />
        <Campo
          rotulo="E-mail (login)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          erro={erros.email}
          dica={
            emailMudou
              ? "Ao salvar, o login passa a ser este e-mail: a senha atual deixa de valer e chega nele um link para criar a nova senha"
              : undefined
          }
        />
        <Campo
          rotulo="WhatsApp"
          type="tel"
          value={formatarTelefone(whatsapp)}
          onChange={(e) => setWhatsapp(e.target.value)}
          erro={erros.whatsapp}
        />
      </div>
    </Folha>
  );
}
