import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@libsql/client"],
  // a stray /Users/jm/package-lock.json otherwise confuses Turbopack's root inference
  turbopack: { root: process.cwd() },
};

export default nextConfig;
