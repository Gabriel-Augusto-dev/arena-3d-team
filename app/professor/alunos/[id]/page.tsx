"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CalendarX,
  Mail,
  MessageCircle,
  Pencil,
  Power,
  Receipt,
  UserX,
} from "lucide-react";
import { onde } from "@/lib/banco";
import { useColecao } from "@/ganchos/useColecao";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { useUsuarioLogado } from "@/contextos/ContextoAutenticacao";
import { FolhaFormularioAluno } from "@/componentes/professor/FolhaFormularioAluno";
import { FolhaRegistrarPagamento } from "@/componentes/professor/FolhaRegistrarPagamento";
import { ItemPagamento } from "@/componentes/pagamentos/ItemPagamento";
import { Botao } from "@/componentes/interface/Botao";
import {
  Abas,
  Avatar,
  Carregando,
  Cartao,
  EstadoVazio,
  LinhaInfo,
  Selo,
} from "@/componentes/interface/Elementos";
import { TONS_MENSALIDADE, ROTULOS_STATUS_PRESENCA } from "@/lib/rotulos";
import { descreverDiasSemana, formatarData, formatarDataRelativa } from "@/lib/utilitarios/datas";
import {
  calcularIdade,
  formatarCpf,
  formatarMoeda,
  formatarTelefone,
  linkWhatsapp,
  primeiroNome,
} from "@/lib/utilitarios/formatadores";
import { calcularSituacaoMensalidade } from "@/servicos/regras/regrasMensalidade";
import { ROTULOS_TIPO_PRESENCA } from "@/servicos/regras/regrasAula";
import { situacaoCobranca } from "@/servicos/regras/regrasPagamento";
import { alternarAlunoAtivo } from "@/servicos/servicoAlunos";
import { confirmarPagamento } from "@/servicos/servicoPagamentos";

type Aba = "pagamentos" | "aulas";

