import type {
  Aula,
  Configuracoes,
  DiaSemana,
  Notificacao,
  Pagamento,
  Presenca,
  Turma,
  Usuario,
} from "@/tipos";
import { adicionarDias, diaDaSemana, hojeISO } from "@/lib/utilitarios/datas";

/**
 * Dados de exemplo usados SOMENTE no modo demonstração (sem Firebase).
 * As datas são calculadas a partir de hoje para tudo fazer sentido.
 *
 * Contas (senha de todas: arena123)
 *  professor@arena3d.com → professor
 *  aluno@arena3d.com     → aluna mensalista em dia
 *  bruno@arena3d.com     → mensalista com mensalidade atrasada (paga Day Use)
 *  carla@arena3d.com     → aluna avulsa, ainda pode fazer a experimental
 *  gabriela@arena3d.com  → avulsa com Day Use EM ATRASO (bloqueada)
 */

export const SENHA_DEMONSTRACAO = "arena123";

/** Monta um CPF válido a partir de 9 dígitos */
function cpfValido(base: string): string {
  const digito = (numeros: string, peso: number) => {
    const soma = numeros.split("").reduce((t, d, i) => t + Number(d) * (peso - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = digito(base, 10);
  const d2 = digito(base + d1, 11);
  return `${base}${d1}${d2}`;
}

/** Sorteio determinístico (mesmo resultado a cada restauração) */
function sorteio(texto: string): number {
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 1000) / 1000;
}

export function gerarDadosIniciais() {
  const hoje = hojeISO();
  const momento = (dias: number, hora = 10, minuto = 0) =>
    new Date(
      `${adicionarDias(hoje, dias)}T${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}:00`,
    ).toISOString();
  const minutosAtras = (min: number) => new Date(Date.now() - min * 60000).toISOString();
  const carimbo = momento(-60);

  /* ---------------- Configurações ---------------- */
  const configuracoes: Configuracoes = {
    id: "geral",
    nomeArena: "3D Team",
    chavePix: "pix@3dteam.com.br",
    nomeRecebedorPix: "3D Team",
    cidadeRecebedorPix: "Sao Paulo",
    valorDayUse: 15,
    valorMensalidadePadrao: 160,
    mensalistaQualquerTurma: false,
    diasCicloMensalidade: 30,
    whatsappContato: "11999990000",
    atualizadoEm: carimbo,
  };

  /* ---------------- Turmas ---------------- */
  const turma = (
    id: string,
    nome: string,
    nivel: Turma["nivel"],
    diasSemana: DiaSemana[],
    horarioInicio: string,
    horarioFim: string,
    valorMensalidade: number,
    local: string,
  ): Turma => ({
    id,
    nome,
    nivel,
    diasSemana,
    horarioInicio,
    horarioFim,
    valorMensalidade,
    local,
    ativa: true,
    criadoEm: carimbo,
    atualizadoEm: carimbo,
  });

  const turmas: Turma[] = [
    turma("t_iniciante", "Iniciante", "iniciante", [1, 3], "19:00", "20:30", 160, "Quadra 1"),
    turma("t_intermediario", "Intermediário", "intermediario", [2, 4], "19:00", "20:30", 180, "Quadra 1"),
    turma("t_avancado", "Avançado", "avancado", [2, 4], "20:30", "22:00", 200, "Quadra 2"),
    turma("t_livre", "Treino livre", "livre", [5], "18:00", "19:30", 160, "Quadra 1"),
    turma("t_fimdesemana", "Fim de semana", "livre", [6, 0], "08:00", "09:30", 160, "Quadra 2"),
  ];

  /* ---------------- Usuários ---------------- */
  const usuario = (
    id: string,
    nome: string,
    email: string,
    base: string,
    dataNascimento: string,
    whatsapp: string,
    extra: Partial<Usuario> = {},
  ): Usuario => ({
    id,
    perfil: "aluno",
    nome,
    email,
    cpf: cpfValido(base),
    dataNascimento,
    whatsapp,
    plano: "avulso",
    turmaId: null,
    validadeMensalidade: null,
    usouExperimental: true,
    ativo: true,
    observacoes: "",
    criadoEm: carimbo,
    atualizadoEm: carimbo,
    ...extra,
  });

  const mensalista = (turmaId: string, diasValidade: number): Partial<Usuario> => ({
    plano: "mensalista",
    turmaId,
    validadeMensalidade: adicionarDias(hoje, diasValidade),
  });

  const usuarios: Usuario[] = [
    usuario("prof_danilo", "Danilo", "professor@arena3d.com", "529982247", "1988-03-14", "11999990000", {
      perfil: "professor",
    }),
    usuario("al_ana", "Ana Souza", "aluno@arena3d.com", "123456789", "1996-07-22", "11987654321", mensalista("t_iniciante", 18)),
    usuario("al_bruno", "Bruno Costa", "bruno@arena3d.com", "234567891", "1992-11-03", "11976543210", mensalista("t_intermediario", -6)),
    usuario("al_carla", "Carla Mendes", "carla@arena3d.com", "345678912", "2000-01-30", "11965432109", {
      usouExperimental: false,
    }),
    usuario("al_diego", "Diego Ramos", "diego@arena3d.com", "456789123", "1990-05-18", "11954321098", mensalista("t_avancado", 3)),
    usuario("al_elisa", "Elisa Martins", "elisa@arena3d.com", "567891234", "1998-09-09", "11943210987", mensalista("t_iniciante", 25)),
    usuario("al_felipe", "Felipe Andrade", "felipe@arena3d.com", "678912345", "1994-12-01", "11932109876", mensalista("t_fimdesemana", 10)),
    usuario("al_gabriela", "Gabriela Nunes", "gabriela@arena3d.com", "789123456", "2001-04-27", "11921098765"),
    usuario("al_henrique", "Henrique Alves", "henrique@arena3d.com", "891234567", "1987-08-15", "11910987654", mensalista("t_intermediario", 12)),
    usuario("al_isabela", "Isabela Rocha", "isabela@arena3d.com", "912345678", "1999-02-11", "11909876543", mensalista("t_iniciante", 7)),
    usuario("al_joao", "João Pedro Lima", "joao@arena3d.com", "135792468", "1995-06-06", "11998765432", mensalista("t_avancado", -15)),
    usuario("al_larissa", "Larissa Teixeira", "larissa@arena3d.com", "246813579", "1997-10-19", "11997654321", mensalista("t_fimdesemana", 20)),
    usuario("al_marcos", "Marcos Vieira", "marcos@arena3d.com", "975318642", "1993-03-25", "11996543210"),
    usuario("al_lucas", "Lucas Ferreira", "lucas@arena3d.com", "864297531", "1998-07-12", "11985214367"),
  ];
  const porId = (id: string) => usuarios.find((u) => u.id === id)!;

  /* ---------------- Aulas (2 semanas para trás e 2 para frente) ---------------- */
  const aulas: Aula[] = [];
  for (let d = -14; d <= 14; d++) {
    const data = adicionarDias(hoje, d);
    for (const t of turmas) {
      if (!t.diasSemana.includes(diaDaSemana(data))) continue;
      aulas.push({
        id: `${t.id}_${data}`,
        turmaId: t.id,
        data,
        horarioInicio: t.horarioInicio,
        horarioFim: t.horarioFim,
        status: "agendada",
        motivoCancelamento: "",
        criadoEm: carimbo,
        atualizadoEm: carimbo,
      });
    }
  }
  /** Próxima aula da turma a partir de `aPartirDe` dias (0 = hoje) */
  const aulaDe = (turmaId: string, aPartirDe = 0) =>
    aulas.find((a) => a.turmaId === turmaId && a.data >= adicionarDias(hoje, aPartirDe))!;
  const aulaPassada = (turmaId: string, antesDe = 0) =>
    [...aulas].reverse().find((a) => a.turmaId === turmaId && a.data < adicionarDias(hoje, antesDe))!;

  /* ---------------- Presenças e pagamentos ---------------- */
  const presencas: Presenca[] = [];
  const pagamentos: Pagamento[] = [];

  const novaPresenca = (
    aluno: Usuario,
    aula: Aula,
    tipo: Presenca["tipo"],
    pagamentoId: string | null = null,
    criadoEm = momento(-1, 12),
  ): Presenca => {
    const p: Presenca = {
      id: `pr_${aluno.id}_${aula.id}`,
      aulaId: aula.id,
      turmaId: aula.turmaId,
      dataAula: aula.data,
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      tipo,
      status: "confirmada",
      pagamentoId,
      criadoEm,
      atualizadoEm: criadoEm,
    };
    presencas.push(p);
    return p;
  };

  const pagamentoBase = (id: string, aluno: Usuario, extra: Partial<Pagamento>): Pagamento => ({
    id,
    alunoId: aluno.id,
    alunoNome: aluno.nome,
    tipo: "mensalidade",
    valor: 0,
    forma: "pix",
    status: "pendente",
    vencimento: null,
    aulaId: null,
    presencaId: null,
    turmaId: null,
    cicloInicio: null,
    cicloFim: null,
    informadoEm: null,
    observacaoAluno: "",
    motivoRecusa: "",
    confirmadoPor: null,
    confirmadoEm: null,
    criadoEm: carimbo,
    atualizadoEm: carimbo,
    ...extra,
  });

  /** Day Use: presença + cobrança, com a situação do pagamento */
  const dayUse = (
    aluno: Usuario,
    aula: Aula,
    status: Pagamento["status"],
    extra: Partial<Pagamento> = {},
  ) => {
    const pagamentoId = `pg_du_${aluno.id}_${aula.id}`;
    const presenca = novaPresenca(aluno, aula, "day_use", pagamentoId, momento(-1, 12));
    pagamentos.push(
      pagamentoBase(pagamentoId, aluno, {
        tipo: "day_use",
        valor: 15,
        status,
        vencimento: aula.data,
        aulaId: aula.id,
        presencaId: presenca.id,
        turmaId: aula.turmaId,
        criadoEm: presenca.criadoEm,
        ...(status === "confirmado"
          ? { confirmadoPor: "prof_danilo", confirmadoEm: momento(-1, 21), informadoEm: momento(-1, 20) }
          : {}),
        ...extra,
      }),
    );
  };

  // Histórico: mensalistas marcaram presença na maioria das aulas da própria turma
  const mensalistas = usuarios.filter((u) => u.plano === "mensalista");
  for (const aula of aulas.filter((a) => a.data < hoje)) {
    for (const m of mensalistas.filter((x) => x.turmaId === aula.turmaId)) {
      const emDiaNaData = (m.validadeMensalidade ?? "") >= aula.data;
      if (emDiaNaData && sorteio(m.id + aula.id) < 0.75) novaPresenca(m, aula, "mensalista", null, momento(-1, 9));
    }
  }

  // Próximas aulas: alguns mensalistas já marcaram
  novaPresenca(porId("al_ana"), aulaDe("t_iniciante", 1), "mensalista", null, minutosAtras(90));
  novaPresenca(porId("al_elisa"), aulaDe("t_iniciante", 1), "mensalista", null, minutosAtras(70));
  novaPresenca(porId("al_isabela"), aulaDe("t_iniciante", 1), "mensalista", null, minutosAtras(40));
  novaPresenca(porId("al_felipe"), aulaDe("t_fimdesemana", 1), "mensalista", null, minutosAtras(120));
  novaPresenca(porId("al_larissa"), aulaDe("t_fimdesemana", 1), "mensalista", null, minutosAtras(30));

  // Treino livre (próximo): Day Use de quem não é da turma
  const livre = aulaDe("t_livre", 0);
  dayUse(porId("al_marcos"), livre, "pendente"); // a pagar (ainda no prazo)
  dayUse(porId("al_joao"), livre, "pendente"); // mensalidade atrasada → Day Use
  dayUse(porId("al_henrique"), livre, "confirmado"); // pagou antes
  dayUse(porId("al_carla"), livre, "confirmado"); // avulsa, pagamento já confirmado
  dayUse(porId("al_lucas"), livre, "em_analise", { informadoEm: minutosAtras(10), observacaoAluno: "Paguei via PIX" }); // pagou, falta confirmar

  // Gabriela: Day Use de uma aula passada NÃO pago → em atraso (bloqueada)
  dayUse(porId("al_gabriela"), aulaPassada("t_intermediario"), "pendente");

  // Bruno: Day Use de ontem já pago via PIX, aguardando o professor conferir
  dayUse(porId("al_bruno"), aulaPassada("t_intermediario"), "em_analise", {
    informadoEm: minutosAtras(25),
    observacaoAluno: "PIX feito pelo Nubank",
  });

  // Marcos: Day Use antigo pago
  dayUse(porId("al_marcos"), aulaPassada("t_fimdesemana"), "confirmado");

  // Mensalidades confirmadas de quem está em dia (histórico de 3 ciclos)
  mensalistas
    .filter((u) => u.validadeMensalidade)
    .forEach((aluno, indice) => {
      const t = turmas.find((x) => x.id === aluno.turmaId)!;
      for (let ciclo = 0; ciclo < 3; ciclo++) {
        const cicloFim = adicionarDias(aluno.validadeMensalidade!, -30 * ciclo);
        const cicloInicio = adicionarDias(cicloFim, -29);
        const diasDoInicio = Math.round((new Date(cicloInicio).getTime() - new Date(hoje).getTime()) / 86400000);
        pagamentos.push(
          pagamentoBase(`pg_mens_${aluno.id}_${ciclo}`, aluno, {
            tipo: "mensalidade",
            valor: t.valorMensalidade,
            status: "confirmado",
            turmaId: t.id,
            cicloInicio,
            cicloFim,
            informadoEm: momento(diasDoInicio - 1, 18),
            confirmadoPor: "prof_danilo",
            confirmadoEm: momento(diasDoInicio, 9 + (indice % 8)),
            criadoEm: momento(diasDoInicio - 1, 18),
            atualizadoEm: momento(diasDoInicio, 9 + (indice % 8)),
          }),
        );
      }
    });

  // Diego: renovação da mensalidade aguardando conferência
  pagamentos.push(
    pagamentoBase("pg_mens_diego_novo", porId("al_diego"), {
      tipo: "mensalidade",
      valor: 200,
      status: "em_analise",
      turmaId: "t_avancado",
      informadoEm: minutosAtras(50),
      observacaoAluno: "Renovação do mês",
      criadoEm: minutosAtras(50),
    }),
  );

  /* ---------------- Notificações ---------------- */
  const notificacao = (id: string, extra: Partial<Notificacao>): Notificacao => ({
    id,
    usuarioId: null,
    paraPerfil: null,
    tipo: "aviso",
    titulo: "",
    mensagem: "",
    link: null,
    lida: false,
    criadoEm: carimbo,
    ...extra,
  });

  const notificacoes: Notificacao[] = [
    notificacao("nt_ana_1", {
      usuarioId: "al_ana",
      tipo: "pagamento_confirmado",
      titulo: "Mensalidade confirmada",
      mensagem: "Pagamento recebido! Novo ciclo liberado.",
      link: "/aluno/pagamentos",
      criadoEm: momento(-12, 9),
    }),
    notificacao("nt_prof_1", {
      paraPerfil: "professor",
      tipo: "nova_solicitacao",
      titulo: "PIX de Day Use para conferir",
      mensagem: "Bruno Costa enviou R$ 15,00 (1 aula).",
      link: "/professor/financeiro",
      criadoEm: minutosAtras(25),
    }),
    notificacao("nt_prof_2", {
      paraPerfil: "professor",
      tipo: "nova_solicitacao",
      titulo: "Mensalidade para conferir",
      mensagem: "Diego Ramos enviou R$ 200,00 (Avançado).",
      link: "/professor/financeiro",
      criadoEm: minutosAtras(50),
    }),
  ];

  const indexar = <T extends { id: string }>(lista: T[]) =>
    Object.fromEntries(lista.map((item) => [item.id, item as unknown as Record<string, unknown>]));

  return {
    banco: {
      configuracoes: indexar([configuracoes]),
      turmas: indexar(turmas),
      usuarios: indexar(usuarios),
      aulas: indexar(aulas),
      presencas: indexar(presencas),
      pagamentos: indexar(pagamentos),
      notificacoes: indexar(notificacoes),
    },
    contas: usuarios.map((u) => ({ uid: u.id, email: u.email, senha: SENHA_DEMONSTRACAO })),
  };
}
