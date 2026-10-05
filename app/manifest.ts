import type { MetadataRoute } from "next";

/** Permite "Adicionar à tela inicial" no celular, abrindo como app */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "3D Team Assessoria Esportiva",
    short_name: "3D Team",
    description: "Presença nas aulas, Day Use e mensalidades",
    start_url: "/",
    display: "standalone",
    background_color: "#f0f2f6",
    theme_color: "#041533",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
