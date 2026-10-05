import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Firebase Admin — roda SOMENTE no servidor (rotas em app/api).
 * Usado para criar contas pelo professor e gerar os links de senha.
 *
 * Credenciais (Console do Firebase → Configurações do projeto → Contas de
 * serviço → Gerar nova chave privada), em UMA destas formas:
 *  - FIREBASE_ADMIN_CREDENCIAIS = conteúdo inteiro do arquivo .json
 *  - FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY
 */

export class ErroConfiguracao extends Error {}

interface Credenciais {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function lerCredenciais(): Credenciais | null {
  const json = process.env.FIREBASE_ADMIN_CREDENCIAIS?.trim();
  if (json) {
    try {
      const dados = JSON.parse(json) as { project_id?: string; client_email?: string; private_key?: string };
      if (dados.project_id && dados.client_email && dados.private_key) {
        return { projectId: dados.project_id, clientEmail: dados.client_email, privateKey: dados.private_key };
      }
    } catch {
      throw new ErroConfiguracao("FIREBASE_ADMIN_CREDENCIAIS não é um JSON válido");
    }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Aceita a chave com quebras de linha reais ou escritas como \n (comum no .env e no Vercel)
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) return { projectId, clientEmail, privateKey };
  return null;
}

function app(): App {
  const existente = getApps()[0];
  if (existente) return existente;

  // Emuladores locais (desenvolvimento/testes): não precisam de credencial
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-arena" });
  }

  const credenciais = lerCredenciais();
  if (!credenciais) {
    throw new ErroConfiguracao(
      "Servidor sem as credenciais do Firebase Admin. Configure FIREBASE_ADMIN_CREDENCIAIS (veja o README)",
    );
  }
  return initializeApp({ credential: cert(credenciais), projectId: credenciais.projectId });
}

export const authAdmin = () => getAuth(app());
export const bancoAdmin = () => getFirestore(app());
