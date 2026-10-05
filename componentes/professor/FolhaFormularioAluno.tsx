"use client";

import { useState } from "react";
import type { Usuario } from "@/tipos";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { Folha } from "@/componentes/interface/Folha";
import { Botao } from "@/componentes/interface/Botao";
import { Campo, CampoSelecao, CampoTexto, SeletorOpcoes } from "@/componentes/interface/Campos";
import { descreverDiasSemana, hojeISO } from "@/lib/utilitarios/datas";
import { formatarCpf, formatarMoeda, formatarTelefone } from "@/lib/utilitarios/formatadores";
import { validarDadosPessoais, type ErrosFormulario } from "@/lib/utilitarios/validacoes";
import { atualizarAluno, cadastrarAluno, type DadosAluno } from "@/servicos/servicoAlunos";

type Formulario = DadosAluno & { senhaInicial: string };

/** Cadastro e edição de aluno pelo professor (turma, plano, mensalidade) */
export function FolhaFormularioAluno({
  aluno,
  aoFechar,
  aoSalvar,
}: {
  aluno?: Usuario;
  aoFechar(): void;
  aoSalvar?(id: string): void;
}) {
  const { turmas } = useDadosProfessor();
  const avisos = useAvisos();
  const editando = !!aluno;
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<ErrosFormulario<Formulario>>({});
  const [dados, setDados] = useState<Formulario>({
    nome: aluno?.nome ?? "",
    email: aluno?.email ?? "",
    cpf: aluno?.cpf ?? "",
    dataNascimento: aluno?.dataNascimento ?? "",
    whatsapp: aluno?.whatsapp ?? "",
    plano: aluno?.plano ?? "mensalista",
    turmaId: aluno?.turmaId ?? turmas.find((t) => t.ativa)?.id ?? null,
    validadeMensalidade: aluno?.validadeMensalidade ?? null,
    usouExperimental: aluno?.usouExperimental ?? false,
    ativo: aluno?.ativo ?? true,
    observacoes: aluno?.observacoes ?? "",
    senhaInicial: "",
  });

  const alterar = <C extends keyof Formulario>(campo: C, valor: Formulario[C]) => {
    setDados((d) => ({ ...d, [campo]: valor }));
    if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }));
  };

  const turmaEscolhida = turmas.find((t) => t.id === dados.turmaId);

  const salvar = async () => {
    const novosErros: ErrosFormulario<Formulario> = validarDadosPessoais(dados);
    if (dados.plano === "mensalista" && !dados.turmaId) novosErros.turmaId = "Escolha a turma";
    if (!editando && dados.senhaInicial.length < 6) novosErros.senhaInicial = "Mínimo de 6 caracteres";
    setErros(novosErros);
    if (Object.keys(novosErros).length) return;

    setSalvando(true);
    try {
      const { senhaInicial, ...dadosAluno } = dados;
      if (editando) {
        await atualizarAluno(aluno, dadosAluno);
        avisos.sucesso("Aluno atualizado");
        aoSalvar?.(aluno.id);
      } else {
        const id = await cadastrarAluno(dadosAluno, senhaInicial);
        avisos.sucesso(`${dados.nome.split(" ")[0]} cadastrado. Envie o e-mail e a senha para o aluno`);
        aoSalvar?.(id);
      }
      aoFechar();
    } catch (erro) {
      avisos.erro(erro);
      setSalvando(false);
    }
  };

  return (
    <Folha
      aberta
      larga
      aoFechar={aoFechar}
      titulo={editando ? "Editar aluno" : "Novo aluno"}
      descricao={editando ? aluno.email : "O aluno entra com este e-mail e a senha inicial."}
      rodape={
        <Botao tamanho="grande" larguraTotal carregando={salvando} onClick={salvar}>
          {editando ? "Salvar alterações" : "Cadastrar aluno"}
        </Botao>
      }
    >
      <div className="flex flex-col gap-5">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-titulo text-base font-bold">Dados pessoais</legend>
          <Campo
            className="sm:col-span-2"
            rotulo="Nome completo"
            value={dados.nome}
            onChange={(e) => alterar("nome", e.target.value)}
            erro={erros.nome}
          />
          <Campo
            rotulo="E-mail de acesso"
            type="email"
            value={dados.email}
            onChange={(e) => alterar("email", e.target.value)}
            erro={erros.email}
            disabled={editando}
            dica={editando ? "O e-mail de login não pode ser alterado aqui" : undefined}
          />
          {!editando && (
            <Campo
              rotulo="Senha inicial"
              value={dados.senhaInicial}
              onChange={(e) => alterar("senhaInicial", e.target.value)}
              erro={erros.senhaInicial}
              dica="O aluno pode trocar depois"
            />
          )}
          <Campo
            rotulo="CPF"
            inputMode="numeric"
            value={formatarCpf(dados.cpf)}
            onChange={(e) => alterar("cpf", e.target.value)}
            erro={erros.cpf}
          />
          <Campo
            rotulo="Nascimento"
            type="date"
            max={hojeISO()}
            value={dados.dataNascimento}
            onChange={(e) => alterar("dataNascimento", e.target.value)}
            erro={erros.dataNascimento}
          />
          <Campo
            rotulo="WhatsApp"
            type="tel"
            value={formatarTelefone(dados.whatsapp)}
            onChange={(e) => alterar("whatsapp", e.target.value)}
            erro={erros.whatsapp}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 font-titulo text-base font-bold">Plano e turma</legend>
          <SeletorOpcoes<"mensalista" | "avulso">
            opcoes={[
              { valor: "mensalista", rotulo: "Mensalista", descricao: "Aulas da turma sem custo" },
              { valor: "avulso", rotulo: "Avulso", descricao: "Paga Day Use por aula" },
            ]}
            valor={dados.plano}
            aoMudar={(plano) => alterar("plano", plano)}
          />
          {dados.plano === "mensalista" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoSelecao
                rotulo="Turma"
                value={dados.turmaId ?? ""}
                onChange={(e) => alterar("turmaId", e.target.value || null)}
                erro={erros.turmaId}
                dica={
                  turmaEscolhida
                    ? `${descreverDiasSemana(turmaEscolhida.diasSemana)}, ${turmaEscolhida.horarioInicio} · ${formatarMoeda(turmaEscolhida.valorMensalidade)}`
                    : undefined
                }
              >
                <option value="">Escolha…</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id} disabled={!t.ativa}>
                    {t.nome} — {descreverDiasSemana(t.diasSemana)} {t.horarioInicio}
                    {t.ativa ? "" : " (inativa)"}
                  </option>
                ))}
              </CampoSelecao>
              <Campo
                rotulo="Mensalidade válida até"
                type="date"
                value={dados.validadeMensalidade ?? ""}
                onChange={(e) => alterar("validadeMensalidade", e.target.value || null)}
                dica="Ajuste manual. O normal é confirmar o pagamento no Financeiro"
              />
            </div>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 font-titulo text-base font-bold">Outros</legend>
          <label className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-linha/70">
            <span>
              <span className="block text-[15px] font-semibold">Aula experimental já usada</span>
              <span className="block text-[13px] text-suave">Desmarque para liberar uma nova experimental</span>
            </span>
            <input
              type="checkbox"
              className="size-5 accent-marinho-600"
              checked={dados.usouExperimental}
              onChange={(e) => alterar("usouExperimental", e.target.checked)}
            />
          </label>
          <CampoTexto
            rotulo="Observações (só o professor vê)"
            value={dados.observacoes}
            onChange={(e) => alterar("observacoes", e.target.value)}
            placeholder="Ex.: lesão no joelho, prefere jogar na esquerda"
          />
        </fieldset>
      </div>
    </Folha>
  );
}
