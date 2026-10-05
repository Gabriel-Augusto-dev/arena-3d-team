"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Lock } from "lucide-react";
import { useDadosAluno } from "@/contextos/ContextoDadosAluno";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { useAgendaAluno, type AulaDoAluno } from "@/ganchos/useAgendaAluno";
import { IngressoAula } from "@/componentes/aulas/IngressoAula";
import { CartaoAulaAluno } from "@/componentes/aulas/CartaoAulaAluno";
import { FolhaPresenca } from "@/componentes/aulas/FolhaPresenca";
import { FolhaPagarCobrancas } from "@/componentes/pagamentos/FolhaPagarCobrancas";
import { LinkSecao, Selo, TituloSecao } from "@/componentes/interface/Elementos";
import { Botao, BotaoLink } from "@/componentes/interface/Botao";
import { formatarDataExtenso, saudacao } from "@/lib/utilitarios/datas";
import { formatarMoeda, primeiroNome } from "@/lib/utilitarios/formatadores";
import { situacaoCobranca, somaValores } from "@/servicos/regras/regrasPagamento";
import { ehDiaExtra } from "@/servicos/regras/regrasAula";

export default function PaginaInicioAluno() {
  // useSearchParams precisa de Suspense para a página continuar estática
  return (
    <Suspense>
      <InicioAluno />
    </Suspense>
  );
}

function InicioAluno() {
  const { aluno, cobrancasAbertas, cobrancasAtrasadas, carregando } = useDadosAluno();
  const { agenda } = useAgendaAluno();
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [pagando, setPagando] = useState(false);
  const avisos = useAvisos();
  // Link de presença enviado pelo professor: /aluno?aula=<id>
  const aulaNaUrl = useSearchParams().get("aula");
  const [linkFechado, setLinkFechado] = useState(false);
  const aulaDoLink = linkFechado ? null : aulaNaUrl;

  const linkValido = !!aulaDoLink && agenda.some((a) => a.aula.id === aulaDoLink);
  const linkTratado = useRef(false);

  useEffect(() => {
    if (!aulaDoLink || carregando || linkTratado.current) return;
    linkTratado.current = true;
    if (!linkValido) avisos.erro(new Error("Essa aula não está mais disponível"));
  }, [aulaDoLink, carregando, linkValido, avisos]);

  const ativas = agenda.filter((a) => a.situacao.tipo !== "encerrada" && a.aula.status === "agendada");
  const proxima = ativas.find((a) => a.situacao.tipo === "confirmada");
  // Dias extras: aparecem para todos, mensalistas e avulsos (todos pagam diária)
  const diasExtras = ativas.filter((a) => ehDiaExtra(a.aula) && a.situacao.tipo !== "confirmada");
  // Sugestões: aulas da turma do mensalista; para avulsos, as próximas aulas
  const sugestoes = ativas
    .filter(
      (a) =>
        !ehDiaExtra(a.aula) &&
        a.situacao.tipo !== "confirmada" &&
        (aluno.plano !== "mensalista" || a.ehDaMinhaTurma),
    )
    .slice(0, 3);
  const idAberto = abertaId ?? (linkValido && !carregando ? aulaDoLink : null);
  const aberta = agenda.find((a) => a.aula.id === idAberto);
  const fecharFolha = () => {
    setAbertaId(null);
    if (aulaNaUrl) {
      setLinkFechado(true);
      window.history.replaceState(null, "", "/aluno");
    }
  };

  return (
    <>
      <header className="mb-5">
        <h1 className="font-titulo text-[34px] font-extrabold italic uppercase leading-none sm:text-[42px]">
          {saudacao()}, {primeiroNome(aluno.nome)}
        </h1>
      </header>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <div className="flex flex-col gap-6">
          {cobrancasAtrasadas.length > 0 && (
            <div className="flex items-center gap-3 rounded-3xl bg-erro p-4 text-white">
              <Lock className="size-6 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">Day Use em atraso</p>
                <p className="text-sm text-white/85">Pague para voltar a marcar presença.</p>
              </div>
              <Botao variante="secundario" tamanho="pequeno" onClick={() => setPagando(true)}>
                Pagar {formatarMoeda(somaValores(cobrancasAbertas))}
              </Botao>
            </div>
          )}

          {carregando ? (
            <div className="h-[168px] animate-pulse rounded-[26px] bg-marinho-900/15" />
          ) : (
            proxima && (
              <button onClick={() => setAbertaId(proxima.aula.id)} className="text-left">
                <IngressoAula
                  animar
                  aula={proxima.aula}
                  turma={proxima.turma}
                  rotulo="Sua próxima aula"
                  status={<SeloIngresso item={proxima} />}
                />
              </button>
            )
          )}

          {diasExtras.length > 0 && (
            <section>
              <TituloSecao titulo="Dia extra" />
              <p className="-mt-1 mb-2.5 text-sm text-suave">
                Treino fora da agenda. Todos pagam diária, inclusive mensalistas.
              </p>
              <ul className="flex flex-col gap-3">
                {diasExtras.map((item) => (
                  <li key={item.aula.id}>
                    <p className="mb-1.5 ml-1 text-[13px] font-semibold text-suave">{formatarDataExtenso(item.aula.data)}</p>
                    <CartaoAulaAluno item={item} aoAbrir={() => setAbertaId(item.aula.id)} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <TituloSecao
              titulo={proxima ? "Marcar presença" : "Vai treinar quando?"}
              acao={<LinkSecao href="/aluno/aulas">Minhas presenças</LinkSecao>}
            />
            {sugestoes.length ? (
              <ul className="flex flex-col gap-3">
                {sugestoes.map((item) => (
                  <li key={item.aula.id}>
                    <p className="mb-1.5 ml-1 text-[13px] font-semibold text-suave">{formatarDataExtenso(item.aula.data)}</p>
                    <CartaoAulaAluno item={item} aoAbrir={() => setAbertaId(item.aula.id)} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-linha bg-white/60 p-6 text-center">
                <p className="text-[15px] text-suave">Nenhuma aula para marcar agora.</p>
                <BotaoLink href="/aluno/aulas" variante="secundario" tamanho="pequeno" icone={CalendarDays} className="mt-3">
                  Ver minhas presenças
                </BotaoLink>
              </div>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          {cobrancasAbertas.length > 0 && cobrancasAtrasadas.length === 0 && (
            <div className="flex items-center gap-3 rounded-3xl bg-white p-4 ring-1 ring-linha/70">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Day Use a pagar</p>
                <p className="text-sm text-suave">Pague até a meia-noite do dia da aula.</p>
              </div>
              <Botao variante="destaque" tamanho="pequeno" onClick={() => setPagando(true)}>
                Pagar {formatarMoeda(somaValores(cobrancasAbertas))}
              </Botao>
            </div>
          )}
        </aside>
      </div>

      {aberta && <FolhaPresenca item={aberta} aoFechar={fecharFolha} />}
      {pagando && <FolhaPagarCobrancas cobrancas={cobrancasAbertas} aoFechar={() => setPagando(false)} />}
    </>
  );
}

function SeloIngresso({ item }: { item: AulaDoAluno }) {
  const s = item.cobranca ? situacaoCobranca(item.cobranca) : "pago";
  if (s === "a_pagar") return <Selo tom="amarelo" ponto>Presença marcada · a pagar</Selo>;
  if (s === "em_atraso") return <Selo tom="vermelho" ponto>Em atraso</Selo>;
  return (
    <Selo tom="escuro" className="bg-white/10 text-laranja-300">
      Presença marcada
    </Selo>
  );
}
