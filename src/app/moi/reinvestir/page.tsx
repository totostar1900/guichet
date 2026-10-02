import Link from "next/link";
import { redirect } from "next/navigation";
import { ReinvestForm } from "./ReinvestForm";
import { StandingList } from "@/components/Standing";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { positionsFrom } from "@/lib/positions";
import { cashPosition } from "@/lib/domain/cash";
import { bilan, suivre, type LigneTenue } from "@/lib/domain/encaissement";
import { recurringMinimum, STANDING_STATE_LABEL } from "@/lib/domain/standing";
import { getT } from "@/i18n/server";
import { fmt, fmtDate } from "@/lib/format";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Réinvestir vos encaissements" };

/**
 * Replacer ses coupons sans y penser.
 *
 * C'est la seule décision qu'un porteur d'obligations ait à prendre entre
 * l'achat et le remboursement, et c'est celle qu'on oublie : un coupon tombe,
 * se mêle au reste d'un compte en banque et cesse de rapporter, pendant que la
 * ligne qui l'a versé continue.
 *
 * L'instruction ne porte pas de montant, et c'est ce qui la distingue d'une
 * épargne programmée. Le client ne peut pas savoir ce qu'un coupon rapportera :
 * lui faire choisir une somme d'avance laisserait dormir le reste, ou
 * engagerait un argent qui n'est pas arrivé. Ce qui se place est ce qui est
 * encaissé, constaté par une personne au journal des espèces.
 *
 * La page montre donc d'abord ce qui est réellement disponible. Une promesse de
 * réinvestissement posée au-dessus d'un solde qu'on ne voit pas ne se vérifie
 * pas, et c'est exactement le reproche qu'on faisait à la bande « échu ».
 */
