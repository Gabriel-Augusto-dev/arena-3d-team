# 3D Team — Assessoria Esportiva

Sistema web da 3D Team: presença nas aulas, Day Use, dia extra e mensalidades com PIX. Feito para o celular primeiro, mas funciona no computador. Roda no **Vercel** com **Firebase** (Authentication + Cloud Firestore) e manda e-mails pelo **Brevo**.

## Perfis

Existe **um único login**. Depois de entrar, o sistema lê o campo `perfil` do usuário e abre a área certa. Ninguém escolhe o perfil na tela.

| Perfil (`perfil`) | Quem é | O que pode |
| --- | --- | --- |
| `professor` | Professor **administrador** (dono da arena) | Tudo: alunos, turmas, aulas, dia extra, financeiro, ajustes, equipe. **Só ele confirma pagamentos** |
| `auxiliar` | **Professor auxiliar** (trabalha para o administrador) | Vê alunos, turmas, aulas, a lista de presença e **se cada aluno já pagou**. Gera o link da lista de presença. Não confirma pagamentos, não vê o Financeiro nem os Ajustes, não cadastra/edita alunos ou turmas, não vê CPF |
| `aluno` | Aluno | Marca presença, paga pelo PIX, acompanha mensalidade e histórico |

O administrador cadastra o auxiliar na página **Equipe**. O auxiliar recebe um e-mail para criar a senha. Para tirar o acesso, toque em **Desativar** (ele é deslogado na hora).

### Professor auxiliar: turmas, Ganhos e repasse

- Cada turma (e cada dia extra) tem um **professor responsável**. O auxiliar vê só as turmas, aulas e alunos dele.
- **Equipe** (administrador): aulas, presenças, alunos e valores confirmados de cada auxiliar por período, com a porcentagem de repasse.
- **Ganhos** (auxiliar): o mesmo relatório das aulas dele, com o campo da porcentagem que ele recebe.

### Mensalista associado

Associado existe só para mensalista: ele paga a **Mensalidade associado** definida em **Ajustes** (em branco = valor normal da turma). O Day Use é igual para todos. O administrador marca qualquer mensalista como associado (ficha do aluno ou Editar); o auxiliar só os mensalistas dele (o servidor confere).

## Rodando no computador

Precisa do **Node.js 22 ou mais novo**.

```bash
npm install
copy env.exemplo .env.local     # Windows (no Mac/Linux: cp env.exemplo .env.local)
# preencha o .env.local (veja "Configuração" abaixo)
npm run dev
```

Abra http://localhost:3000. Para testar no celular na mesma rede: `npm run dev:celular`.

## Configuração (uma vez por cliente)

Cada cliente tem o **próprio projeto Firebase** (os dados ficam separados).

### 1. Firebase

