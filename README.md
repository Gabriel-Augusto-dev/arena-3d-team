# 3D Team — Assessoria Esportiva

Sistema web da 3D Team: presença nas aulas, Day Use, aula experimental e mensalidades com PIX. Feito para o celular primeiro, mas funciona no computador.

- **Aluno**: marca presença nas aulas que vai, paga Day Use pelo PIX (antes ou depois da aula), faz a experimental, acompanha a mensalidade e o histórico.
- **Professor (administrador)**: vê quem vai em cada aula, confere os PIX, cobra quem está em atraso e gerencia alunos, turmas e financeiro.

Existe **um único login**. Depois de entrar, o sistema lê o campo `perfil` do usuário (`"aluno"` ou `"professor"`) e abre a área certa. Ninguém escolhe o perfil na tela.

## Rodando

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

### Modo demonstração (padrão)

Sem configurar nada, os dados ficam salvos no navegador (localStorage) com exemplos prontos. Senha de todas as contas: `arena123`.

| Conta                   | Situação                                           |
| ----------------------- | -------------------------------------------------- |
| `professor@arena3d.com` | Professor                                          |
| `aluno@arena3d.com`     | Mensalista em dia (turma Iniciante)                |
| `bruno@arena3d.com`     | Mensalidade atrasada (marca presença como Day Use) |
| `carla@arena3d.com`     | Avulsa nova, ainda pode fazer a experimental       |
| `gabriela@arena3d.com`  | Day Use em atraso — presença bloqueada             |
| `marcos@arena3d.com`    | Avulso com Day Use a pagar (no prazo)              |

Dica: cada aba do navegador guarda uma sessão. Abra o professor numa aba e um aluno em outra — as mudanças aparecem em tempo real nas duas. Para zerar tudo, use **Restaurar dados de demonstração** (Perfil do aluno ou Ajustes do professor).

## Regras de negócio

Não existe limite de vagas. **Todo aluno marca presença** em cada aula que vai, e o professor vê a lista de quem vem.

| Regra | Onde está no código |
| ----- | ------------------- |
| Mensalista em dia marca presença sem custo (na própria turma; ou em qualquer turma, se ligado em Ajustes) | `servicos/regras/regrasAula.ts` (`avaliarPresenca`) |
| Day Use: marca presença e gera uma cobrança (valor em Ajustes, padrão R$ 15) | `servicos/servicoPresencas.ts` (`marcarPresenca`) |
| Day Use pode ser pago antes ou depois da aula, até a meia-noite do dia da aula | `servicos/regras/regrasPagamento.ts` (`estaEmAtraso`) |
| Day Use não pago depois da meia-noite fica **em atraso** e **bloqueia** novas presenças | `regrasAula.ts` (situação `bloqueada`) |
| Experimental gratuita, uma única vez | `servicoPresencas.ts` (`marcarExperimental`) |
| Mensalista com mensalidade atrasada marca presença como Day Use | `regrasAula.ts` (motivo `mensalidade_atrasada`) |
| Só o professor confirma pagamentos | `servicos/servicoPagamentos.ts` (`confirmarPagamento`) |
| Mensalidade confirmada → novo ciclo de 30 dias | `servicos/regras/regrasMensalidade.ts` (`calcularNovoCiclo`) |

### Fluxos

- **Mensalista**: abre o app → toca em **Vou** na aula → presença marcada.
- **Day Use**: toca em **Vou** → confirma o Day Use → presença marcada e cobrança "a pagar" → paga pelo PIX quando quiser (QR Code e copia e cola gerados no app) → "Já fiz o PIX" → professor confere e confirma.
- **Atraso**: virou a meia-noite do dia da aula sem pagamento → "em atraso". O aluno vê um aviso vermelho e só volta a marcar presença depois de pagar (basta avisar o PIX).
- **PIX não encontrado**: o professor recusa, o aluno é avisado e o Day Use volta a ficar em aberto.
- **Pagamento direto**: o professor toca em **Recebi** (na lista de presença ou em Financeiro → A receber) quando recebe em dinheiro. Mensalidade em dinheiro: ficha do aluno → "Registrar mensalidade recebida".

## Estrutura de pastas

```
app/
  entrar/            Login único (o sistema detecta o perfil)
  cadastro/          Cadastro do aluno (entra como avulso)
  aluno/             Início, aulas, pagamentos, perfil
  professor/         Início, alunos (+ ficha), aulas/turmas, financeiro, ajustes
componentes/
  interface/         Botões, campos, folhas (bottom sheet), selos, abas...
  navegacao/         Estrutura do app (abas inferiores / menu lateral), guarda de rotas, notificações
  aulas/             Ingresso da próxima aula, cartões com botão "Vou", faixa de datas, folha de presença
  pagamentos/        PIX, pagar Day Use, cartão de mensalidade, itens de histórico
  professor/         Lista de presença, PIX para conferir, cobranças, formulários de aluno e turma
contextos/           Sessão, avisos e dados em tempo real de cada área
ganchos/             useColecao / useDocumento (tempo real), agenda do aluno
lib/
  banco/             Adaptador local (localStorage) e adaptador Firebase (Firestore)
  autenticacao/      Autenticação local e Firebase Auth
  firebase/          Configuração lida do .env.local
  dados/             Dados de exemplo do modo demonstração
  utilitarios/       Datas, formatação, validação de CPF, gerador de PIX
servicos/            Operações de negócio (gravam no banco)
  regras/            Regras puras (presença, atraso, situação da mensalidade)
tipos/               Modelo de dados (uma interface por coleção)
firestore.rules      Regras de segurança do Firestore
```

