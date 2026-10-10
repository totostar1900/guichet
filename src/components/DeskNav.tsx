import Link from "next/link";
import styles from "./DeskNav.module.css";
import { BarreGelee } from "./BarreGelee";
import { getT } from "@/i18n/server";

/**
 * The desk's navigation: four groups instead of thirteen tabs. Badges count
 * what waits on a page; the active page is filled. On a phone the row scrolls.
 */
/**
 * LES SIX GROUPES RÉPONDENT TOUS À LA MÊME QUESTION : quel travail suis-je en
 * train de faire ?
 *
 * Les quatre précédents n'y répondaient pas ensemble. « Opérations » disait ce
 * que je fais, « Marché » disait de quoi ça parle : deux questions dans une
 * même barre, donc un onglet pouvait appartenir aux deux ou à aucun, et
 * c'était l'auteur du jour qui tranchait. « Marché » avait ainsi absorbé douze
 * onglets sur trente et un, dont un banc d'essai WhatsApp.
 *
 * AUCUNE ADRESSE NE BOUGE ici : seul change le groupe où un onglet se range.
 * Un lien, un signet ou un renvoi de contrôle ne peut donc pas casser.
 *
 * « Vue client » garde ses quatre onglets plutôt que de devenir une page de
 * menu : une page intermédiaire aurait coûté un clic à chaque consultation
 * pour économiser trois lignes de barre. Elle ramène /desk/comparer, qui
 * existait sans figurer dans aucune barre, donc inatteignable autrement qu'en
 * tapant l'adresse.
 */
export const DESK_GROUPS: { label: string; tabs: [string, string][] }[] = [
  {
    // Ce qui attend une décision aujourd'hui, et rien d'autre.
    label: "La journée",
    tabs: [
      ["/desk", "Carnet"],
      ["/desk/a-valider", "À valider"],
      ["/desk/approbations", "Approbations"],
      ["/desk/messages", "Messages"],
    ],
  },
  {
    /* Tout ce qui se fait POUR quelqu'un : son dossier, ce qu'il a reçu, ce
       qu'il doit, ce qu'on lui a émis. « Allocations et règlement » et
       « Encaissements » étaient rangés sous Opérations, « Droits de garde »
       sous Pilotage : trois moments du même client. */
    label: "Les clients",
    tabs: [
      ["/desk/clients", "Dossiers"],
      ["/desk/repertoire", "Répertoire"],
      ["/desk/resultats", "Allocations et règlement"],
      ["/desk/encaissements", "Encaissements"],
      /* Voisin d'Encaissements, et pas dedans : là, un émetteur doit une
         échéance annoncée et le défaut est le retard ; ici, un client vire
         quand il veut et le défaut est l'anonymat. */
      ["/desk/virements", "Virements reçus"],
      /* Le mandat se signe chez le client, il s'exécute ici : deux pages pour
         un sujet, parce qu'une autorisation qu'on donne et un travail qu'on
         fait n'ont ni le même lecteur ni le même geste. */
      ["/desk/prelevements", "Prélèvements"],
      ["/desk/rapprochement", "Rapprochement"],
      ["/desk/garde", "Droits de garde"],
      ["/desk/documents", "Documents"],
    ],
  },
  {
    /* La matière : ce que la maison lit du marché et en tire. Six onglets au
       lieu de douze, parce que publier n'est pas lire et qu'un miroir de
       l'application client n'est pas un outil du desk. */
    label: "Le marché",
    tabs: [
      ["/desk/marche", "Cotes & VL"],
      ["/desk/bulletins", "Bulletins"],
      ["/desk/adjudications", "Adjudications"],
      ["/desk/adjudications/tableau", "Résultats"],
      ["/desk/analyses", "Courbe des taux"],
      ["/desk/indice/apercu", "Indice"],
    ],
  },
  {
    // Écrire pour le dehors : la note trimestrielle, et ce qu'on relaie.
    label: "Publier",
    tabs: [
      ["/desk/indice", "Notes"],
      ["/desk/actualites", "Actualités"],
    ],
  },
  {
    /* Les mêmes pages que le client, rendues par les mêmes composants, en
       lecture. Ce ne sont pas des outils : c'est une vérification, « voir ce
       que le client voit », et elle mérite son propre coin plutôt que d'être
       mêlée aux cotes. */
    label: "Vue client",
    tabs: [
      ["/desk/titres", "Titres"],
      ["/desk/fonds", "Fonds"],
      ["/desk/societes", "Sociétés"],
      ["/desk/comparer", "Comparer"],
    ],
  },
  {
    /* Ce qui fait tourner la maison. Le banc d'essai WhatsApp arrive de
       « Marché », où il n'avait rien à faire entre les cotes et les
       adjudications : c'est un canal, pas un marché. */
    label: "La maison",
    tabs: [
      ["/desk/referentiel", "Référentiel"],
      ["/desk/referentiel/modeles", "Modèles"],
      ["/desk/referentiel/bareme", "Barème"],
      ["/desk/referentiel/registre", "Registre"],
      ["/desk/equipe", "Équipe"],
      ["/desk/journal", "Journal"],
      ["/desk/reporting", "Reporting"],
      ["/desk/sante", "Santé"],
      ["/desk/depot", "Dépôt"],
      ["/desk/robot", "Robot"],
      ["/desk/docs", "Documentation"],
    ],
  },
];
export const DESK_TABS: [string, string][] = DESK_GROUPS.flatMap((g) => g.tabs);

export async function DeskNav({ current, badges = {} }: { current: string; badges?: Record<string, number> }) {
  const t = await getT();
  return (
    <BarreGelee className={styles.nav} aria-label="Desk" data-coach="nav">
      {DESK_GROUPS.map((g) => (
        <div key={g.label} className={styles.group}>
          <span className={styles.label}>{t(g.label)}</span>
          <div className={styles.tabs}>
            {g.tabs.map(([href, label]) => (
              <Link key={href} href={href} aria-current={href === current ? "page" : undefined}>
                {t(label)}
                {badges[href] ? <span className={styles.badge}>{badges[href]}</span> : null}
              </Link>
            ))}
          </div>
        </div>
      ))}
      <Link href="/desk/guide" className={styles.guide} aria-current={current === "/desk/guide" ? "page" : undefined}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5V14M12 17h.01" />
        </svg>
        {t("Guide")}
      </Link>
    </BarreGelee>
  );
}
