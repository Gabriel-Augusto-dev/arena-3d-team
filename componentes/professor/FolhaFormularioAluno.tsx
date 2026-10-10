"use client";

import { useState } from "react";
import type { Usuario } from "@/tipos";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { Folha } from "@/componentes/interface/Folha";
import { Botao } from "@/componentes/interface/Botao";
import { Campo, CampoData, CampoTexto, SeletorOpcoes } from "@/componentes/interface/Campos";
import { camposDasMatriculas, matriculasDoAluno, type Matricula } from "@/servicos/regras/regrasMensalidade";
import { descreverDiasSemana, hojeISO } from "@/lib/utilitarios/datas";
import { formatarCpf, formatarMoeda, formatarTelefone } from "@/lib/utilitarios/formatadores";
import { validarDadosPessoais, type ErrosFormulario } from "@/lib/utilitarios/validacoes";
import { atualizarAluno, cadastrarAluno, type DadosAluno } from "@/servicos/servicoAlunos";
import type { ResultadoNovaConta } from "@/lib/autenticacao";
import { FolhaAcessoEnviado } from "./FolhaAcessoEnviado";

type Formulario = DadosAluno;

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
    turmasIds: aluno?.turmasIds,
    validades: aluno?.validades,
    associado: aluno?.associado ?? false,
    ativo: aluno?.ativo ?? true,
    observacoes: aluno?.observacoes ?? "",
  });
  const [criado, setCriado] = useState<ResultadoNovaConta | null>(null);

  const alterar = <C extends keyof Formulario>(campo: C, valor: Formulario[C]) => {
    setDados((d) => ({ ...d, [campo]: valor }));
    if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }));
  };

  // Turmas em que o aluno é mensalista (pode ser mais de uma), cada uma com a validade da mensalidade
  const matriculas = matriculasDoAluno({ ...dados, plano: "mensalista" });
  const definirMatriculas = (lista: Matricula[]) => {
    setDados((d) => ({ ...d, ...camposDasMatriculas(lista) }));
    if (erros.turmaId) setErros((e) => ({ ...e, turmaId: undefined }));
  };
  const alternarTurma = (turmaId: string) =>
    definirMatriculas(
      matriculas.some((m) => m.turmaId === turmaId)
        ? matriculas.filter((m) => m.turmaId !== turmaId)
        : [...matriculas, { turmaId, validade: null }],
    );
  const mudarValidade = (turmaId: string, validade: string) =>
    definirMatriculas(matriculas.map((m) => (m.turmaId === turmaId ? { ...m, validade: validade || null } : m)));

  const salvar = async () => {
    const novosErros: ErrosFormulario<Formulario> = validarDadosPessoais(dados);
    if (dados.plano === "mensalista" && !matriculas.length) novosErros.turmaId = "Escolha pelo menos uma turma";
    setErros(novosErros);
    if (Object.keys(novosErros).length) return;

    setSalvando(true);
    try {
      if (editando) {
        await atualizarAluno(aluno, dados);
        avisos.sucesso("Aluno atualizado");
        aoSalvar?.(aluno.id);
        aoFechar();
      } else {
        const resultado = await cadastrarAluno(dados);
        aoSalvar?.(resultado.uid);
        // Mostra se o e-mail de acesso saiu (ou o link para mandar no WhatsApp)
        setCriado(resultado);
      }
    } catch (erro) {
      avisos.erro(erro);
      setSalvando(false);
    }
  };

  if (criado) {
    return <FolhaAcessoEnviado nome={dados.nome} email={dados.email.trim().toLowerCase()} resultado={criado} aoFechar={aoFechar} />;
  }

  return (
    <Folha
      aberta
      larga
      aoFechar={aoFechar}
      titulo={editando ? "Editar aluno" : "Novo aluno"}
      descricao={editando ? aluno.email : "O aluno recebe um e-mail para criar a senha e já pode entrar."}
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
          <Campo
            rotulo="CPF"
            inputMode="numeric"
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
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Turmas (cada uma tem a sua mensalidade)</p>
              {turmas.map((t) => {
                const matricula = matriculas.find((m) => m.turmaId === t.id);
                return (
                  <div
                    key={t.id}
                    className={`rounded-2xl px-4 py-3 ring-1 ${matricula ? "bg-white ring-marinho-300" : "bg-fundo ring-linha/70"}`}
                  >
                    <label className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold">
                          {t.nome}
                          {t.ativa ? "" : " (inativa)"}
                        </span>
                        <span className="block text-[13px] text-suave">
                          {descreverDiasSemana(t.diasSemana)} {t.horarioInicio} · {formatarMoeda(t.valorMensalidade)}
                          {t.responsavelNome ? ` · Prof. ${t.responsavelNome}` : ""}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        aria-label={`Mensalista da turma ${t.nome}`}
                        className="size-5 shrink-0 accent-marinho-600"
                        checked={!!matricula}
                        disabled={!t.ativa && !matricula}
                        onChange={() => alternarTurma(t.id)}
                      />
                    </label>
                    {matricula && (
                      <CampoData
                        className="mt-3"
                        rotulo="Mensalidade válida até"
                        valor={matricula.validade ?? ""}
                        aoMudar={(v) => mudarValidade(t.id, v)}
                        autoComplete="off"
                        dica="Ajuste manual. O normal é confirmar o pagamento no Financeiro"
                      />
                    )}
                  </div>
                );
              })}
              {erros.turmaId && <p className="text-[13px] font-medium text-erro">{erros.turmaId}</p>}
            </div>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 font-titulo text-base font-bold">Outros</legend>
          {dados.plano === "mensalista" && (
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-linha/70">
              <span className="block text-[15px] font-semibold">Associado</span>
              <input
                type="checkbox"
                className="size-5 accent-marinho-600"
                checked={!!dados.associado}
                onChange={(e) => alterar("associado", e.target.checked)}
              />
            </label>
          )}
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
