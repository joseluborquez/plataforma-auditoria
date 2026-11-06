import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Subida de documentos por Server Action. Vercel limita el cuerpo a ~4,5 MB.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
