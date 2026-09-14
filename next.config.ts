import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF rendering runs in Node on the server; keep the package out of the bundler.
  serverExternalPackages: ["@react-pdf/renderer", "pdf-parse"],
};

export default nextConfig;
