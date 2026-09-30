import { redirect } from "next/navigation";

/**
 * L'ancienne adresse de « Mon espace », qui mène maintenant au portefeuille.
 *
 * Les deux pages répondaient à la même question, « qu'est-ce que je possède » :
 * l'une en un chiffre et une courbe, l'autre en détail. Deux pages pour une
 * question sont une de trop, parce qu'on ne sait jamais laquelle ouvrir. Le
 * relevé est devenu le bas du portefeuille, en sections repliées.
 *
 * L'adresse reste servie : elle est partie dans des avis d'opéré, des messages
 * et des relevés.
 */
export const dynamic = "force-dynamic";

export default function MonEspace() {
  redirect("/");
}
