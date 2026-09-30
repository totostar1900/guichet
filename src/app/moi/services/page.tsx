import { redirect } from "next/navigation";

/**
 * L'ancienne adresse des services, qui mène maintenant à Trader.
 *
 * « Mes services » et la page d'entrée des neuf gestes étaient deux vues de la
 * même chose : l'une disait l'état, l'autre aurait dit la procédure. Elles n'en
 * font plus qu'une, sous le siège qui porte la question « qu'est-ce que je peux
 * faire ». L'adresse reste servie parce qu'elle est partie dans des messages.
 */
export const dynamic = "force-dynamic";

export default function AnciensServices() {
  redirect("/trader");
}
