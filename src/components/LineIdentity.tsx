"use client";

import { useT } from "@/i18n/client";
import { issuerZone } from "@/data/issuer-registry";
import Link from "next/link";
import type { Offer } from "@/lib/domain/types";
import { COUNTRY_CODE, type OfferSummary } from "@/lib/domain/summary";
import { titreCourt } from "@/lib/domain/carte-compacte";
import { famVars } from "@/lib/registry";
import styles from "./LineIdentity.module.css";

/**
 * How a line introduces itself, the same in the table, the list and the cards:
 * the instrument name, then who issues it (family badge · country · issuer ·
 * operation), then the ISIN in monospace for bank orders.
 *
 * L'ÉMETTEUR EST ABRÉGÉ DANS LE TITRE, sauf en tête de page. « État du Gabon »
 * revient sur vingt-cinq lignes du tableau et redit le drapeau posé juste
 * dessous ; « GAB » laisse la place au coupon et à l'échéance, qui sont ce qui
 * distingue une ligne d'une autre. En « h1 », c'est-à-dire sur la fiche et sur
 * la ligne du desk, le nom complet reste : ce sont les deux pages où l'on
 * vérifie avant de passer un ordre.
 */
export function LineIdentity({ o, s, href, size = "md", as: Tag = "div", isin = true }: { o: Offer; s: OfferSummary; href?: string; size?: "md" | "lg" | "xl"; as?: "div" | "h1"; /** La carte le descend dans son pied : voir OfferCard. */ isin?: boolean }) {
  const t = useT();
  const nom = Tag === "h1" ? s.title : titreCourt(o);
  const title = href ? <Link href={href}>{t(nom)}</Link> : t(nom);
  const zone = issuerZone(o);
  return (
    <div className={`${styles.id} ${size === "lg" ? styles.lg : size === "xl" ? styles.xl : ""}`}>
      <Tag className={styles.title}>{title}</Tag>
      <div className={styles.meta}>
        <span className={`fam fam-${s.family}`} style={famVars(s.family) as React.CSSProperties}>
          {s.kind}
        </span>
        {zone === "CEMAC" ? (
          <span className="cc cemac" title={t("Institution de la CEMAC")}>
            CEMAC
          </span>
        ) : (
          <span className="cc" title={t(o.countryName)}>
            {COUNTRY_CODE[o.country]}
          </span>
        )}
        {/* Qui émet passe avant la référence. Le commentaire de ce composant
            annonçait cet ordre depuis toujours, le balisage rendait l'inverse :
            on lisait « OTA 6,50 % · CF0000018421 » avant de savoir de quel
            Trésor il s'agit, et l'ISIN ne sert qu'à passer un ordre en banque,
            jamais à reconnaître une ligne. */}
        <span className={styles.issuer}>{t(s.subtitle)}</span>
        {isin && <span className={styles.isin}>{o.isin}</span>}
      </div>
      {s.badges.length > 0 && (
        <div className={styles.badges}>
          {s.badges.map((b) => (
            <span key={b.key} className={`${styles.badge} ${styles[b.key]}`} title={b.note}>
              {t(b.label)}
              {b.note && b.key !== "cloture" ? <em> · {t(b.note)}</em> : null}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
