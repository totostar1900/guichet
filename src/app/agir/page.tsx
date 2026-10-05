import { redirect } from "next/navigation";

/**
 * « /agir » mène à « /trader », et l'adresse ne bouge pas.
 *
 * Le siège s'appelle Agir depuis le 5 octobre 2026, et quelqu'un qui connaît
 * le nom tapera le nom. L'adresse, elle, a été partagée : un lien de desk, un
 * message WhatsApp, une page mise en favori. On ne change pas une adresse déjà
 * donnée sans laisser le chemin derrière soi, et le plus simple des deux
 * chemins est celui qui n'oblige personne à migrer quoi que ce soit.
 */
export default function AgirPage() {
  redirect("/trader");
}
