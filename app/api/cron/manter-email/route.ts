import { emailConfigurado, enviarEmail } from "@/lib/servidor/email";
import { emailManutencao } from "@/lib/servidor/modelosEmail";
import { nomeDaArena, urlDoApp } from "@/lib/servidor/rotas";

/**
 * GET /api/cron/manter-email — chamado pelo Cron do Vercel (vercel.json),
 * dia 1 e 15 de cada mês. Manda um e-mail curto para o próprio remetente da
 * arena: conta como atividade no Brevo, que exclui contas gratuitas paradas
 * por 4 meses, mesmo que ninguém se cadastre nesse tempo.
 */
export const dynamic = "force-dynamic";

function chamadaDoCron(request: Request): boolean {
  const segredo = process.env.CRON_SECRET?.trim();
  // Com CRON_SECRET no Vercel, o cron manda "Authorization: Bearer <segredo>"
  if (segredo) return request.headers.get("authorization") === `Bearer ${segredo}`;
  return (request.headers.get("user-agent") ?? "").startsWith("vercel-cron/");
}

export async function GET(request: Request) {
  if (!chamadaDoCron(request)) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const remetente = process.env.EMAIL_REMETENTE?.trim();
  if (!emailConfigurado() || !remetente) {
    console.warn("[cron] e-mail não configurado: nada enviado");
    return Response.json({ enviado: false, motivo: "e-mail não configurado" });
  }

  try {
    const arena = await nomeDaArena();
    const urlApp = process.env.URL_APP?.trim().replace(/\/+$/, "") || urlDoApp(request);
    await enviarEmail(emailManutencao({ para: remetente, nomeArena: arena, urlApp }), arena);
    return Response.json({ enviado: true });
  } catch (erro) {
    console.error("[cron] falha ao enviar o e-mail de manutenção", erro);
    return Response.json({ enviado: false }, { status: 500 });
  }
}
