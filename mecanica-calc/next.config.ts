import path from "node:path";
import type { NextConfig } from "next";

// Site 100% estático: todas as contas rodam no navegador do aluno.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
