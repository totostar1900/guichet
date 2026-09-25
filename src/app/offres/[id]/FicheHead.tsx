import { LineIdentity } from "@/components/LineIdentity";
import { HorizonMark } from "@/components/HorizonMark";
import { WatchButton } from "@/components/WatchButton";
import { LineMenu } from "@/components/mobile/LineMenu";
import { CoachMarks, type CoachStop } from "@/components/mobile/CoachMarks";
import type { DisplayStatus, Offer } from "@/lib/domain/types";
import type { OfferSummary } from "@/lib/domain/summary";
import { familySegment, offerFamily, SEGMENT_LABEL, statusLabel } from "@/lib/domain/status";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

/**
 * Le haut d'une fiche : le segment, le nom de la ligne, son état, ses boutons.
 *
 * Il vivait dans la page, et la fiche voisine qui glisse sous le doigt ne le
 * rendait donc pas : on voyait les chiffres commencer tout en haut, puis le nom
 * apparaître au relâchement et pousser le reste vers le bas. Écrit une fois,
 * les deux le rendent pareil.
 *
 * La rangée de boutons en fait partie, et pour la même raison : sans elle, la
 * voisine était plus courte d'une ligne, et « ··· » comme « Comment lire cette
 * fiche ? » arrivaient au relâchement en décalant tout.
 *
 * En aperçu, les boutons sont là mais ne font rien. La vignette ne reçoit ni
 * clic ni doigt, et rien de ce qu'ils portent n'est propre au lecteur : ni
 * l'étoile, ni le repère d'horizon, qui se montrent dans leur état neutre. La
 * visite guidée, elle, doit être tenue : deux exemplaires écouteraient le même
 * signal de rejeu et pourraient s'ouvrir tout seuls, d'où son mode inerte.
 */
export async function FicheHead({
  o,
  s,
  st,
  coach = false,
  preview = false,
  horizon,
  watching = false,
  signedIn = false,
  stops = [],
}: {
  o: Offer;
  s: OfferSummary;
  st: DisplayStatus;
  /** La page seule marque le cachet pour la visite guidée : deux repères se la disputeraient. */
  coach?: boolean;
  /** La voisine qui glisse : mêmes boutons, mêmes tailles, aucun effet. */
  preview?: boolean;
  horizon?: { level?: "ok" | "warn"; text?: string; hasProfile: boolean };
  watching?: boolean;
  signedIn?: boolean;
  stops?: CoachStop[];
}) {
  const t = await getT();
  return (
    <div className={styles.head}>
      <div className={styles.crumb}>
        {t(SEGMENT_LABEL[familySegment(offerFamily(o))])}
        {o.isExample && <span className="tag-ex">{t("exemple")}</span>}
      </div>
      <div className={styles.headRow}>
        <LineIdentity o={o} s={s} size="xl" as="h1" />
        <div className={styles.headActions}>
          <span className={`pill ${st}`} {...(coach ? { "data-coach": "status" } : {})}>
            {t(statusLabel(o, st))}
          </span>
          {/* Le repère tient dans un rond : sa forme d'alerte prenait deux
              lignes dans l'en-tête, et il ne paraissait pas du tout à qui
              n'a pas de profil, donc rien ne disait qu'il en manquait un. */}
          <HorizonMark level={horizon?.level} text={horizon?.text} hasProfile={horizon?.hasProfile ?? false} />
          <div className={styles.headBtns}>
            <a className={`btn sm ${styles.pdfBtn}`} href={`/offres/${o.id}/fiche`} target="_blank" rel="noreferrer">
              {t("Fiche PDF")}
            </a>
            <WatchButton offerId={o.id} initial={watching} signedIn={signedIn} />
            <LineMenu line={{ id: o.id, title: o.title, isin: o.isin, sub: `${s.subtitle} · ${s.hero} ${s.heroUnit ?? ""}`.trim() }} watching={watching} onFiche={false} pdf />
            <CoachMarks id="fiche" replayLabel={t("Comment lire cette fiche ?")} stops={stops} auto={!preview} inert={preview} />
          </div>
        </div>
      </div>
    </div>
  );
}
