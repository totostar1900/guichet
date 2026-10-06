import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF rendering runs in Node on the server; keep the package out of the bundler.
  /* PDFJS-DIST DOIT RESTER HORS DU PAQUET, et la production l'a prouvé.
     Empaqueté, pdf.js se retrouve seul : il va chercher son « worker » à côté
     de lui, c'est à dire dans .next/server/chunks, où le compilateur ne l'a
     pas émis, et rend « Setting up fake worker failed: Cannot find module
     /var/task/.next/server/chunks/pdf.worker.mjs ». La lecture géométrique
     n'a donc jamais tourné en ligne, alors qu'elle passait en local, où le
     paquet entier est à sa place dans node_modules.
     L'avertissement de compilation « require() resolves to an EcmaScript
     module » ne s'applique pas ici : nous le chargeons par import dynamique,
     qui sait lire un module ES. */
  serverExternalPackages: ["@react-pdf/renderer", "pdf-parse", "pdfjs-dist"],
  outputFileTracingIncludes: {
    // The working notes (docs/notes/*.md) are read from disk by /desk/docs/notes: include them in that function's bundle.
    "/desk/docs/notes": ["./docs/notes/*.md"],
    /* Le « worker » de pdf.js n'est référencé par aucune ligne de code : il
       est chargé par un chemin calculé à l'exécution, donc rien ne le
       signalerait au traceur, et il manquerait à la fonction. Les trois
       chemins qui lisent un bulletin le réclament. */
    "/api/cron/boc": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
    "/desk/bulletins": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
    "/desk/marche": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
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
