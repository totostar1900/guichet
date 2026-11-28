import type { MetadataRoute } from "next";

/** « Ajouter à l'écran d'accueil » : icône, plein écran, couleurs de la marque. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Guichet · Purpose Capital",
    short_name: "Guichet",
    description: "Opportunités et instruments financiers en CEMAC : titres publics, BVMAC, fonds.",
    start_url: "/",
    display: "standalone",
    /* LE FOND DE L'ÉCRAN DE LANCEMENT D'ANDROID (28 novembre 2026) : le même que le fond sombre de l'application d'un client connecté (`--paper` en sombre, globals.css), pour que le passage du logo statique à l'écran animé ne clignote pas du clair au sombre. */
    background_color: "#0e1928",
    theme_color: "#0b2545",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
