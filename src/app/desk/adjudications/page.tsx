import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { coverageOf, headline, thin, type AuctionResult } from "@/lib/market/auction-results";
import { ResultForm } from "./ResultForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

/**
 * Les adjudications de la zone, séance par séance.
 *
 * Le taux d'un bon sort de l'enchère. Le chiffre que le Guichet affiche avant
 * une séance est donc une indication, et une indication se fonde sur la dernière
 * séance comparable : sans mémoire de ce qui s'est payé, elle se fonde sur une
 * intuition. Cet écran est cette mémoire, et la BEAC la publie pour les six
 * Trésors, pas seulement pour les lignes que nous distribuons.
 *
 * Deux piles, et la séparation est le sujet de la page. Le robot dépose ce qu'il
 * sait de la séance, qui est son identité, et laisse les chiffres vides parce
 * qu'ils sont à l'intérieur d'un scan. Une personne les relève, et c'est
 * seulement à partir de sa confirmation que le taux fonde quoi que ce soit : une
 * faute de lecture devenue référence se propagerait sans bruit à toutes les
 * offres suivantes.
 */
export default async function AdjudicationsPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireDesk("/desk/adjudications");
  const t = await getT();
  const sp = await searchParams;
  const r = repo();
  const all = await r.listAuctionResults({ limit: 300 });
  const aRelire = all.filter((x) => !x.confirmedBy);
  const relues = all.filter((x) => x.confirmedBy);
  const selected = sp.s ? all.find((x) => x.id === sp.s) : aRelire[0];
  const offer = selected?.offerId ? await r.getOffer(selected.offerId) : undefined;

  return (
    <>
      <DeskNav current="/desk/adjudications" badges={{ "/desk/adjudications": aRelire.length }} />

      <div className={styles.page}>
        <aside className={styles.list} aria-label={t("Séances")}>
          <p className={styles.blurb}>
            {t("Ce que le marché a payé, séance par séance. Le robot dépose l'identité de la séance, une personne en relève les chiffres sur le communiqué.")}{" "}
            <Link href="/desk/adjudications/tableau">{t("Voir la table")} →</Link>
          </p>

          <h3>
            {t("À relire")} <span>{aRelire.length}</span>
          </h3>
          {aRelire.length === 0 && <p className={styles.empty}>{t("Rien à relire.")}</p>}
          {aRelire.map((x) => (
            <Row key={x.id} x={x} current={x.id === selected?.id} label={t("À relire")} />
          ))}

          {relues.length > 0 && (
            <details className={styles.filed} open={relues.some((x) => x.id === selected?.id)}>
              <summary>
                {t("Relues")} <span>{relues.length}</span>
              </summary>
              {relues.map((x) => (
                <Row key={x.id} x={x} current={x.id === selected?.id} label="" />
              ))}
            </details>
          )}
        </aside>

        <div className={styles.main}>
          {selected ? (
            <ResultForm key={selected.id} r={selected} offerTitle={offer?.title} />
          ) : (
            <div className="empty">
              {t("Aucune séance. Le robot BEAC en dépose une dès qu'un Trésor publie ses résultats.")}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** Une séance dans la liste : ce qu'elle est, et ce que son chiffre vaut. */
function Row({ x, current, label }: { x: AuctionResult; current: boolean; label: string }) {
  const h = headline(x);
  const couv = coverageOf(x);
  return (
    <Link href={`/desk/adjudications?s=${x.id}`} className={styles.row} aria-current={current ? "true" : undefined}>
      <div className={styles.meta}>
        <span className={styles.when}>{x.sessionOn}</span>
        {label && <span className={styles.todo}>{label}</span>}
      </div>
      <b>
        {x.instrument} {x.tenor}
      </b>
      <span className={styles.meta}>
        {x.country}
        {h ? ` · ${h.value.toFixed(2).replace(".", ",")} %` : ""}
        {couv != null ? ` · ${couv.toFixed(0)} %` : ""}
        {thin(x) && h ? " · mince" : ""}
      </span>
    </Link>
  );
}