1. Em [console.firebase.google.com](https://console.firebase.google.com), crie um projeto e adicione um **App da Web** (ícone `</>`). Copie os valores do `firebaseConfig` para as variáveis `NEXT_PUBLIC_FIREBASE_*`.
2. **Authentication → Começar → E-mail/senha → Ativar.**
3. **Firestore Database → Criar banco de dados** → modo de **produção** → região `southamerica-east1` (São Paulo).
4. **Regras:** abra *Firestore Database → Regras*, apague o conteúdo, cole o arquivo `firestore.rules` inteiro e clique em **Publicar**.
   (Ou pelo terminal: `npx firebase-tools deploy --only firestore --project ID_DO_PROJETO`.)
5. **Chave do servidor:** ⚙ *Configurações do projeto → Contas de serviço → Gerar nova chave privada*. Guarde o arquivo `.json` (não envie para o GitHub).
6. **Authentication → Configurações → Domínios autorizados:** adicione o domínio do app no Vercel (ex.: `arena-3d-team.vercel.app` e o domínio próprio, se tiver).

### 2. Criar o professor administrador e as configurações

O Firestore **não tem tabelas para criar**: cada coleção nasce sozinha quando o app grava o primeiro documento. O que precisa existir antes é o professor e as configurações — este comando faz isso:

```bash
npm run configurar-firebase -- --chave "C:\caminho\da\chave.json"
```

Ele pergunta nome, e-mail e senha do professor e cria:

- a conta no **Authentication**;
- `usuarios/{uid}` com `perfil: "professor"`;
- `configuracoes/geral` com os valores padrão.

Pode rodar de novo sem problema (não duplica nada). Depois, entre no app e vá em **Ajustes** (chave PIX, valores, equipe) e **Turmas** (a agenda das próximas 3 semanas é montada sozinha).

### 3. Brevo (e-mails)

1. Em [brevo.com](https://www.brevo.com), vá em *Remetentes, domínios e IPs* e **valide o e-mail remetente** (ou o domínio inteiro — melhor para não cair no spam).
2. Em *Configurações → SMTP e API → SMTP*, copie o **Login** (`SMTP_USER`) e gere uma **Chave SMTP** (`SMTP_PASS`).
3. Preencha `EMAIL_REMETENTE` com o remetente validado.

E-mails que o app envia:

| Quando | E-mail |
| --- | --- |
| Professor cadastra um aluno ou auxiliar | "Seu acesso ao app" com o botão **Criar minha senha** |
| Professor toca em **Reenviar acesso** | O mesmo e-mail, com um link novo |
| Aluno se cadastra sozinho | Boas-vindas com o botão **Confirmar meu e-mail** |
| Aluno toca em **Reenviar e-mail** | Link novo de confirmação |
| "Esqueci minha senha" | Link para criar uma senha nova |

Os links de senha abrem a tela `/criar-senha` do próprio app e valem por **1 hora** (limite do Firebase). O de confirmação abre `/confirmar-email`.

**Confirmação de e-mail:** o aluno que se cadastra sozinho só acessa a área dele depois de tocar no link do e-mail (até lá vê a tela *Confirme seu e-mail*, com **Já confirmei** e **Reenviar e-mail**). Contas criadas pelo professor e contas antigas não passam por isso. Sem o Brevo configurado, a conta é liberada direto. Se o e-mail não sair (Brevo fora do ar ou sem configuração), o professor vê o link na tela para mandar pelo WhatsApp.

*Opcional:* para que os poucos e-mails enviados pelo próprio Firebase também saiam pelo Brevo, em *Authentication → Modelos → Configurações de SMTP* use `smtp-relay.brevo.com`, porta `587`, e o mesmo login e chave.

### 4. Vercel

Em *Settings → Environment Variables*, cadastre as mesmas variáveis do `.env.local`:

| Variável | Onde pegar |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID`, `..._STORAGE_BUCKET`, `..._MESSAGING_SENDER_ID`, `..._APP_ID` | App da Web no Firebase |
| `FIREBASE_ADMIN_CREDENCIAIS` | Conteúdo **inteiro** do `.json` da conta de serviço |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_REMETENTE` | Brevo |
| `EMAIL_REMETENTE_NOME` (opcional) | Nome que aparece no e-mail (padrão: nome da arena) |
| `URL_APP` | Endereço público do app, ex.: `https://app.3dteam.com.br` (usado nos links dos e-mails) |

Depois de salvar, faça um **Redeploy**.

## Estrutura do banco (Cloud Firestore)

Datas são texto: `"2026-10-05"` para dias e `"2026-10-05T19:30:00.000Z"` para data e hora. Os tipos completos estão em `tipos/entidades.ts`.

### Índices compostos (3)

Estão em `firestore.indexes.json`. Crie uma vez por projeto, de um destes jeitos:

- Terminal: `npx firebase-tools deploy --only firestore:indexes --project ID_DO_PROJETO`
- Console: **Firestore → Índices → Criar índice** (modo Coleção, campos em ordem crescente):

| Coleção | Campo 1 | Campo 2 |
| --- | --- | --- |
| `presencas` | `alunoId` | `dataAula` |
| `pagamentos` | `alunoId` | `criadoEm` |
| `aulas` | `turmaId` | `data` |

Sem eles o app **continua funcionando** (busca pelo primeiro campo e filtra no aparelho), só lê mais documentos; o console do navegador mostra um aviso com o link para criar.

### Economia de leituras

O plano gratuito tem 50 mil leituras e 20 mil gravações por dia. O app foi feito para ficar bem abaixo disso:

- **Cache no aparelho:** ao reabrir o app, o Firestore retoma as consultas e cobra só o que mudou.
- **Professor:** carrega só aulas e presenças da última semana em diante, os pagamentos em aberto e os dos últimos 35 dias. Histórico do Financeiro, ficha do aluno e relatório da Equipe são buscados só quando a tela é aberta, e só o período escolhido.
- **Aluno:** carrega as aulas e presenças de hoje em diante e os pagamentos dos últimos 12 meses (mais os em aberto).
- **Notificações:** só as 30 mais recentes (o id já nasce em ordem do mais novo para o mais antigo).
- **Agenda automática:** conferida uma vez por dia em cada aparelho do professor.

**`usuarios`** — ID = UID do Firebase Auth

| Campo | Tipo | Observação |
| --- | --- | --- |
| `perfil` | texto | `professor`, `auxiliar` ou `aluno` |
| `nome`, `email`, `cpf`, `whatsapp` | texto | CPF e WhatsApp só com números |
| `dataNascimento` | texto | `AAAA-MM-DD` ou vazio |
| `plano` | texto | `mensalista` ou `avulso` (professor/auxiliar: `avulso`) |
| `turmaId` | texto ou null | Turma do mensalista |
| `validadeMensalidade` | texto ou null | Último dia pago |
| `ativo` | booleano | `false` = não entra mais |
| `observacoes` | texto | Só a equipe vê |
| `criadoEm`, `atualizadoEm` | texto | Data e hora |

**`turmas`** — ID automático: `nome`, `nivel` (`iniciante`/`intermediario`/`avancado`/`livre`), `diasSemana` (lista de 0=domingo…6=sábado), `horarioInicio`, `horarioFim` (`HH:mm`), `valorMensalidade` (número), `local`, `ativa`, `criadoEm`, `atualizadoEm`.

**`aulas`** — ID `{turmaId}_{AAAA-MM-DD}` (dia extra: `dia_extra_{AAAA-MM-DD}`): `turmaId`, `data`, `horarioInicio`, `horarioFim`, `status` (`agendada`/`cancelada`), `motivoCancelamento`, `criadoEm`, `atualizadoEm`.

**`presencas`** — ID automático: `aulaId`, `turmaId`, `dataAula`, `alunoId`, `alunoNome`, `tipo` (`mensalista`/`day_use`), `status` (`confirmada`/`cancelada`), `pagamentoId` (cobrança do Day Use ou null), `criadoEm`, `atualizadoEm`.

**`pagamentos`** — ID automático: `alunoId`, `alunoNome`, `tipo` (`mensalidade`/`day_use`), `valor`, `forma` (`pix`/`dinheiro`/`outro`), `status` (`pendente`/`em_analise`/`confirmado`/`recusado`/`cancelado`), `vencimento`, `aulaId`, `presencaId`, `turmaId`, `cicloInicio`, `cicloFim`, `informadoEm`, `observacaoAluno`, `motivoRecusa`, `confirmadoPor`, `confirmadoEm`, `criadoEm`, `atualizadoEm`.

**`notificacoes`** — ID automático: `usuarioId` (destinatário) **ou** `paraPerfil: "professor"`, `tipo`, `titulo`, `mensagem`, `link`, `lida`, `criadoEm`.

**`configuracoes`** — documento único `geral`: `nomeArena`, `chavePix`, `nomeRecebedorPix`, `cidadeRecebedorPix`, `valorDayUse`, `valorMensalidadePadrao`, `mensalistaQualquerTurma`, `diasCicloMensalidade`, `whatsappContato`, `atualizadoEm`.

## Regras de negócio

Não existe limite de vagas. **Todo aluno marca presença** em cada aula que vai, e a equipe vê a lista de quem vem.

| Regra | Onde está no código |
| ----- | ------------------- |
| Mensalista em dia marca presença sem custo (na própria turma; ou em qualquer turma, se ligado em Ajustes) | `servicos/regras/regrasAula.ts` (`avaliarPresenca`) |
| Day Use: marca presença e gera uma cobrança (valor em Ajustes) | `servicos/servicoPresencas.ts` (`marcarPresenca`) |
| Dia extra: treino fora da agenda, todos pagam diária (inclusive mensalistas) | `servicos/servicoAulas.ts` (`criarDiaExtra`) |
| Day Use pago até a meia-noite do dia da aula; depois fica **em atraso** e **bloqueia** novas presenças | `servicos/regras/regrasPagamento.ts` |
| Mensalista com a mensalidade atrasada (ou sem o 1º pagamento) **não marca presença** até pagar; avisar o PIX já libera enquanto o professor confere | `servicos/regras/regrasAula.ts` (`mensalidade_pendente`) |
| Só o professor administrador confirma pagamentos | `servicos/servicoPagamentos.ts` + `firestore.rules` |
| Mensalidade confirmada → novo ciclo de dias (Ajustes) | `servicos/regras/regrasMensalidade.ts` |
| Quem pode o quê (professor / auxiliar / aluno) | `lib/permissoes.ts` (tela) + `firestore.rules` (banco) |

## Estrutura de pastas

```
app/
  entrar/            Login único (o sistema detecta o perfil)
  cadastro/          Cadastro do próprio aluno
  criar-senha/       Tela dos links de e-mail (criar / trocar senha)
  confirmar-email/   Tela do link de confirmação de e-mail do cadastro
  aluno/             Início, aulas, pagamentos, perfil
  professor/         Início, alunos (+ ficha), turmas/aulas, financeiro*, ajustes*   (*só administrador)
  api/               Rotas do servidor: contas, reenvio de acesso, boas-vindas, senha
componentes/         Interface, navegação, aulas, pagamentos, telas da equipe
contextos/           Sessão, avisos e dados em tempo real de cada área
lib/
  banco/             Acesso ao Firestore (as telas nunca falam com o Firebase direto)
  autenticacao/      Firebase Auth
  servidor/          Firebase Admin, envio de e-mail (Brevo) e modelos dos e-mails
  permissoes.ts      Perfis e o que cada um pode
servicos/            Operações de negócio; servicos/regras = regras puras
scripts/             configurar-firebase.mjs (professor + configurações iniciais)
firestore.rules      Regras de segurança do Firestore
```

## Desenvolvimento com emuladores (opcional)

Para testar sem mexer no projeto real: `npx firebase-tools emulators:start --only auth,firestore --project demo-arena` e, no `.env.local`, `NEXT_PUBLIC_FIREBASE_EMULADOR=true`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-arena`, `NEXT_PUBLIC_FIREBASE_API_KEY=qualquer`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` e `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`.

## Próximos passos sugeridos

- Levar para uma **Cloud Function** as conferências que hoje ficam só no app: mensalidade vencida (mensalista com validade expirada marcando sem custo) e horário da aula ao desmarcar Day Use. As regras do Firestore já impedem o aluno de confirmar pagamentos, mudar valores ou mexer nos dados de outros.
- Notificações push (Firebase Cloud Messaging) para lembrar o aluno de marcar presença e de pagar o Day Use.
- E-mail automático quando o professor confirma ou recusa um pagamento.

## Logo

A logo fica em `public/marca/` (`logo-3d-team.webp` completa e `lobo.webp` recortada). Os ícones do app (`app/icon.svg`, `app/apple-icon.png`, `app/favicon.ico`) foram gerados a partir dela.
