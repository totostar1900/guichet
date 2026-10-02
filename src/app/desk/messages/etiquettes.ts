/**
 * Le vocabulaire des étiquettes de la boîte aux lettres.
 *
 * POURQUOI EN CODE ET NON EN BASE. La colonne `labels` est du texte libre, et
 * la liste proposée vit ici. Une table de référence aurait demandé une migration
 * pour renommer un mot, et la maison renomme ses mots. Ce qui a été écrit reste
 * écrit : une étiquette retirée d'ici ne disparaît pas des fils qui la portent,
 * elle cesse seulement d'être proposée, et le filtre continue de la retrouver.
 *
 * POURQUOI CES QUATRE. Elles répondent à la seule question que le desk se pose
 * en ouvrant la boîte : de quelle nature est ce courrier, et qui doit s'en
 * occuper. Un régulateur n'attend pas comme un client ; une réclamation a ses
 * délais ; un ordre se rattache à un dossier ; une pièce de KYC bloque une
 * ouverture de compte. Quatre mots tiennent sur une ligne et se choisissent sans
 * réfléchir ; une liste de quinze se parcourt, et une liste qu'on parcourt ne
 * se pose jamais.
 *
 * La teinte vient des familles d'instruments, qui ont déjà leur jeu de couleurs
 * distinctes et lisibles dans les deux thèmes : pas une palette de plus.
 */
export type Etiquette = { cle: string; mot: string; teinte: string; fond: string };

export const ETIQUETTES: Etiquette[] = [
  { cle: "regulateur", mot: "régulateur", teinte: "var(--fam-APE)", fond: "var(--fam-APE-soft)" },
  { cle: "ordre", mot: "ordre", teinte: "var(--fam-ACTION_COTEE)", fond: "var(--fam-ACTION_COTEE-soft)" },
  { cle: "reclamation", mot: "réclamation", teinte: "var(--fam-IPO)", fond: "var(--fam-IPO-soft)" },
  { cle: "kyc", mot: "KYC", teinte: "var(--fam-OBLIGATION_COTEE)", fond: "var(--fam-OBLIGATION_COTEE-soft)" },
];

export const etiquette = (cle: string): Etiquette | undefined => ETIQUETTES.find((e) => e.cle === cle);

/**
 * Le mot à montrer pour une étiquette, y compris une qui ne se propose plus.
 * Elle reste lisible, parce qu'elle reste vraie : quelqu'un l'a posée.
 */
export const motEtiquette = (cle: string): string => etiquette(cle)?.mot ?? cle;
