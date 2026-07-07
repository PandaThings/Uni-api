import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@uniai/baml", "@uniai/database"],
  serverExternalPackages: [
    "@boundaryml/baml",
    "@prisma/client",
  ],
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "client-only": path.resolve(process.cwd(), "vendor/client-only/index.js"),
      "server-only": path.resolve(process.cwd(), "node_modules/server-only/empty.js"),
    };

    if (dev) {
      config.cache = false;
    }

    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
        {
          "@boundaryml/baml": "commonjs @boundaryml/baml",
        },
      ];
    }

    return config;
  },
};

export default nextConfig;
