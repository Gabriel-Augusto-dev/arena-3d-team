import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { obterAppFirebase, usarEmuladores } from "./configuracao";

/** Instâncias únicas do Auth e do Firestore (no navegador) */
let auth: Auth | null = null;
let firestore: Firestore | null = null;

export function obterAuth(): Auth {
  if (!auth) {
    auth = getAuth(obterAppFirebase());
    if (usarEmuladores) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  }
  return auth;
}

export function obterFirestore(): Firestore {
  if (!firestore) {
    const app = obterAppFirebase();
    try {
      // Cache no aparelho: ao reabrir o app, o Firestore retoma as consultas
      // e cobra só o que mudou (em vez de reler tudo do servidor)
      firestore = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch {
      firestore = getFirestore(app);
    }
    if (usarEmuladores) connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
  }
  return firestore;
}
