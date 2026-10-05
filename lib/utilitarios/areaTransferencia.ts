/** Copia texto para a área de transferência (com plano B para navegadores antigos) */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const campo = document.createElement("textarea");
      campo.value = texto;
      campo.setAttribute("readonly", "");
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(campo);
      return ok;
    } catch {
      return false;
    }
  }
}
