import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

/**
 * Configuração do Firebase lida das variáveis de ambiente
 * (.env.local no computador; Settings → Environment Variables no Vercel).
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

/** Só para desenvolvimento: usa os emuladores locais do Firebase */
export const usarEmuladores = process.env.NEXT_PUBLIC_FIREBASE_EMULADOR === "true";

export const firebaseConfigurado = !!configuracaoFirebase.apiKey && !!configuracaoFirebase.projectId;

export function obterAppFirebase(): FirebaseApp {
  if (!firebaseConfigurado) {
    throw new Error(
      "Firebase não configurado. Preencha as variáveis NEXT_PUBLIC_FIREBASE_* (veja env.exemplo)",
    );
  }
  return getApps().length ? getApp() : initializeApp(configuracaoFirebase);
}
