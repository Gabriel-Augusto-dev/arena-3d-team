/** Gera ids no mesmo estilo do Firestore (20 caracteres alfanuméricos) */
export function gerarId(tamanho = 20): string {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const valores = new Uint8Array(tamanho);
  crypto.getRandomValues(valores);
  for (let i = 0; i < tamanho; i++) id += caracteres[valores[i] % caracteres.length];
  return id;
}
