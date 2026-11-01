import type { NextConfig } from "next";

// GitHub Pages serwuje stronę projektu pod adresem https://<owner>.github.io/<repo>/,
// więc w CI ustawiamy PAGES_BASE_PATH na "/<repo>" (workflow deploy.yml pobiera go z actions/configure-pages).
// Lokalnie oraz przy własnej domenie zmienna jest pusta.
const basePath = process.env.PAGES_BASE_PATH?.replace(/\/$/, "") ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
