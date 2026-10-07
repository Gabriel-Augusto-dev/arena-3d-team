"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, MessageCircle, Pencil } from "lucide-react";
import { useAutenticacao } from "@/contextos/ContextoAutenticacao";
import { useDadosAluno } from "@/contextos/ContextoDadosAluno";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { Avatar, Cartao, LinhaInfo, Selo, TituloPagina, TituloSecao } from "@/componentes/interface/Elementos";
import { Botao } from "@/componentes/interface/Botao";
import { Campo } from "@/componentes/interface/Campos";
import { Folha } from "@/componentes/interface/Folha";
import { descreverDiasSemana, formatarData, hojeISO } from "@/lib/utilitarios/datas";
import { calcularIdade, formatarCpf, formatarMoeda, formatarTelefone, linkWhatsapp } from "@/lib/utilitarios/formatadores";
import { validarTelefone } from "@/lib/utilitarios/validacoes";
import { TONS_MENSALIDADE } from "@/lib/rotulos";
import { ROTULOS_NIVEL } from "@/servicos/regras/regrasAula";
import { atualizarMeuPerfil } from "@/servicos/servicoAlunos";

export default function PerfilAluno() {
  const { aluno, mensalidades, configuracoes } = useDadosAluno();
  const { sair } = useAutenticacao();
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const idade = calcularIdade(aluno.dataNascimento);

  const encerrar = async () => {
    await sair();
    router.replace("/entrar");
  };

  return (
    <>
      <TituloPagina titulo="Perfil" />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <Cartao className="flex items-center gap-4">
            <Avatar nome={aluno.nome} tamanho="grande" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-titulo text-xl font-bold">{aluno.nome}</p>
              <p className="truncate text-sm text-suave">{aluno.email}</p>
            </div>
            <Botao variante="secundario" tamanho="pequeno" icone={Pencil} onClick={() => setEditando(true)}>
              Editar
            </Botao>
          </Cartao>

          <section>
            <TituloSecao titulo="Dados pessoais" />
            <Cartao>
              <dl className="divide-y divide-linha/70">
                <LinhaInfo rotulo="Nome" valor={aluno.nome} />
                <LinhaInfo rotulo="CPF" valor={formatarCpf(aluno.cpf)} />
                <LinhaInfo
                  rotulo="Nascimento"
                  valor={aluno.dataNascimento ? `${formatarData(aluno.dataNascimento)}${idade !== null ? ` (${idade} anos)` : ""}` : "—"}
                />
                <LinhaInfo rotulo="WhatsApp" valor={formatarTelefone(aluno.whatsapp)} />
              </dl>
            </Cartao>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section>
            <TituloSecao titulo="Mensalidade e turma" />
            <Cartao>
              <dl className="divide-y divide-linha/70">
                <LinhaInfo
                  rotulo="Plano"
                  valor={
                    <Selo tom={aluno.plano === "mensalista" ? "escuro" : "azul"}>
                      {aluno.plano === "mensalista" ? "Mensalista" : "Avulso"}
                    </Selo>
                  }
                />
                {mensalidades.length ? (
                  mensalidades.map(({ turma, situacao, valor }) => (
                    <Fragment key={turma.id}>
                      <LinhaInfo rotulo="Turma" valor={`${turma.nome} (${ROTULOS_NIVEL[turma.nivel]})`} />
                      <LinhaInfo
                        rotulo="Dias e horário"
                        valor={`${descreverDiasSemana(turma.diasSemana)}, ${turma.horarioInicio} às ${turma.horarioFim}`}
                      />
                      {turma.responsavelNome && <LinhaInfo rotulo="Professor" valor={turma.responsavelNome} />}
                      <LinhaInfo rotulo="Valor" valor={formatarMoeda(valor)} />
                      <LinhaInfo
                        rotulo="Situação"
                        valor={<Selo tom={TONS_MENSALIDADE[situacao.status]}>{situacao.rotulo}</Selo>}
                      />
                      <LinhaInfo rotulo="Válida até" valor={formatarData(situacao.validade)} />
                    </Fragment>
                  ))
                ) : (
                  <LinhaInfo rotulo="Day Use" valor={formatarMoeda(configuracoes.valorDayUse)} />
                )}
              </dl>
            </Cartao>
          </section>

          <div className="flex flex-col gap-2">
            {configuracoes.whatsappContato && (
              <a
                href={linkWhatsapp(configuracoes.whatsappContato, `Olá! Sou ${aluno.nome}, aluno(a) da ${configuracoes.nomeArena}.`)}
                target="_blank"
                rel="noreferrer"
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white font-semibold ring-1 ring-linha hover:bg-marinho-50"
              >
                <MessageCircle className="size-5 text-ok" />
                Falar com o professor
              </a>
            )}
            <Botao variante="perigo" tamanho="grande" icone={LogOut} larguraTotal onClick={encerrar}>
              Sair da conta
            </Botao>
          </div>
        </div>
      </div>

      {editando && <FolhaEditarPerfil aoFechar={() => setEditando(false)} />}
    </>
  );
}

function FolhaEditarPerfil({ aoFechar }: { aoFechar(): void }) {
  const { aluno } = useDadosAluno();
  const avisos = useAvisos();
  const [nome, setNome] = useState(aluno.nome);
  const [whatsapp, setWhatsapp] = useState(aluno.whatsapp);
  const [dataNascimento, setDataNascimento] = useState(aluno.dataNascimento);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<{ nome?: string; whatsapp?: string }>({});

  const salvar = async () => {
    const novos: typeof erros = {};
    if (nome.trim().split(/\s+/).length < 2) novos.nome = "Informe nome e sobrenome";
    if (!validarTelefone(whatsapp)) novos.whatsapp = "WhatsApp com DDD";
    setErros(novos);
    if (Object.keys(novos).length) return;
    setSalvando(true);
    try {
      await atualizarMeuPerfil(aluno, { nome, whatsapp, dataNascimento });
      avisos.sucesso("Dados atualizados");
      aoFechar();
    } catch (erro) {
      avisos.erro(erro);
      setSalvando(false);
    }
  };

  return (
    <Folha
      aberta
      aoFechar={aoFechar}
      titulo="Editar dados"
      descricao="E-mail e CPF só podem ser alterados pelo professor."
      rodape={
        <Botao tamanho="grande" larguraTotal carregando={salvando} onClick={salvar}>
          Salvar alterações
        </Botao>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo rotulo="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} />
        <Campo
          rotulo="WhatsApp"
          type="tel"
          inputMode="tel"
          value={formatarTelefone(whatsapp)}
          onChange={(e) => setWhatsapp(e.target.value)}
          erro={erros.whatsapp}
        />
        <Campo
          rotulo="Data de nascimento"
          type="date"
          max={hojeISO()}
          value={dataNascimento}
          onChange={(e) => setDataNascimento(e.target.value)}
        />
      </div>
    </Folha>
  );
}
