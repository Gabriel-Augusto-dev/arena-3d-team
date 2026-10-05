import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite abrir o modo de desenvolvimento pelo celular na rede local
  allowedDevOrigins: ["192.168.100.84"],
};

export default nextConfig;
