import Link from "next/link";
import { repo } from "@/lib/data";
import { loadBeacAuctions } from "@/lib/market/beac-feed";
import { beacLabel, BEAC_ANNONCES, type BeacAuction } from "@/lib/market/beac";
import { daysBetween } from "@/lib/finance";
import { fmtDate, localIso } from "@/lib/format";
import type { Offer } from "@/lib/domain/types";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return {
    title: t("Calendrier des adjudications"),
    description: t("Les séances d'émission des Trésors de la CEMAC, telles que la BEAC les annonce."),
  };
}

/**
 * Le calendrier des adjudications de la zone.
 *
 * Une adjudication s'annonce une semaine avant de se fermer, et l'annonce dort
 * dans un communiqué que personne ne va chercher. Un épargnant qui voudrait y
 * prendre part apprend l'opération une fois qu'elle est passée, ce qui revient à
 * ne jamais y prendre part.
 *
 * Deux précautions tiennent cette page.
 *
 * Rien n'y est de nous. Chaque ligne cite le communiqué de la BEAC, et le lien
 * l'ouvre : une date d'adjudication publiée sous le nom de la maison est une
 * parole dont elle répond, alors qu'une date citée reste celle du Trésor qui
 * l'a écrite.
 *
 * Et elle ne cache pas ses creux. Les annonces arrivent par vagues : trois
 * semaines sans rien, puis six séances en deux jours. Une page vide en période
 * creuse donnerait l'impression d'un marché mort ou d'un outil en panne ; les
 * dernières séances annoncées restent donc affichées, avec leur date, pour
 * montrer le rythme réel plutôt qu'un vide sans explication.
 */
export default async function CalendrierPage() {
  const t = await getT();
  const today = localIso(new Date());
  const [feed, offers] = await Promise.all([loadBeacAuctions(), repo().listOffers()]);
  const annonces = feed.auctions.filter((a) => a.kind === "annonce" && a.on);
  const devant = annonces.filter((a) => a.on! >= today).sort((a, b) => a.on!.localeCompare(b.on!));
  const passees = annonces.filter((a) => a.on! < today).sort((a, b) => b.on!.localeCompare(a.on!)).slice(0, 8);

  // Une ligne ouverte au Guichet pour cette séance : même pays, même
  // compartiment, une clôture à moins d'une semaine de la date annoncée. Au-delà
  // le rapprochement devient une supposition, et on préfère ne rien proposer.
  const live = offers.filter((o) => !o.hidden && o.status !== "withdrawn" && (o.kind === "BTA" || o.kind === "OTA"));
  const matching = (a: BeacAuction): Offer | undefined => {
    if (!a.on || !a.country || !a.instrument) return undefined;
    const near = live.filter((o) => o.country === a.country && o.kind === a.instrument && Math.abs(daysBetween(a.on!, o.deadlineAt.slice(0, 10))) <= 7);
    return near.length === 1 ? near[0] : undefined;
  };

  const row = (a: BeacAuction, past: boolean) => {
    const o = past ? undefined : matching(a);
    return (
      <li key={a.doc.url} className={styles.row}>
        <span className={styles.when}>
          <b>{fmtDate(a.on!)}</b>
          {!past && <small className="muted">{t("dans {n} jours", { n: String(Math.max(0, Math.round(daysBetween(today, a.on!)))) })}</small>}
        </span>
        <span className={styles.what}>
          <b>{beacLabel(a)}</b>
          <small className="muted">
            <a href={a.doc.url} target="_blank" rel="noreferrer">
              {t("Communiqué de la BEAC")}
            </a>
          </small>
        </span>
        <span className={styles.act}>
          {o ? (
            <Link className="btn sm" href={`/offres/${o.id}`}>
              {t("Voir la ligne")}
            </Link>
          ) : past ? null : (
            <small className="muted">{t("pas encore ouverte au Guichet")}</small>
          )}
        </span>
      </li>
    );
  };

  return (
    <div className={styles.page}>
      <h1 className="display">{t("Calendrier des adjudications")}</h1>
      <p className={styles.lead}>
        {t("Les séances d'émission des six Trésors de la CEMAC, reprises des annonces de la BEAC. Une adjudication s'annonce environ une semaine avant sa séance : cette page suit ce rythme.")}
      </p>

      <section>
        <h2>{t("À venir")}</h2>
        {devant.length ? (
          <ul className={styles.list}>{devant.map((a) => row(a, false))}</ul>
        ) : (
          <p className="muted">
            {/* Dire « aucune séance » quand on n'a pas pu lire la source, ce serait
                affirmer sur le marché une chose qui ne parle que de nous. */}
            {feed.ok
              ? t("Aucune séance annoncée pour l'instant. Les Trésors publient leurs communiqués par vagues, souvent une semaine avant la séance.")
              : t("Les annonces de la BEAC ne répondent pas en ce moment : cette page ne peut rien affirmer sur les séances à venir.")}{" "}
            <a href={BEAC_ANNONCES} target="_blank" rel="noreferrer">
              {t("Les annonces de la BEAC")}
            </a>
          </p>
        )}
      </section>

      {passees.length > 0 && (
        <section>
          <h2>{t("Dernières séances annoncées")}</h2>
          <ul className={styles.list}>{passees.map((a) => row(a, true))}</ul>
        </section>
      )}

      <p className={styles.note}>
        {t("Chaque ligne cite le communiqué du Trésor concerné, publié par la BEAC : c'est la source, et elle fait foi. Le montant, le taux et le nominal sont dans le communiqué. Pour prendre part à une séance, dites-le au desk avant la clôture, qui précède la séance.")}
      </p>
    </div>
  );
}
