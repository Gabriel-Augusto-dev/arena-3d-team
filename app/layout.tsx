import type { Metadata, Viewport } from "next";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource/barlow-condensed/800-italic.css";
import "@fontsource-variable/figtree";
import "./globals.css";
import { ProvedorAutenticacao } from "@/contextos/ContextoAutenticacao";
import { ProvedorAvisos } from "@/contextos/ContextoAvisos";

export const metadata: Metadata = {
  title: {
    default: "3D Team",
    template: "%s · 3D Team",
  },
  description: "Presença nas aulas, Day Use e mensalidades da 3D Team Assessoria Esportiva",
  applicationName: "3D Team",
  appleWebApp: {
    capable: true,
    title: "3D Team",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#041533",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full">
        <ProvedorAvisos>
          <ProvedorAutenticacao>{children}</ProvedorAutenticacao>
        </ProvedorAvisos>
      </body>
    </html>
  );
}
