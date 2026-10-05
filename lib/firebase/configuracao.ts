import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

/**
 * Configuração do Firebase lida do arquivo .env.local
 * (copie .env.exemplo para .env.local e preencha com os dados do console).
 *
 * As variáveis precisam ser escritas por extenso (process.env.NOME) para o
 * Next.js conseguir embuti-las no código do navegador.
 */
export const configuracaoFirebase = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** false = modo demonstração (dados no navegador); true = Firebase */
export const firebaseAtivo = process.env.NEXT_PUBLIC_USAR_FIREBASE === "true";

export function obterAppFirebase(): FirebaseApp {
  if (!configuracaoFirebase.apiKey || !configuracaoFirebase.projectId) {
    throw new Error(
      "Firebase ativado, mas a configuração está incompleta. Confira o arquivo .env.local",
    );
  }
  return getApps().length ? getApp() : initializeApp(configuracaoFirebase);
}

/**
 * App secundário usado pelo professor para criar contas de alunos sem
 * perder a própria sessão (createUserWithEmailAndPassword faz login
 * automático na instância em que é chamado).
 */
export function obterAppFirebaseSecundario(): FirebaseApp {
  const nome = "secundario";
  return getApps().find((app) => app.name === nome) ?? initializeApp(configuracaoFirebase, nome);
}
