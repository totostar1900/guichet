import { redirect } from "next/navigation";

/**
 * LE GUIDE N'EST PLUS UNE PAGE, C'EST UN GROUPE DU MENU.
 *
 * Il portait six sections repliées sur une seule adresse : une entrée de menu
 * qui n'ouvrait rien, et qu'il fallait descendre et déplier pour atteindre le
 * glossaire — destination de soixante-six entrées de la recherche — ou le
 * simulateur. Les six sont remontées dans le menu « Aide », chacune à son
 * adresse.
 *
 * CETTE ADRESSE RESTE, ET NE FAIT QUE REDIRIGER. Elle est partie dans des
 * messages, elle est citée par le pied de page, par le dossier du client et
 * par le guide du desk : la casser pour gagner un fichier serait payer la
 * propreté avec les liens des autres. Le cliquet « toute page atteignable »
 * nomme explicitement ce cas, celui de « /agir » et de « /moi ».
 */
export default function InfoPage() {
  redirect("/info/eclairages");
}
