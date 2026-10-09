"use client";

import { useState } from "react";
import { KeyRound, Power, UserPlus, UsersRound } from "lucide-react";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { Avatar, Cartao, EsqueletoLista, Selo, TituloSecao } from "@/componentes/interface/Elementos";
import { Botao } from "@/componentes/interface/Botao";
import { Campo } from "@/componentes/interface/Campos";
import { Folha } from "@/componentes/interface/Folha";
import { formatarTelefone } from "@/lib/utilitarios/formatadores";
import { validarEmail, validarTelefone, type ErrosFormulario } from "@/lib/utilitarios/validacoes";
import type { ResultadoNovaConta } from "@/lib/autenticacao";
import { cadastrarAuxiliar, type DadosAuxiliar } from "@/servicos/servicoEquipe";
import { alternarAlunoAtivo, reenviarAcesso } from "@/servicos/servicoAlunos";
import type { Usuario } from "@/tipos";
import { FolhaAcessoEnviado } from "./FolhaAcessoEnviado";

/**
 * Equipe: professores auxiliares cadastrados pelo administrador.
 * O auxiliar entra no mesmo app e vê alunos, aulas, presenças e quem pagou,
 * mas não confirma pagamentos nem altera cadastros, turmas ou ajustes.
 */
export function SecaoEquipe() {
  // Mesma lista que a área do professor já mantém em tempo real (sem consulta extra)
  const { auxiliares, carregando } = useDadosProfessor();
  const avisos = useAvisos();
  const [novo, setNovo] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [acesso, setAcesso] = useState<{ nome: string; email: string; resultado: ResultadoNovaConta } | null>(null);

  const ordenados = [...auxiliares].sort(
    (a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, "pt-BR"),
  );

  const executar = async (chave: string, acao: () => Promise<void>) => {
    setOcupado(chave);
    try {
      await acao();
    } catch (erro) {
      avisos.erro(erro);
    } finally {
      setOcupado(null);
    }
  };

  const reenviar = (auxiliar: Usuario) =>
    executar(auxiliar.id + "acesso", async () => {
      const resultado = await reenviarAcesso(auxiliar.id);
      if (resultado.emailEnviado) avisos.sucesso(`E-mail de acesso enviado para ${auxiliar.email}`);
      else setAcesso({ nome: auxiliar.nome, email: auxiliar.email, resultado });
    });

  const alternar = (auxiliar: Usuario) =>
    executar(auxiliar.id + "ativo", async () => {
      await alternarAlunoAtivo(auxiliar);
      avisos.sucesso(auxiliar.ativo ? `${auxiliar.nome} não consegue mais entrar` : `${auxiliar.nome} reativado`);
    });

  return (
    <section>
      <TituloSecao
        titulo="Equipe"
        acao={
          <Botao variante="secundario" tamanho="pequeno" icone={UserPlus} onClick={() => setNovo(true)}>
            Adicionar auxiliar
          </Botao>
        }
      />
      <Cartao className="flex flex-col gap-3">
        {carregando ? (
          <EsqueletoLista linhas={1} />
        ) : ordenados.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-fundo px-4 py-3 text-sm text-suave">
            <UsersRound className="size-5 shrink-0 text-marinho-400" />
            Nenhum professor auxiliar cadastrado.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {ordenados.map((auxiliar) => (
              <li
                key={auxiliar.id}
                className={`flex flex-col gap-2 rounded-2xl bg-fundo p-3 ${auxiliar.ativo ? "" : "opacity-70"}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar nome={auxiliar.nome} tamanho="pequeno" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{auxiliar.nome}</p>
                    <p className="truncate text-[13px] text-suave">
                      {auxiliar.email}
                      {auxiliar.whatsapp ? ` · ${formatarTelefone(auxiliar.whatsapp)}` : ""}
                    </p>
                  </div>
                  {auxiliar.ativo ? <Selo tom="verde">Ativo</Selo> : <Selo tom="cinza">Desativado</Selo>}
                </div>
                <div className="flex justify-end gap-1">
                  {auxiliar.ativo && (
                    <Botao
                      variante="fantasma"
                      tamanho="pequeno"
                      icone={KeyRound}
                      carregando={ocupado === auxiliar.id + "acesso"}
                      onClick={() => reenviar(auxiliar)}
                    >
                      Reenviar acesso
                    </Botao>
                  )}
                  <Botao
                    variante="fantasma"
                    tamanho="pequeno"
                    icone={Power}
                    className={auxiliar.ativo ? "text-erro hover:bg-erro-fundo" : ""}
                    carregando={ocupado === auxiliar.id + "ativo"}
                    onClick={() => alternar(auxiliar)}
                  >
                    {auxiliar.ativo ? "Desativar" : "Reativar"}
                  </Botao>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      {novo && (
        <FolhaNovoAuxiliar
          aoFechar={() => setNovo(false)}
          aoCriar={(dados, resultado) => {
            setNovo(false);
            setAcesso({ nome: dados.nome, email: dados.email, resultado });
          }}
        />
      )}
      {acesso && (
        <FolhaAcessoEnviado
          nome={acesso.nome}
          email={acesso.email}
          resultado={acesso.resultado}
          aoFechar={() => setAcesso(null)}
        />
      )}
    </section>
  );
}

function FolhaNovoAuxiliar({
  aoFechar,
  aoCriar,
}: {
  aoFechar(): void;
  aoCriar(dados: DadosAuxiliar, resultado: ResultadoNovaConta): void;
}) {
  const avisos = useAvisos();
  const [dados, setDados] = useState<DadosAuxiliar>({ nome: "", email: "", whatsapp: "" });
  const [erros, setErros] = useState<ErrosFormulario<DadosAuxiliar>>({});
  const [salvando, setSalvando] = useState(false);

  const alterar = (campo: keyof DadosAuxiliar, valor: string) => {
    setDados((d) => ({ ...d, [campo]: valor }));
    if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }));
  };

  const salvar = async () => {
    const novosErros: ErrosFormulario<DadosAuxiliar> = {};
    if (dados.nome.trim().split(/\s+/).length < 2) novosErros.nome = "Informe nome e sobrenome";
    if (!validarEmail(dados.email)) novosErros.email = "E-mail inválido";
    if (dados.whatsapp && !validarTelefone(dados.whatsapp)) novosErros.whatsapp = "WhatsApp com DDD";
    setErros(novosErros);
    if (Object.keys(novosErros).length) return;

    setSalvando(true);
    try {
      const resultado = await cadastrarAuxiliar(dados);
      aoCriar({ ...dados, email: dados.email.trim().toLowerCase() }, resultado);
    } catch (erro) {
      avisos.erro(erro);
      setSalvando(false);
    }
  };

  return (
    <Folha
      aberta
      aoFechar={aoFechar}
      titulo="Novo professor auxiliar"
      descricao="Ele recebe um e-mail para criar a senha e entra no mesmo app."
      rodape={
        <Botao tamanho="grande" larguraTotal carregando={salvando} onClick={salvar}>
          Cadastrar e enviar acesso
        </Botao>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo rotulo="Nome completo" value={dados.nome} onChange={(e) => alterar("nome", e.target.value)} erro={erros.nome} />
        <Campo
          rotulo="E-mail de acesso"
          type="email"
          inputMode="email"
          value={dados.email}
          onChange={(e) => alterar("email", e.target.value)}
          erro={erros.email}
        />
        <Campo
          rotulo="WhatsApp (opcional)"
          type="tel"
          value={formatarTelefone(dados.whatsapp)}
          onChange={(e) => alterar("whatsapp", e.target.value)}
          erro={erros.whatsapp}
        />
      </div>
    </Folha>
  );
}
