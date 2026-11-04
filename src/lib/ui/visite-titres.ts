import type { CoachStop } from "@/components/mobile/CoachMarks";

/**
 * « COMMENT LIRE CETTE PAGE ? » SUIT LA VUE (7 novembre 2026, planche 3b).
 *
 * La visite était un parcours fixe de sept arrêts, le même en cartes détaillées, en cartes compactes, en liste ou en tableau, et elle ne disait rien
 * des repères que la carte porte vraiment : coupon, pastille d'état, cloche, grille, clôture, dos. Elle se compose maintenant de trois étages :
 * les repères communs (marchés, fonds, filtres, affichage), ceux de la VUE (carte détaillée, carte compacte, liste, tableau) et ceux de la PAGE
 * (adjudications ou cote). Un repère absent de l'écran est sauté par « CoachMarks » : on peut donc lister large sans promettre ce qu'on ne montre pas.
 * Le ton est celui d'un guide : ce qu'on lit, puis ce qu'on peut en faire.
 */
export type VueDeLaVisite = "detaillees" | "compactes" | "liste" | "tableau";
export type PageDeLaVisite = "adjudications" | "cote";
type T = (cle: string, params?: Record<string, string>) => string;

export function visiteDesTitres({ vue, page, t }: { vue: VueDeLaVisite; page: PageDeLaVisite; t: T }): CoachStop[] {
  const adj = page === "adjudications";
  const communs: CoachStop[] = [
    { target: "titres-marches", title: t("Deux marchés, deux interrupteurs"), text: t("Marché primaire : vous souscrivez auprès de l'émetteur pendant une fenêtre. Marché secondaire : vous achetez à un autre investisseur au cours du jour. Les deux sont affichés ; éteignez-en un pour ne voir que l'autre.") },
    { target: "titres-fonds", title: t("Les fonds ont leur page"), text: t("Les parts de fonds (OPCVM) se souscrivent à la prochaine valeur liquidative : elles ont leur propre tableau, avec leurs catégories et leur société de gestion.") },
    { target: "titres-filtres", title: t("Filtrer, puis trier"), text: t("Instrument, pays, statut, durée, rendement : chaque filtre s'ajoute aux autres, et le compte des lignes retenues s'affiche à côté. Le tri se prend dans la même feuille, y compris par variation du cours. Tri et filtres restent dans l'adresse de la page : revenez d'une fiche, la liste est telle que vous l'aviez laissée.") },
    { target: "titres-vues", title: t("Quatre façons de lire"), text: t("Tableau, liste ou cartes ; en cartes, détaillées ou compactes. Le tableau compare les chiffres colonne par colonne, la liste se lit d'un trait, la carte détaillée dit tout, la carte compacte ne garde que l'essentiel. Cette visite s'adapte à celle que vous avez choisie.") },
  ];
  const groupe: CoachStop = { target: "titres-groupe", title: t("Le titre d'un groupe"), text: t("Les lignes se rangent par type ou par émetteur. Touchez le titre pour sauter à un autre groupe ; le chevron plie ou déplie le groupe, et la flèche du haut plie ou déplie tout.") };
  const swipe: CoachStop = { target: "titres-carte", title: t("Tirez la carte vers la gauche"), text: t("Trois actions apparaissent sous la carte. Contacter ouvre un message prêt à envoyer sur cette ligne. Déclarer ouvre une intention, sans engagement. La troisième dépend du marché : sur la cote c'est Suivre, qui vous prévient à chaque mouvement de la ligne ; à l'adjudication c'est Alerte, qui vous rappelle chaque jour jusqu'à la clôture du dépôt.") };

  if (vue === "detaillees") {
    return [
      ...communs,
      groupe,
      { target: "titres-etat", title: t("L'état de la ligne"), text: t("La pastille dit où en est la ligne : Ouverte, Clôturée, ou Cotée sur la BVMAC ; avant la clôture elle compte à rebours. La cloche paraît quand vous suivez la ligne, et « ⋯ » ouvre le suivi, le contact et l'intention.") },
      adj
        ? { target: "titres-prix", title: t("Coupon et rendement"), text: t("Deux chiffres. Le coupon est ce que le Trésor verse chaque année sur le nominal. Le rendement actuariel est ce que vous gagnez en gardant la ligne jusqu'à l'échéance, au prix écrit dessous : « si servi à 97 % » avant l'adjudication, « servi à 97 % » après. Un rachat se lit à 100 % du nominal.") }
        : { target: "titres-prix", title: t("Le cours et sa variation"), text: t("Pour une action, le cours est en grand, avec sa variation sur trois mois et la forme de sa courbe : une performance passée, hors dividendes, qui ne préjuge pas de l'avenir. Pour une obligation, le coupon et le rendement actuariel passent devant.") },
      adj
        ? { target: "titres-grille", title: t("La grille de la ligne"), text: t("L'échéance, avec sa durée restante ; le ticket minimum, qui est le plus petit montant que vous pouvez souscrire ; le volume, quand la séance en annonce un.") }
        : { target: "titres-grille", title: t("Dividende et liquidité"), text: t("Le dividende du dernier exercice et son rendement. « Cours inchangé depuis » dit depuis combien de temps la ligne ne s'est pas échangée : c'est le meilleur repère de sa liquidité, et il est écrit sur chaque carte.") },
      { target: "titres-pied", title: t("Le pied de la carte"), text: t("L'ISIN sert à passer un ordre auprès de votre banque. La clôture dit jusqu'à quand déposer. « Voir la fiche » ouvre tout le détail de la ligne.") },
      swipe,
      { target: "titres-carte", title: t("Une face suffit"), text: t("En vue détaillée la carte dit déjà tout ce qu'on peut en dire, c'est pourquoi elle n'a pas de dos. Pour une lecture plus courte, choisissez la vue compacte dans « Affichage ».") },
    ];
  }
  if (vue === "compactes") {
    return [
      ...communs,
      groupe,
      { target: "titres-chiffre", title: t("Le chiffre de la tuile"), text: adj ? t("Le rendement actuariel d'abord ; dessous, le prix servi ou attendu. Le nom, l'échéance et la clôture sont sur la tuile, le reste est au dos.") : t("Le cours d'une action, avec sa variation sur trois mois ; pour une obligation, son rendement actuariel. Le nom et le dividende sont sur la tuile, le reste est au dos.") },
      swipe,
      { target: "titres-retourner", title: t("Le dos est la carte détaillée"), text: t("Touchez l'icône, ou tirez vers la droite : le dos montre la carte détaillée de la ligne, avec la pastille d'état, le coupon et le rendement ou le cours, la grille, la clôture et l'ISIN. Retournez-la de la même façon pour revenir.") },
    ];
  }
  if (vue === "liste") {
    return [
      ...communs,
      { target: "titres-groupe", title: t("La liste, d'un trait"), text: t("Une ligne par instrument : nom, émetteur, pays, état, puis le chiffre en avant. Le rendement actuariel ou le cours s'y lit toujours en premier ; les couleurs des variations disent la hausse ou la baisse sur trois mois.") },
    ];
  }
  return [
    ...communs,
    { target: "titres-groupe", title: t("Le tableau compare"), text: t("Chaque colonne est un indicateur : rendement, coupon, échéance, ticket, cours, variation. Touchez un en-tête pour trier ; deux lignes cochées se comparent côte à côte.") },
  ];
}
