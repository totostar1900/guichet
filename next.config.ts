import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF rendering runs in Node on the server; keep the package out of the bundler.
  serverExternalPackages: ["@react-pdf/renderer", "pdf-parse"],
  // The working notes (docs/notes/*.md) are read from disk by /desk/docs/notes: include them in that function's bundle.
  outputFileTracingIncludes: { "/desk/docs/notes": ["./docs/notes/*.md"] },
  // Phone photos and PDFs go through server actions (KYC pieces, intake sources): the 1 MB default is far too small.
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
  // « Apprendre » and « Simulateur & repères » merged into Info; old links keep working.
  async redirects() {
    return [
      { source: "/apprendre", destination: "/info", permanent: true },
      { source: "/apprendre/:key", destination: "/info/:key", permanent: true },
      { source: "/simulateur", destination: "/info#simulateur", permanent: true },
    ];
  },
};

export default nextConfig;
