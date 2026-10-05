import { GUIDE } from "@/data/desk-guide";
import { LESSONS } from "@/data/lessons";

/**
 * LA SECTION DU GUIDE QUI PARLE DE CETTE PAGE.
 *
 * Un guide qu'on ouvre à sa première page demande au lecteur de retrouver, dans
 * vingt sections, celle qui parle de l'écran qu'il a sous les yeux. Il ne le
 * fait pas : il referme. La porte doit donc s'ouvrir à la bonne page.
 *
 * La correspondance vivait écrite à la main dans le menu de l'application, pour
 * le desk seulement, et nulle part pour le client. Elle vit ici, une fois, et
 * un cliquet vérifie que chaque adresse citée mène à une section qui existe :
 * une ancre vers une section disparue ouvre le guide en haut, sans rien dire.
 */
export interface LienGuide {
  href: string;
  /** Le titre de la section visée, pour que la commande dise où elle mène. */
  titre: string;
}

/**
 * Le desk : la table des sections porte déjà le chemin de chaque page.
 *
 * Les chemins à paramètre y sont écrits « /desk/intentions/… » : on compare
 * donc sur le préfixe stable, ce qui précède les points de suspension.
 */
export function sectionDuDesk(path: string): LienGuide | undefined {
  const s = GUIDE.find((g) => g.path !== "/desk" && path.startsWith(g.path.replace(/\/….*$/, ""))) ?? (path === "/desk" ? GUIDE.find((g) => g.path === "/desk") : undefined);
  return s ? { href: `/desk/guide#${s.key}`, titre: s.title } : undefined;
}

/**
 * Le client : un éclairage par famille d'écrans, et seulement là où un éclairage dit
 * vraiment quelque chose de la page.
 *
 * On ne force pas la correspondance. Le tableau de bord, Trader et le profil
 * n'ont pas de éclairage qui les explique, et un lien qui mènerait « quelque part
 * dans le guide » vaudrait moins que pas de lien du tout.
 *
 * L'ordre compte : la fiche d'un fonds commence par « /offres/fund- », qui est
 * aussi un préfixe de « /offres ». Le plus précis d'abord.
 */
const LECONS: [prefixe: string, cle: string][] = [
  ["/offres/fund-", "fonds-vl"],
  ["/fonds", "fonds-vl"],
  ["/calendrier", "adjudication"],
  ["/societes", "action-cotee"],
  ["/emetteurs", "action-cotee"],
  ["/indice", "indice-bvmac"],
  ["/comparer", "coupon-et-rendement"],
  ["/info/risques", "les-quatre-risques"],
  ["/titres", "lire-une-ota"],
  ["/offres", "lire-une-ota"],
];

export function leconDuClient(path: string): LienGuide | undefined {
  const trouve = LECONS.find(([p]) => path === p || path.startsWith(`${p}/`) || path.startsWith(p));
  if (!trouve) return undefined;
  const lecon = LESSONS.find((l) => l.key === trouve[1]);
  return lecon ? { href: `/info/${lecon.key}`, titre: lecon.title } : undefined;
}

/** La porte du guide depuis la page courante, côté desk ou côté client. */
export const lienDuGuide = (path: string, desk: boolean): LienGuide | undefined => (desk && path.startsWith("/desk") ? sectionDuDesk(path) : leconDuClient(path));

/** Les clefs citées par la table des éclairages, pour le cliquet. */
export const CLES_LECONS = LECONS.map(([, cle]) => cle);
