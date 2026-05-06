import { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
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
    };
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil",
      // "@napi-rs/canvas": "commonjs @napi-rs/canvas",
      canvas: "commonjs canvas",
    });
    return config;
  },
  outputFileTracingIncludes: {
    "/api/(.*)": ["./prompts/**/*.md"],
  },
  allowedDevOrigins: ["192.168.15.5"],
  // serverExternalPackages: ["pdf-parse"],
} as NextConfig;

export default withNextIntl(nextConfig);