As telas **nunca** falam com o Firebase direto: usam `banco` (`lib/banco`) e `autenticacao` (`lib/autenticacao`). Trocar de localStorage para Firebase é só mudar uma variável.

## Integração com o Firebase

1. Crie um projeto no [console do Firebase](https://console.firebase.google.com) e adicione um **App da Web**.
2. Ative **Authentication → E-mail/senha**.
3. Crie o **Cloud Firestore** (modo produção).
4. Copie `env.exemplo` para um arquivo novo chamado `.env.local`, preencha as chaves e mude `NEXT_PUBLIC_USAR_FIREBASE=true`.
5. Publique as regras: copie o conteúdo de `firestore.rules` em **Firestore → Regras**.
6. Crie o professor:
   - Em **Authentication → Usuários → Adicionar usuário**, cadastre o e-mail e a senha do professor e copie o **UID**.
   - Em **Firestore**, crie a coleção `usuarios` com um documento cujo ID é esse UID:

     ```json
     {
       "perfil": "professor",
       "nome": "Nome do Professor",
       "email": "professor@seudominio.com",
       "cpf": "", "dataNascimento": "", "whatsapp": "",
       "plano": "avulso", "turmaId": null, "validadeMensalidade": null,
       "usouExperimental": true, "ativo": true, "observacoes": "",
       "criadoEm": "2026-10-01T12:00:00.000Z", "atualizadoEm": "2026-10-01T12:00:00.000Z"
     }
     ```
7. Rode `npm run dev`, entre como professor, vá em **Ajustes** e cadastre a chave PIX e os valores. Depois crie as turmas — as aulas das próximas 3 semanas são criadas automaticamente.

Alunos podem se cadastrar sozinhos — no cadastro escolhem **Day Use** ou **Mensalista** (com a turma); depois disso só o professor altera plano e turma — ou ser cadastrados pelo professor (com turma e senha inicial). O mensalista recém-cadastrado começa com a mensalidade "aguardando 1º pagamento" e o professor recebe uma notificação do novo cadastro. Para tornar outra pessoa professor, basta mudar `perfil` para `"professor"` no documento dela.

Nenhum índice composto é necessário: todas as consultas usam um único filtro.

### Coleções

| Coleção         | ID do documento         | Conteúdo                                                   |
| --------------- | ----------------------- | ---------------------------------------------------------- |
| `usuarios`      | UID do Firebase Auth    | Perfil, dados pessoais, plano, turma, validade da mensalidade |
| `turmas`        | automático              | Nome, nível, dias, horário, valor da mensalidade, local |
| `aulas`         | `{turmaId}_{AAAA-MM-DD}` | Ocorrência de uma turma em uma data (pode ser cancelada) |
| `presencas`     | automático              | Aluno que marcou presença numa aula (mensalista, Day Use ou experimental) |
| `pagamentos`    | automático              | Mensalidade ou Day Use: pendente (a pagar), em análise, confirmado, recusado, cancelado |
| `notificacoes`  | automático              | Avisos para um aluno (`usuarioId`) ou para todos os professores (`paraPerfil`) |
| `configuracoes` | `geral`                 | Chave PIX, valor do Day Use, ciclo da mensalidade, mensalista em qualquer turma, WhatsApp |

Os tipos completos de cada documento estão em `tipos/entidades.ts`. Datas são texto ISO (`"2026-10-05"` para dias, `"2026-10-05T19:30:00.000Z"` para data e hora).

### Próximos passos sugeridos

- Levar a conferência do bloqueio por atraso e do tipo de presença para uma **Cloud Function** (hoje são conferidos no app antes de gravar; as regras do Firestore já impedem o aluno de confirmar pagamentos ou mexer em dados de outros).
- Notificações push (Firebase Cloud Messaging) para lembrar o aluno de marcar presença e de pagar o Day Use antes da meia-noite.
- Separar CPF/WhatsApp em uma subcoleção privada se mais perfis tiverem acesso de leitura a `usuarios`.

## Logo

A logo fica em `public/marca/` (`logo-3d-team.webp` completa e `lobo.webp` recortada). Os ícones do app (`app/icon.svg`, `app/apple-icon.png`, `app/favicon.ico`) foram gerados a partir dela.
