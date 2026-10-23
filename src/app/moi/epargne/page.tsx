import Link from "next/link";
import { Pli } from "@/components/Pli";
import { StandingForm, StandingList } from "@/components/Standing";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { nextRun, recurringMinimum, STANDING_STATE_LABEL } from "@/lib/domain/standing";
import { getT } from "@/i18n/server";
import { localIso } from "@/lib/format";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Épargne programmée" };

/**
 * PLACER CHAQUE MOIS N'EST PAS AUTORISER UN PRÉLÈVEMENT.
 *
 * Ce sont deux décisions, et elles se prenaient au même endroit. L'épargne
 * programmée dit COMBIEN part, QUAND, et VERS QUOI : c'est un ordre debout,
 * qui engage un placement. Le mandat de prélèvement dit seulement que la
 * maison a le droit de débiter un compte bancaire nommé, sous un plafond :
 * c'est une autorisation de paiement, et elle sert aussi bien à provisionner
 * son compte qu'à nourrir une épargne. L'une peut vivre sans l'autre — on
 * peut virer soi-même chaque mois — et le mandat sert à plus d'une chose.
 *
 * ELLE N'AVAIT POURTANT AUCUNE PAGE. Le formulaire vivait sur la page
 * d'intention d'un fonds : pour mettre une épargne en place il fallait avoir
 * déjà trouvé le fonds, ouvert sa fiche, puis son intention. Le service
 * « Épargne programmée » renvoyait donc à la LISTE des fonds quand il n'y en
 * avait pas, et à une ancre du tableau de bord quand il y en avait une — deux
 * destinations, aucune qui soit la sienne.
 *
 * Elle en a une. Le mandat garde la sienne, et chacune nomme l'autre plutôt
 * que de la contenir.
 */
export default async function EpargnePage() {
  const s = await requireSession("/moi/epargne");
  const t = await getT();
  const r = repo();
  const [offers, standing] = await Promise.all([r.listOffers(), r.listStandingOrders(s.userId).catch(() => [])]);
  const aujourdHui = localIso(new Date());

  /* Un versement mensuel va vers une PART, qui se divise. Un titre ne se
     divise pas, et une somme fixe n'y tomberait jamais juste. */
  const fonds = offers
    .filter((o) => o.kind === "FONDS" && !o.hidden && o.status !== "withdrawn")
    .map((o) => ({ id: o.id, title: o.title, min: recurringMinimum(o) }))
    .sort((a, b) => a.title.localeCompare(b.title, "fr"));

  const versements = standing.filter((x) => x.source === "virement");
  const actifs = versements.filter((x) => x.state === "active");

  return (
    <div className={styles.page}>
      <nav className={styles.fil}>
        <Link href="/">{t("Portefeuille")}</Link>
      </nav>
      <header className={styles.tete}>
        <h1 className="display">{t("Épargne programmée")}</h1>
        <p className={styles.chapeau}>
          {t(
            "Une somme fixe, un jour du mois, une destination choisie maintenant : le versement part tout seul, et vous l'arrêtez quand vous voulez. C'est un placement qui se répète, pas une autorisation de débit.",
          )}
        </p>
      </header>

      {versements.length > 0 && (
        <Pli
          cle="epargne:en-place"
          titre={t("Vos versements programmés")}
          sous={t("Ce qui part chaque mois, et que vous arrêtez quand vous voulez.")}
          compte={t(actifs.length > 1 ? "{n} actifs" : actifs.length === 1 ? "1 actif" : "aucun actif", { n: String(actifs.length) })}
        >
          <StandingList
            rows={versements.map((x) => ({
              id: x.id,
              ref: x.ref,
              offerId: x.offerId,
              title: offers.find((y) => y.id === x.offerId)?.title ?? x.offerId,
              splits: x.splits?.map((y) => ({ offerId: y.offerId, title: offers.find((z) => z.id === y.offerId)?.title ?? y.offerId, pct: y.pct })),
              href: `/offres/${x.offerId}`,
              amount: x.amount,
              dayOfMonth: x.dayOfMonth,
              source: x.source,
              minAmount: x.minAmount,
              state: x.state,
              stateLabel: STANDING_STATE_LABEL[x.state],
              /* LA PROCHAINE ÉCHÉANCE, calculée plutôt que tue. La liste sait
                 l'afficher depuis toujours ; les deux pages lui passaient
                 « null », donc « prochain versement le … » ne paraissait
                 jamais. Le domaine la donne (standing, « nextRun »). */
              next: nextRun(x, aujourdHui),
              lastRunOn: x.lastRunOn,
              stopReason: x.stopReason,
            }))}
            fonds={fonds}
          />
        </Pli>
      )}

      <Pli
        cle="epargne:mettre"
        titre={t("Mettre une épargne en place")}
        sous={t("Le fonds, la somme et le jour se choisissent ici.")}
        attend={actifs.length === 0 ? t("rien en place") : undefined}
      >
        {fonds.length ? (
          <StandingForm fonds={fonds} minimum={fonds[0]?.min ?? 0} />
        ) : (
          <p className="muted">{t("Aucun fonds n'est ouvert à la souscription en ce moment : l'épargne se programmera dès qu'il y en aura un.")}</p>
        )}
      </Pli>

      {/* LE MANDAT EST NOMMÉ, PAS CONTENU. Les deux décisions se touchent — un
          versement doit bien être payé — mais les mêler, c'est faire signer
          une autorisation de débit à qui vient choisir un placement. */}
      <Pli cle="epargne:comment" titre={t("Comment cela marche")} sous={t("Ce qui part, comment c'est payé, et comment cela s'arrête.")} defaut={false}>
        <ol className={styles.steps}>
          <li>{t("Vous choisissez le fonds, la somme et le jour du mois. Rien n'est prélevé à la signature.")}</li>
          <li>
            {t("Le jour venu, la somme est appelée. Vous la virez vous-même, ou vous nous autorisez à la prélever : c'est le")}{" "}
            <Link href="/moi/prelevements">{t("mandat de prélèvement")}</Link>
            {t(", une autorisation distincte, que vous signez une fois et révoquez quand vous voulez.")}
          </li>
          <li>{t("L'ordre produit est un ordre ordinaire : il porte une référence, vous en recevez l'avis, et il paraît dans votre espace comme les autres.")}</li>
          <li>{t("Vous arrêtez le versement d'un bouton, sans motif à donner. Arrêter le versement ne révoque pas le mandat, et révoquer le mandat n'arrête pas le versement : ce sont deux décisions.")}</li>
        </ol>
      </Pli>
    </div>
  );
}