export default function DetalheAluno() {
  const { id } = useParams<{ id: string }>();
  const professor = useUsuarioLogado();
  const { alunoPorId, turmaPorId, pagamentos, carregando } = useDadosProfessor();
  const avisos = useAvisos();
  const [aba, setAba] = useState<Aba>("pagamentos");
  const [editando, setEditando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [alternando, setAlternando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);

  // Histórico completo de presenças do aluno
  const { dados: presencasDoAluno } = useColecao("presencas", [onde("alunoId", "==", id)]);

  const aluno = alunoPorId.get(id);
  const meusPagamentos = useMemo(() => pagamentos.filter((p) => p.alunoId === id), [pagamentos, id]);
  const minhasAulas = useMemo(
    () => [...presencasDoAluno].sort((a, b) => b.dataAula.localeCompare(a.dataAula)),
    [presencasDoAluno],
  );

  if (carregando) return <Carregando />;
  if (!aluno)
    return (
      <EstadoVazio
        icone={UserX}
        titulo="Aluno não encontrado"
        acao={
          <Link href="/professor/alunos" className="font-semibold text-marinho-600">
            Voltar para alunos
          </Link>
        }
      />
    );

  const turma = aluno.turmaId ? turmaPorId.get(aluno.turmaId) : undefined;
  const situacao = calcularSituacaoMensalidade(aluno);
  const idade = calcularIdade(aluno.dataNascimento);
  const totalPago = meusPagamentos.filter((p) => p.status === "confirmado").reduce((t, p) => t + p.valor, 0);

  const alternarAtivo = async () => {
    setAlternando(true);
    try {
      await alternarAlunoAtivo(aluno);
      avisos.sucesso(aluno.ativo ? "Aluno desativado. Ele não consegue mais entrar" : "Aluno reativado");
    } catch (erro) {
      avisos.erro(erro);
    } finally {
      setAlternando(false);
    }
  };

  return (
    <>
      <Link
        href="/professor/alunos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-suave hover:text-tinta"
      >
        <ArrowLeft className="size-4" />
        Alunos
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr] lg:items-start">
        <div className="flex flex-col gap-4">
          <Cartao className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Avatar nome={aluno.nome} tamanho="grande" />
              <div className="min-w-0 flex-1">
                <h1 className="font-titulo text-2xl font-extrabold leading-tight">{aluno.nome}</h1>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Selo tom={aluno.plano === "mensalista" ? "escuro" : "azul"}>
                    {aluno.plano === "mensalista" ? "Mensalista" : "Avulso"}
                  </Selo>
                  {!aluno.ativo && <Selo tom="cinza">Inativo</Selo>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={linkWhatsapp(aluno.whatsapp, `Oi ${primeiroNome(aluno.nome)}!`)}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-ok-fundo text-sm font-semibold text-ok hover:bg-ok hover:text-white"
              >
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
              <a
                href={`mailto:${aluno.email}`}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-marinho-50 text-sm font-semibold text-marinho-700 hover:bg-marinho-100"
              >
                <Mail className="size-4" />
                E-mail
              </a>
            </div>
          </Cartao>

          <Cartao>
            <div className="flex items-center justify-between">
              <h2 className="font-titulo text-lg font-bold">Mensalidade</h2>
              <Selo tom={TONS_MENSALIDADE[situacao.status]} ponto>
                {situacao.rotulo}
              </Selo>
            </div>
            <dl className="mt-2 divide-y divide-linha/70">
              {turma ? (
                <>
                  <LinhaInfo rotulo="Turma" valor={turma.nome} />
                  <LinhaInfo rotulo="Horário" valor={`${descreverDiasSemana(turma.diasSemana)}, ${turma.horarioInicio}`} />
                  <LinhaInfo rotulo="Valor" valor={formatarMoeda(turma.valorMensalidade)} />
                  <LinhaInfo rotulo="Válida até" valor={formatarData(aluno.validadeMensalidade)} />
                </>
              ) : (
                <LinhaInfo rotulo="Turma" valor="Sem turma fixa" />
              )}
              <LinhaInfo rotulo="Experimental" valor={aluno.usouExperimental ? "Já usou" : "Disponível"} />
              <LinhaInfo rotulo="Total pago" valor={formatarMoeda(totalPago)} />
            </dl>
            {turma && (
              <Botao variante="sucesso" icone={Banknote} larguraTotal className="mt-3" onClick={() => setRegistrando(true)}>
                Registrar mensalidade recebida
              </Botao>
            )}
          </Cartao>

          <Cartao>
            <h2 className="font-titulo text-lg font-bold">Dados pessoais</h2>
            <dl className="mt-2 divide-y divide-linha/70">
              <LinhaInfo rotulo="E-mail" valor={<span className="break-all">{aluno.email}</span>} />
              <LinhaInfo rotulo="CPF" valor={formatarCpf(aluno.cpf)} />
              <LinhaInfo
                rotulo="Nascimento"
                valor={aluno.dataNascimento ? `${formatarData(aluno.dataNascimento)} (${idade} anos)` : "—"}
              />
              <LinhaInfo rotulo="WhatsApp" valor={formatarTelefone(aluno.whatsapp)} />
              <LinhaInfo rotulo="Cliente desde" valor={formatarData(aluno.criadoEm.slice(0, 10))} />
            </dl>
            {aluno.observacoes && (
              <p className="mt-3 rounded-2xl bg-areia-50 px-3.5 py-2.5 text-sm text-marinho-900">{aluno.observacoes}</p>
            )}
          </Cartao>

          <div className="grid grid-cols-2 gap-2">
            <Botao variante="secundario" icone={Pencil} onClick={() => setEditando(true)}>
              Editar
            </Botao>
            <Botao variante={aluno.ativo ? "perigo" : "secundario"} icone={Power} carregando={alternando} onClick={alternarAtivo}>
              {aluno.ativo ? "Desativar" : "Reativar"}
            </Botao>
          </div>
        </div>

        <section>
          <Abas<Aba>
            className="mb-4"
            abas={[
              { valor: "pagamentos", rotulo: "Pagamentos", contador: meusPagamentos.length },
              { valor: "aulas", rotulo: "Presenças", contador: minhasAulas.filter((p) => p.status === "confirmada").length },
            ]}
            ativa={aba}
            aoMudar={setAba}
          />
          {aba === "pagamentos" ? (
            meusPagamentos.length ? (
              <ul className="flex flex-col gap-2">
                {meusPagamentos.map((p) => {
                  const sit = situacaoCobranca(p);
                  const pendente = sit === "em_analise";
                  return (
                    <li key={p.id}>
                      <ItemPagamento
                        pagamento={p}
                        acoes={
                          pendente ? (
                            <Botao
                              variante="sucesso"
                              tamanho="pequeno"
                              larguraTotal
                              icone={Banknote}
                              carregando={ocupado === p.id}
                              onClick={async () => {
                                setOcupado(p.id);
                                try {
                                  await confirmarPagamento(p, professor.id);
                                  avisos.sucesso("Pagamento confirmado");
                                } catch (erro) {
                                  avisos.erro(erro);
                                } finally {
                                  setOcupado(null);
                                }
                              }}
                            >
                              Confirmar pagamento
                            </Botao>
                          ) : undefined
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EstadoVazio icone={Receipt} titulo="Nenhum pagamento" compacto />
            )
          ) : minhasAulas.length ? (
            <ul className="flex flex-col gap-2">
              {minhasAulas.map((p) => {
                const status = ROTULOS_STATUS_PRESENCA[p.status];
                return (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-linha/70">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{turmaPorId.get(p.turmaId)?.nome ?? "Aula"}</p>
                      <p className="text-[13px] text-suave">
                        {formatarDataRelativa(p.dataAula)} · {ROTULOS_TIPO_PRESENCA[p.tipo]}
                      </p>
                    </div>
                    <Selo tom={status.tom}>{status.rotulo}</Selo>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EstadoVazio
              icone={CalendarX}
              titulo="Nenhuma presença"
              descricao="As aulas em que o aluno marcar presença aparecem aqui."
              compacto
            />
          )}
        </section>
      </div>

      {editando && <FolhaFormularioAluno aluno={aluno} aoFechar={() => setEditando(false)} />}
      {registrando && <FolhaRegistrarPagamento aluno={aluno} aoFechar={() => setRegistrando(false)} />}
    </>
  );
}