export default async function ReinvestirPage() {
  const session = await getSession();
  if (!session) redirect("/entrer?next=/moi/reinvestir");
  const t = await getT();
  const r = repo();
  const [intents, offers, cash, standing] = await Promise.all([
    r.listIntents(),
    r.listOffers(),
    r.listCash(session.userId).catch(() => []),
    r.listStandingOrders(session.userId).catch(() => []),
  ]);
  const mine = intents.filter((i) => i.clientId === session.userId);
  const positions = positionsFrom(mine, offers);
  const lignes: LigneTenue[] = positions.map((p) => ({ intentId: p.intent.id, titre: p.offer.title, echus: p.echus, aVenir: p.flows }));
  const suivis = suivre(lignes, cash);
  const b = bilan(suivis);
  /* Le disponible est celui du journal, jamais la somme des coupons échus : un
     coupon déjà replacé n'est plus disponible, et l'échéancier l'ignore. */
  const poche = cashPosition(cash, mine);
  const enPlace = standing.filter((s) => s.source === "encaissements");
  const active = enPlace.find((s) => s.state === "active");

  /* Les fonds ouverts : un versement va vers une part, qui se divise. Un titre
     ne se divise pas, et un montant venu d'un coupon n'y tomberait jamais juste. */
  const fonds = offers
    .filter((o) => o.kind === "FONDS" && o.fund?.distributed && !o.hidden && o.status !== "withdrawn")
    .map((o) => ({ id: o.id, title: o.title, min: recurringMinimum(o) }))
    .sort((a, b2) => a.title.localeCompare(b2.title, "fr"));

  const prochains = suivis.filter((f) => f.etat === "a_venir").slice(0, 4);

  return (
    <div className={styles.page}>
      <nav className={styles.fil}>
        <Link href="/">{t("Portefeuille")}</Link>
      </nav>
      <header>
        <h1>{t("Réinvestir vos encaissements")}</h1>
        <p className={styles.chapeau}>
          {t(
            "Un coupon qui dort sur un compte en banque cesse de rapporter pendant que la ligne qui l'a versé continue. Cette instruction replace ce qui vous revient, dès qu'il arrive, sur la ligne que vous choisissez maintenant.",
          )}
        </p>
      </header>

      <section className={styles.sec}>
        <h2>{t("Ce que vous avez aujourd'hui")}</h2>
        <dl className={styles.band}>
          <div>
            <dt>{t("Disponible")}</dt>
            <dd>{fmt(Math.round(poche.idle))}</dd>
            <span>{t("reçu et n'attendant aucune opération")}</span>
          </div>
          <div>
            <dt>{t("Échu, pas encore reçu")}</dt>
            <dd>{fmt(Math.round(b.attendu))}</dd>
            <span>{b.nbAttendus ? t("{n} échéances, la plus ancienne depuis {j} jours", { n: b.nbAttendus, j: b.retardMax }) : t("rien en attente")}</span>
          </div>
          <div>
            <dt>{t("Encaissé à ce jour")}</dt>
            <dd>{fmt(Math.round(b.encaisse))}</dd>
            <span>{t("porté à votre journal")}</span>
          </div>
          <div>
            <dt>{t("À venir")}</dt>
            <dd>{fmt(Math.round(b.aVenir))}</dd>
            <span>{prochains[0] ? t("le prochain le {d}", { d: fmtDate(prochains[0].date) }) : t("aucune échéance connue")}</span>
          </div>
        </dl>
        {/* La distinction que toute la page défend : ce qui est arrivé n'est pas
            ce qui est dû. Les additionner ferait une promesse invérifiable. */}
        <p className={styles.note}>
          {t(
            "« Disponible » est de l'argent réellement arrivé sur le compte de règlement et constaté par le desk. « Échu, pas encore reçu » est une créance sur l'émetteur : elle vous est due, elle n'est pas là, et rien ne se replace avec.",
          )}
        </p>
      </section>

      {enPlace.length > 0 && (
        <section className={styles.sec}>
          <h2>{t("Votre instruction")}</h2>
          <StandingList
            rows={enPlace.map((x) => {
              const o = offers.find((y) => y.id === x.offerId);
              return {
                id: x.id,
                ref: x.ref,
                offerId: x.offerId,
                title: o?.title ?? x.offerId,
                splits: x.splits?.map((y) => ({ offerId: y.offerId, title: offers.find((z) => z.id === y.offerId)?.title ?? y.offerId, pct: y.pct })),
                href: `/offres/${x.offerId}`,
                amount: x.amount,
                dayOfMonth: x.dayOfMonth,
                source: x.source,
                minAmount: x.minAmount,
                state: x.state,
                stateLabel: STANDING_STATE_LABEL[x.state],
                next: null,
                lastRunOn: x.lastRunOn,
                stopReason: x.stopReason,
              };
            })}
            fonds={fonds}
          />
        </section>
      )}

      {!active && (
        <section className={styles.sec}>
          <h2>{t("Mettre le réinvestissement en place")}</h2>
          <ReinvestForm fonds={fonds} />
        </section>
      )}

      <section className={styles.sec}>
        <h2>{t("Comment cela marche")}</h2>
        <ol className={styles.steps}>
          <li>{t("Un coupon ou un remboursement tombe. Le desk constate le crédit et le porte à votre journal : à ce moment seulement, la somme est « reçue ».")}</li>
          <li>{t("Le lendemain au plus tard, tout ce qui est disponible part sur la ligne que vous avez choisie, si le total atteint votre plancher.")}</li>
          <li>{t("L'ordre produit est un ordre ordinaire : il porte une référence, vous en recevez l'avis, et il paraît dans votre espace comme les autres.")}</li>
          <li>{t("Vous arrêtez l'instruction d'un bouton, sans motif à donner. Ce qui est facile à prendre doit être au moins aussi facile à quitter.")}</li>
        </ol>
        <p className={styles.note}>
          {t(
            "Trois choses sont déjà écrites quand l'ordre part : la ligne, que vous avez choisie ; le moment, celui où l'argent arrive ; et le montant, celui que l'émetteur a versé.",
          )}
        </p>
      </section>
    </div>
  );
}
