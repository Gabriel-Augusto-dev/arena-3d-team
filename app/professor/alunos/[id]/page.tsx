"use client";

import { valorMensalidadeDoAluno } from "@/servicos/regras/regrasPreco";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CalendarX,
  KeyRound,
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
import { useAutenticacao, useUsuarioLogado } from "@/contextos/ContextoAutenticacao";
import { FolhaAcessoEnviado } from "@/componentes/professor/FolhaAcessoEnviado";
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
import {
  calcularSituacaoMensalidade,
  matriculasDoAluno,
  situacaoDaValidade,
} from "@/servicos/regras/regrasMensalidade";
import { ROTULOS_TIPO_PRESENCA } from "@/servicos/regras/regrasAula";
import { situacaoCobranca } from "@/servicos/regras/regrasPagamento";
import { alternarAlunoAtivo, definirAssociado, reenviarAcesso } from "@/servicos/servicoAlunos";
import type { Usuario } from "@/tipos";
import type { ResultadoNovaConta } from "@/lib/autenticacao";
import { confirmarPagamento } from "@/servicos/servicoPagamentos";

type Aba = "pagamentos" | "aulas";

export default function DetalheAluno() {
  const { id } = useParams<{ id: string }>();
  const professor = useUsuarioLogado();
  // O professor auxiliar vê a ficha e os pagamentos, mas não altera nada
  const { ehAdministrador } = useAutenticacao();
  const { alunoPorId, turmaPorId, presencaVisivel, pagamentoVisivel, configuracoes, carregando } = useDadosProfessor();
  const avisos = useAvisos();
  const [aba, setAba] = useState<Aba>("pagamentos");
  const [editando, setEditando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [alternando, setAlternando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState(false);
  const [acesso, setAcesso] = useState<ResultadoNovaConta | null>(null);

  // Histórico completo de presenças do aluno
  const { dados: presencasDoAluno } = useColecao("presencas", [onde("alunoId", "==", id)]);

  const aluno = alunoPorId.get(id);
  // Histórico completo de pagamentos do aluno (buscado só ao abrir a ficha)
  const { dados: pagamentosDoAluno } = useColecao("pagamentos", [onde("alunoId", "==", id)]);
  const meusPagamentos = useMemo(
    () =>
      pagamentosDoAluno.filter(pagamentoVisivel).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
    [pagamentosDoAluno, pagamentoVisivel],
  );
  const minhasAulas = useMemo(
    // O auxiliar vê só as presenças das aulas dele
    () => presencasDoAluno.filter(presencaVisivel).sort((a, b) => b.dataAula.localeCompare(a.dataAula)),
    [presencasDoAluno, presencaVisivel],
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

  // Uma linha por turma em que o aluno é mensalista (cada uma com a própria mensalidade)
  const matriculas = matriculasDoAluno(aluno).flatMap((m) => {
    const turmaDaMatricula = turmaPorId.get(m.turmaId);
    return turmaDaMatricula ? [{ ...m, turma: turmaDaMatricula, situacao: situacaoDaValidade(m.validade) }] : [];
  });
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

  const enviarAcesso = async () => {
    setReenviando(true);
    try {
      const resultado = await reenviarAcesso(aluno.id);
      if (resultado.emailEnviado) avisos.sucesso(`E-mail de acesso enviado para ${aluno.email}`);
      else setAcesso(resultado);
    } catch (erro) {
      avisos.erro(erro);
    } finally {
      setReenviando(false);
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
                  {aluno.plano === "mensalista" && aluno.associado && <Selo tom="verde">Associado</Selo>}
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
              {matriculas.length ? (
                matriculas.map((m) => (
                  <div key={m.turmaId} className="py-1">
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <span className="font-semibold">{m.turma.nome}</span>
                      {matriculas.length > 1 && (
                        <Selo tom={TONS_MENSALIDADE[m.situacao.status]}>{m.situacao.rotulo}</Selo>
                      )}
                    </div>
                    <LinhaInfo
                      rotulo="Horário"
                      valor={`${descreverDiasSemana(m.turma.diasSemana)}, ${m.turma.horarioInicio}`}
                    />
                    {m.turma.responsavelNome && <LinhaInfo rotulo="Professor" valor={m.turma.responsavelNome} />}
                    <LinhaInfo rotulo="Valor" valor={formatarMoeda(valorMensalidadeDoAluno(aluno, m.turma, configuracoes))} />
                    <LinhaInfo rotulo="Válida até" valor={formatarData(m.validade)} />
                  </div>
                ))
              ) : (
                <LinhaInfo rotulo="Turma" valor="Sem turma fixa" />
              )}
              {aluno.plano === "mensalista" && (
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-[15px] text-suave">Associado</span>
                  <InterruptorAssociado aluno={aluno} />
                </div>
              )}
              {ehAdministrador && <LinhaInfo rotulo="Total pago" valor={formatarMoeda(totalPago)} />}
            </dl>
            {matriculas.length > 0 && ehAdministrador && (
              <Botao variante="sucesso" icone={Banknote} larguraTotal className="mt-3" onClick={() => setRegistrando(true)}>
                Registrar mensalidade recebida
              </Botao>
            )}
          </Cartao>

          <Cartao>
            <h2 className="font-titulo text-lg font-bold">Dados pessoais</h2>
            <dl className="mt-2 divide-y divide-linha/70">
              <LinhaInfo rotulo="E-mail" valor={<span className="break-all">{aluno.email}</span>} />
              {ehAdministrador && <LinhaInfo rotulo="CPF" valor={formatarCpf(aluno.cpf)} />}
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

          {ehAdministrador && (
            <div className="grid grid-cols-2 gap-2">
              <Botao variante="secundario" icone={Pencil} onClick={() => setEditando(true)}>
                Editar
              </Botao>
              <Botao variante={aluno.ativo ? "perigo" : "secundario"} icone={Power} carregando={alternando} onClick={alternarAtivo}>
                {aluno.ativo ? "Desativar" : "Reativar"}
              </Botao>
              <Botao
                variante="fantasma"
                icone={KeyRound}
                className="col-span-2"
                carregando={reenviando}
                onClick={enviarAcesso}
              >
                Reenviar acesso por e-mail
              </Botao>
            </div>
          )}
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
                          pendente && ehAdministrador ? (
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

      {editando && ehAdministrador && <FolhaFormularioAluno aluno={aluno} aoFechar={() => setEditando(false)} />}
      {registrando && ehAdministrador && <FolhaRegistrarPagamento aluno={aluno} aoFechar={() => setRegistrando(false)} />}
      {acesso && <FolhaAcessoEnviado nome={aluno.nome} resultado={acesso} aoFechar={() => setAcesso(null)} />}
    </>
  );
}

/** Liga/desliga "associado" (administrador: qualquer aluno; auxiliar: os dele) */
function InterruptorAssociado({ aluno }: { aluno: Usuario }) {
  const avisos = useAvisos();
  const { ehAdministrador } = useAutenticacao();
  const [salvando, setSalvando] = useState(false);
  const alternar = async () => {
    setSalvando(true);
    try {
      await definirAssociado(aluno, !aluno.associado, ehAdministrador);
    } catch (erro) {
      avisos.erro(erro);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!aluno.associado}
      aria-label="Associado"
      disabled={salvando}
      onClick={alternar}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${
        aluno.associado ? "bg-ok" : "bg-marinho-100"
      }`}
    >
      <span
        className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${aluno.associado ? "left-6" : "left-1"}`}
      />
    </button>
  );
}
