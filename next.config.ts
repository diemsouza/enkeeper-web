import { NextConfig } from "next";
import createMDX from "@next/mdx";
import createNextIntlPlugin from "next-intl/plugin";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
const withNextIntl = createNextIntlPlugin();

// Plugins como funcao: o projeto roda em webpack (Turbopack exigiria strings).
// O frontmatter vira o export `frontmatter` de cada .mdx.
const withMDX = createMDX({
  options: {
    remarkPlugins: [
      remarkGfm,
      remarkFrontmatter,
      [remarkMdxFrontmatter, { name: "frontmatter" }],
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: { unoptimized: true },
  webpack: (config: any) => {
    config.infrastructureLogging = {
      level: "warn", // or 'error'
    };
    // config.infrastructureLogging = {
    //   debug: /PackFileCache/,
    // };
    config.resolve.alias = {
      ...config.resolve.alias,
      handlebars: "handlebars/dist/handlebars.min.js",
      // ogg-opus-decoder faz import() dinamico de @wasm-audio-decoders/opus-ml
      // (WASM de ~4MB) gated por speechQualityEnhancement, opcao que nao usamos.
      // O webpack cria o chunk mesmo assim e a fase emit do dev trava, deixando
      // main-app.js sem ser emitido. Resolve como modulo vazio.
      "@wasm-audio-decoders/opus-ml": false,
    };
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil",
      // "@napi-rs/canvas": "commonjs @napi-rs/canvas",
      canvas: "commonjs canvas",
    });
    // @eshaz/web-worker (transitivo de ogg-opus-decoder, so no caminho de
    // WebWorker que nao usamos) faz require() dinamico e gera "Critical
    // dependency" no bundle. Warning benigno.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /@eshaz\/web-worker/ },
    ];
    return config;
  },
  outputFileTracingIncludes: {
    "/api/(.*)": [
      "./prompts/**/*.md",
      "./assets/fonts/**/*",
      "./email-templates/**/*",
    ],
  },
  allowedDevOrigins: ["192.168.15.5"],
  serverExternalPackages: ["@resvg/resvg-js"],
} as NextConfig;

export default withNextIntl(withMDX(nextConfig));
