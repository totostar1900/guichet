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
  /* LA PAGE EST GARDÉE CINQ MINUTES CÔTÉ NAVIGATEUR (11 novembre 2026 : 30 s ; 18 novembre 2026 : 300 s, choix du client). Par défaut une page dynamique n'est pas gardée (« staleTimes.dynamic » vaut 0), donc chaque retour recommence au serveur. Revenir sur une page vue il y a moins de cinq minutes l'affiche d'un coup ; au-delà, elle est redemandée.
     POURQUOI CINQ MINUTES : les cours et les valeurs liquidatives ne changent qu'une fois par jour (« boc », 18 h 30 UTC) et la BEAC une fois par jour (« beac », 9 h) ; le client consulte. Ce qu'il écrit lui-même vide cette mémoire : une server action avec « revalidatePath » purge tout le cache du navigateur, et les écritures du client en appellent toutes une (relevé du 18 novembre 2026).
     CE QUE CE RÉGLAGE NE COUVRE PAS : le desk (« RelectureDuDesk » relit chaque page à l'ouverture) et l'écriture d'un ordre, que le serveur relit toujours (« allowedIntents » à l'envoi). L'âge de ce qu'on lit n'est pas affiché : c'est le choix du client. */
  experimental: { serverActions: { bodySizeLimit: "25mb" }, staleTimes: { dynamic: 300 } },
  // « Apprendre » and « Simulateur & repères » merged into Info; old links keep working.
  async redirects() {
    return [
      { source: "/apprendre", destination: "/info", permanent: true },
      { source: "/apprendre/:key", destination: "/info/:key", permanent: true },
      { source: "/simulateur", destination: "/info#simulateur", permanent: true },
      /* Le nom que les clients connaissent des autres maisons : « /legal » mène aux textes et conditions. */
      { source: "/legal", destination: "/info/textes", permanent: true },
    ];
  },
};

export default nextConfig;
