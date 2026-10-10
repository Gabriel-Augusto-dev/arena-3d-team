"use client";

import { useState } from "react";
import { KeyRound, Power, UserPlus } from "lucide-react";
import { useDadosProfessor } from "@/contextos/ContextoDadosProfessor";
import { useAvisos } from "@/contextos/ContextoAvisos";
import { Avatar, Cartao, EsqueletoLista, TituloSecao } from "@/componentes/interface/Elementos";
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

/** Lista dos professores auxiliares: adicionar, reenviar acesso e desativar. */
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
        titulo="Auxiliares"
        acao={
          <Botao variante="secundario" tamanho="pequeno" icone={UserPlus} onClick={() => setNovo(true)}>
            Adicionar
          </Botao>
        }
      />
      {carregando ? (
        <EsqueletoLista linhas={1} />
      ) : ordenados.length === 0 ? (
        <p className="text-sm text-suave">Nenhum auxiliar cadastrado.</p>
      ) : (
        <Cartao className="p-0">
          <ul className="divide-y divide-linha/70">
            {ordenados.map((auxiliar) => (
              <li key={auxiliar.id} className={`flex items-center gap-3 px-4 py-3 ${auxiliar.ativo ? "" : "opacity-60"}`}>
                <Avatar nome={auxiliar.nome} tamanho="pequeno" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {auxiliar.nome}
                    {!auxiliar.ativo && <span className="ml-2 text-xs font-normal text-suave">(desativado)</span>}
                  </p>
                  <p className="truncate text-[13px] text-suave">{auxiliar.email}</p>
                </div>
                {auxiliar.ativo && (
                  <Botao
                    variante="fantasma"
                    tamanho="pequeno"
                    icone={KeyRound}
                    aria-label="Reenviar acesso"
                    title="Reenviar acesso"
                    carregando={ocupado === auxiliar.id + "acesso"}
                    onClick={() => reenviar(auxiliar)}
                  >
                    <span className="hidden sm:inline">Reenviar acesso</span>
                  </Botao>
                )}
                <Botao
                  variante="fantasma"
                  tamanho="pequeno"
                  icone={Power}
                  aria-label={auxiliar.ativo ? "Desativar" : "Reativar"}
                  title={auxiliar.ativo ? "Desativar" : "Reativar"}
                  className={auxiliar.ativo ? "text-erro hover:bg-erro-fundo" : ""}
                  carregando={ocupado === auxiliar.id + "ativo"}
                  onClick={() => alternar(auxiliar)}
                >
                  <span className="hidden sm:inline">{auxiliar.ativo ? "Desativar" : "Reativar"}</span>
                </Botao>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

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
      descricao="Ele recebe um e-mail para criar a senha."
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
