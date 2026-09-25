import { LineIdentity } from "@/components/LineIdentity";
import type { DisplayStatus, Offer } from "@/lib/domain/types";
import type { OfferSummary } from "@/lib/domain/summary";
import { familySegment, offerFamily, SEGMENT_LABEL, statusLabel } from "@/lib/domain/status";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

/**
 * Le haut d'une fiche : le segment, le nom de la ligne, son état.
 *
 * Il vivait dans la page, et la fiche voisine qui glisse sous le doigt ne le
 * rendait donc pas : on voyait les chiffres commencer tout en haut, puis le nom
 * apparaître au relâchement et pousser le reste vers le bas. Écrit une fois,
 * les deux le rendent pareil, et rien ne bouge quand la vraie page prend le
 * relais.
 *
 * Ce qui va à droite du cachet change d'un appelant à l'autre : la page y met
 * le repère d'horizon, la fiche PDF, l'étoile, le menu et la visite guidée ; la
 * voisine n'y met rien, parce qu'on lit en glissant sans rien engager, et que
 * deux exemplaires d'un même repère se disputeraient la visite guidée.
 */
export async function FicheHead({ o, s, st, coach = false, children }: { o: Offer; s: OfferSummary; st: DisplayStatus; coach?: boolean; children?: React.ReactNode }) {
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
          {children}
        </div>
      </div>
    </div>
  );
}
