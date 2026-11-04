import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deixa o Next tratar esta pasta como raiz própria (ela mora dentro de outro projeto por enquanto)
  turbopack: { root: __dirname },
};

export default nextConfig;
