import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF rendering runs in Node on the server; keep the package out of the bundler.
  serverExternalPackages: ["@react-pdf/renderer", "pdf-parse"],
  // Phone photos and PDFs go through server actions (KYC pieces, intake sources): the 1 MB default is far too small.
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
};

export default nextConfig;
