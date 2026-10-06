/** Gera ids no mesmo estilo do Firestore (20 caracteres alfanuméricos) */
export function gerarId(tamanho = 20): string {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const valores = new Uint8Array(tamanho);
  crypto.getRandomValues(valores);
  for (let i = 0; i < tamanho; i++) id += caracteres[valores[i] % caracteres.length];
  return id;
}

/**
 * Id de notificação que já vem em ordem do mais novo para o mais antigo.
 * Assim o sino busca só as últimas notificações (limite) sem precisar de
 * índice composto: o Firestore devolve os documentos na ordem do id.
 */
export function idNotificacao(): string {
  const inverso = String(9_999_999_999_999 - Date.now()).padStart(13, "0");
  return `${inverso}_${Math.random().toString(36).slice(2, 10)}`;
}
