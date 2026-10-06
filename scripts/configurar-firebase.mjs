#!/usr/bin/env node
/**
 * Prepara um projeto Firebase NOVO para a 3D Team (rode uma vez por cliente).
 *
 *   npm run configurar-firebase -- --chave "C:\caminho\da\chave.json"
 *
 * A chave é o arquivo baixado em: Console do Firebase → ⚙ Configurações do
 * projeto → Contas de serviço → Gerar nova chave privada.
 *
 * O que ele faz:
 *  1. Cria (ou atualiza) a conta do PROFESSOR ADMINISTRADOR no Authentication
 *  2. Grava usuarios/{uid} com perfil "professor"
 *  3. Cria configuracoes/geral com os valores padrão (se ainda não existir)
 *
 * As demais coleções (turmas, aulas, presencas, pagamentos, notificacoes)
 * o Firestore cria sozinho quando o app grava o primeiro documento.
 *
 * Opções (se faltar alguma, ele pergunta): --nome --email --senha --arena
 */
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function lerArgumentos() {
  const args = {};
  const lista = process.argv.slice(2);
  for (let i = 0; i < lista.length; i++) {
    if (lista[i].startsWith("--")) {
      const chave = lista[i].slice(2);
      const valor = lista[i + 1] && !lista[i + 1].startsWith("--") ? lista[++i] : "true";
      args[chave] = valor;
    }
  }
  return args;
}

const args = lerArgumentos();
const terminal = createInterface({ input: stdin, output: stdout });

async function perguntar(texto, { oculto = false } = {}) {
  if (!oculto) return (await terminal.question(texto)).trim();
  // Esconde a senha enquanto digita
  const escreverOriginal = terminal._writeToOutput;
  terminal._writeToOutput = (s) => (s.includes(texto) ? escreverOriginal.call(terminal, s) : escreverOriginal.call(terminal, "*"));
  const resposta = await terminal.question(texto);
  terminal._writeToOutput = escreverOriginal;
  stdout.write("\n");
  return resposta;
}

function iniciarFirebase() {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    console.log("→ Usando os EMULADORES locais do Firebase");
    return initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || "demo-arena" });
  }
  const caminho = args.chave || process.env.FIREBASE_ADMIN_ARQUIVO;
  let credenciais;
  if (caminho) {
    credenciais = JSON.parse(readFileSync(caminho, "utf8"));
  } else if (process.env.FIREBASE_ADMIN_CREDENCIAIS) {
    credenciais = JSON.parse(process.env.FIREBASE_ADMIN_CREDENCIAIS);
  } else {
    console.error('\n✖ Informe a chave da conta de serviço:  npm run configurar-firebase -- --chave "caminho\\chave.json"\n');
    process.exit(1);
  }
  console.log(`→ Projeto: ${credenciais.project_id}`);
  return initializeApp({ credential: cert(credenciais), projectId: credenciais.project_id });
}

const agora = () => new Date().toISOString();

async function principal() {
  const app = iniciarFirebase();
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log("\nConta do PROFESSOR ADMINISTRADOR (o dono da arena)\n");
  const nome = args.nome || (await perguntar("Nome completo: "));
  const email = (args.email || (await perguntar("E-mail de acesso: "))).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || nome.split(/\s+/).length < 2) {
    throw new Error("Informe nome e sobrenome e um e-mail válido");
  }

  let usuario = await auth.getUserByEmail(email).catch(() => null);
  let senha = args.senha;
  if (!usuario) {
    senha ||= await perguntar("Senha (mínimo 6 caracteres): ", { oculto: true });
    if (!senha || senha.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres");
    usuario = await auth.createUser({ email, password: senha, displayName: nome, emailVerified: true });
    console.log(`✔ Conta criada no Authentication (uid ${usuario.uid})`);
  } else {
    console.log(`• Já existe uma conta com ${email} (uid ${usuario.uid}). Ela vira o professor administrador.`);
    if (senha) {
      await auth.updateUser(usuario.uid, { password: senha });
      console.log("✔ Senha atualizada");
    }
  }

  const refUsuario = db.collection("usuarios").doc(usuario.uid);
  const existente = await refUsuario.get();
  await refUsuario.set(
    {
      perfil: "professor",
      nome,
      email,
      cpf: existente.data()?.cpf ?? "",
      dataNascimento: existente.data()?.dataNascimento ?? "",
      whatsapp: existente.data()?.whatsapp ?? "",
      plano: "avulso",
      turmaId: null,
      validadeMensalidade: null,
      usouExperimental: true,
      ativo: true,
      observacoes: "",
      criadoEm: existente.data()?.criadoEm ?? agora(),
      atualizadoEm: agora(),
    },
    { merge: false },
  );
  console.log('✔ usuarios/' + usuario.uid + ' gravado com perfil "professor"');

  const refConfig = db.collection("configuracoes").doc("geral");
  if (!(await refConfig.get()).exists) {
    await refConfig.set({
      nomeArena: args.arena || "3D Team",
      chavePix: "",
      nomeRecebedorPix: args.arena || "3D Team",
      cidadeRecebedorPix: "",
      valorDayUse: 15,
      valorMensalidadePadrao: 160,
      valorMensalidadeAssociado: 0,
      mensalistaQualquerTurma: false,
      diasCicloMensalidade: 30,
      whatsappContato: "",
      atualizadoEm: agora(),
    });
    console.log("✔ configuracoes/geral criado (PIX e valores você ajusta no app, em Ajustes)");
  } else {
    console.log("• configuracoes/geral já existe (mantido)");
  }

  console.log(`
Pronto! Agora:
  1. Publique as regras: copie firestore.rules em Firestore Database → Regras → Publicar
  2. Entre no app com ${email}
  3. Em Ajustes: cadastre a chave PIX, os valores e (se quiser) o professor auxiliar
  4. Em Turmas: crie as turmas — a agenda de aulas é montada sozinha
`);
}

principal()
  .catch((erro) => {
    console.error("\n✖", erro.message ?? erro);
    process.exitCode = 1;
  })
  .finally(() => terminal.close());
