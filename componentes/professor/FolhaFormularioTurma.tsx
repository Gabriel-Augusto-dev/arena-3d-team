"use client";

import { useState } from "react";
import type { DiaSemana, NivelTurma, Turma } from "@/tipos";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { Folha } from "@/componentes/interface/Folha";
import { Botao } from "@/componentes/interface/Botao";
import { Campo, CampoSelecao } from "@/componentes/interface/Campos";
import { NOMES_DIAS_CURTOS } from "@/lib/utilitarios/datas";
import { ROTULOS_NIVEL } from "@/servicos/regras/regrasAula";
import { salvarTurma, type DadosTurma } from "@/servicos/servicoTurmas";
import { garantirAulasFuturas } from "@/servicos/servicoAulas";

const ORDEM_DIAS: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0];

export function FolhaFormularioTurma({ turma, aoFechar }: { turma?: Turma; aoFechar(): void }) {
  const { configuracoes } = useDadosProfessor();
  const avisos = useAvisos();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [dados, setDados] = useState<DadosTurma>({
    nome: turma?.nome ?? "",
    nivel: turma?.nivel ?? "iniciante",
    diasSemana: turma?.diasSemana ?? [],
    horarioInicio: turma?.horarioInicio ?? "19:00",
    horarioFim: turma?.horarioFim ?? "20:30",
    valorMensalidade: turma?.valorMensalidade ?? configuracoes.valorMensalidadePadrao,
    local: turma?.local ?? "",
    ativa: turma?.ativa ?? true,
  });

  const alterar = <C extends keyof DadosTurma>(campo: C, valor: DadosTurma[C]) => {
    setDados((d) => ({ ...d, [campo]: valor }));
    setErro("");
  };

  const alternarDia = (dia: DiaSemana) =>
    alterar(
      "diasSemana",
      dados.diasSemana.includes(dia) ? dados.diasSemana.filter((d) => d !== dia) : [...dados.diasSemana, dia].sort(),
    );

  const salvar = async () => {
    if (!dados.nome.trim()) return setErro("Dê um nome para a turma");
    if (!dados.diasSemana.length) return setErro("Escolha pelo menos um dia da semana");
    if (dados.horarioFim <= dados.horarioInicio) return setErro("O horário de término precisa ser depois do início");

    setSalvando(true);
    try {
      await salvarTurma({ ...dados, nome: dados.nome.trim(), local: dados.local.trim() }, turma?.id);
      const criadas = await garantirAulasFuturas();
      avisos.sucesso(
        turma ? "Turma atualizada" : `Turma criada${criadas ? ` com ${criadas} aulas na agenda` : ""}`,
      );
      aoFechar();
    } catch (e) {
      avisos.erro(e);
      setSalvando(false);
    }
  };

  return (
    <Folha
      aberta
      aoFechar={aoFechar}
      titulo={turma ? "Editar turma" : "Nova turma"}
      descricao="As aulas das próximas semanas são criadas automaticamente."
      rodape={
        <Botao tamanho="grande" larguraTotal carregando={salvando} onClick={salvar}>
          {turma ? "Salvar turma" : "Criar turma"}
        </Botao>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo rotulo="Nome" placeholder="Ex.: Iniciante noite" value={dados.nome} onChange={(e) => alterar("nome", e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <CampoSelecao rotulo="Nível" value={dados.nivel} onChange={(e) => alterar("nivel", e.target.value as NivelTurma)}>
            {(Object.keys(ROTULOS_NIVEL) as NivelTurma[]).map((n) => (
              <option key={n} value={n}>
                {ROTULOS_NIVEL[n]}
              </option>
            ))}
          </CampoSelecao>
          <Campo rotulo="Local" placeholder="Quadra 1" value={dados.local} onChange={(e) => alterar("local", e.target.value)} />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Dias da semana</legend>
          <div className="grid grid-cols-7 gap-1.5">
            {ORDEM_DIAS.map((dia) => {
              const ativo = dados.diasSemana.includes(dia);
              return (
                <button
                  key={dia}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => alternarDia(dia)}
                  className={`h-11 rounded-xl text-sm font-semibold transition ${
                    ativo ? "bg-marinho-900 text-white" : "bg-white ring-1 ring-inset ring-linha hover:bg-marinho-50"
                  }`}
                >
                  {NOMES_DIAS_CURTOS[dia]}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[13px] text-suave">As aulas desses dias aparecem na agenda para os alunos marcarem presença.</p>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Início" type="time" value={dados.horarioInicio} onChange={(e) => alterar("horarioInicio", e.target.value)} />
          <Campo rotulo="Término" type="time" value={dados.horarioFim} onChange={(e) => alterar("horarioFim", e.target.value)} />
          <Campo
            rotulo="Mensalidade (R$)"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={dados.valorMensalidade}
            onChange={(e) => alterar("valorMensalidade", Number(e.target.value))}
            className="col-span-2"
          />
        </div>

        {erro && <p className="rounded-xl bg-erro-fundo px-3.5 py-2.5 text-sm font-medium text-erro">{erro}</p>}
      </div>
    </Folha>
  );
}
