import type { MetadataRoute } from "next";

/** « Ajouter à l'écran d'accueil » : icône, plein écran, couleurs de la marque. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Guichet · Purpose Capital",
    short_name: "Guichet",
    description: "Opportunités et instruments financiers en CEMAC — titres publics, BVMAC, fonds.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#0b2545",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
