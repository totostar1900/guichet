import Link from "next/link";
import { ListNav } from "@/components/ListNav";
import { newsFor } from "@/lib/news";
import { notFound } from "next/navigation";
import { IntentForm } from "@/components/IntentForm";
import { LineIdentity } from "@/components/LineIdentity";
import { WatchButton } from "@/components/WatchButton";
import { FichePanes, StickyAction } from "@/components/mobile/FichePanes";
import { CoachMarks } from "@/components/mobile/CoachMarks";
import { SwipePager } from "@/components/mobile/SwipePager";
import { LineMenu } from "@/components/mobile/LineMenu";
import { FicheReading, loadFiche } from "./FicheReading";
import { summarize } from "@/lib/domain/summary";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { displayYield, familySegment, offerFamily, SEGMENT_LABEL, statusLabel } from "@/lib/domain/status";
import { tenorText } from "@/lib/finance";
import { fmtDate } from "@/lib/format";
import styles from "./page.module.css";
import { getLang, getT } from "@/i18n/server";
import { intentHref, loadIntentContext } from "./intent-context";
import { COMPANY, PRODUCT } from "@/lib/config";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ intent?: string; qty?: string; de?: string }> };

/** The title and the description a messaging app shows under a shared line, beside the drawn image: the figures, then who we are. */
export async function generateMetadata({ params }: Props) {
  const o = await repo().getOffer((await params).id);
  if (!o) return { title: "Offre" };
  const s = summarize(o, new Date());
  const bits = [`${o.kind === "FONDS" ? "VL " : ""}${s.hero} ${s.heroSub}`, s.deadline && s.deadline !== "continue" ? `clôture ${s.deadline}` : s.deadline === "continue" ? "cotation continue" : "", s.minimum !== "—" ? `ticket ${s.minimum}` : ""].filter(Boolean);
  const description = `${bits.join(" · ")}. ${COMPANY.name}, ${COMPANY.licence.split(" · ")[0].replace(/^S/, "s")}.`;
  return { title: o.title, description, openGraph: { title: o.title, description, type: "article", siteName: `${PRODUCT.name} · ${COMPANY.name}` }, twitter: { card: "summary_large_image", title: o.title, description } };
}



export default async function OfferPage({ params, searchParams }: Props) {
    const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const [o, session] = await Promise.all([repo().getOffer(id), getSession()]);
  if (!o) notFound();
  if (o.status === "withdrawn" && !isDesk(session)) {
    return (
      <div className={styles.page}>
        <div className={styles.main}>
          <ListNav id={o.id} fallbackHref="/" fallbackLabel="Toutes les offres" />
          <h1 className="display" style={{ marginTop: 12 }}>
            {o.title}
          </h1>
          <p className="muted">{t("Cette ligne a été retirée du Guichet. Pour toute question, contactez le desk.")}</p>
        </div>
      </div>
    );
  }
  const watching = session ? (await repo().listWatches(session.userId)).some((w) => w.offerId === id) : false;
  const { channels, bridge, fin, mark, types, initial, held, qty, st, past } = await loadIntentContext(o, sp, session);
  const summary = summarize(o, new Date());
  const fiche = await loadFiche(o);

  // « À garder en tête » comes from the product type (desk-editable in the référentiel).
  // The walk-through speaks about this line, with its own numbers.
  const dyc = displayYield(o);
  const relatedNews = (await newsFor("offer", o.id)).length;
  const coachStops = [
    {
      target: "hero",
      title: "Le chiffre qui compte",
      text:
        o.kind === "FONDS"
          ? `${summary.hero} ${summary.heroUnit ?? ""}: la dernière valeur liquidative connue. Une souscription s'exécute à la prochaine, pas à celle-ci.`
          : o.kind === "ACTIONS" || (o.kind === "MARCHE" && o.instrument === "action")
            ? `${summary.hero} : ce que le dividende rapporte au prix du jour, s'il est maintenu. Le cours, lui, peut monter ou descendre.`
            : dyc.atPar
              ? `${summary.hero} : le taux nominal, parce que la ligne est au pair. Brut, avant impôt, si vous gardez le titre jusqu'à l'échéance.`
              : `${summary.hero} : ce que rapporte la ligne chaque année si vous êtes servi au prix affiché et gardez le titre jusqu'à l'échéance. Brut, avant impôt.`,
    },
    { target: "kpis", title: "Chaque chiffre s'explique", text: "Touchez une carte : d'où vient le chiffre, ligne par ligne, avec la leçon de deux minutes qui va avec. Les bulles « i » de la page font pareil pour chaque mot ; tout est réuni sous Info, avec un simulateur et la page Aide." },
    { target: "status", title: "Où en est la ligne", text: summary.countdown ? `Clôture dans ${summary.countdown} : après cette limite, plus de soumission possible. Une intention se déclare avant.` : `${summary.status}. Le statut dit ce que vous pouvez faire : souscrire, passer un ordre, ou seulement poser une question.` },
    ...(relatedNews > 0 ? [{ target: "news", title: "Ce qui s'est dit sur cette ligne", text: "Communiqués, bulletins, avis : le desk relie ici les publications qui concernent cette ligne, avec deux lignes sur ce que cela change. L'original est à un clic." }] : []),
    { target: "action", title: "Agir en trois étapes", text: "Montant, coordonnées, récapitulatif. Le desk vous rappelle avant de transmettre : rien n'est débité sans votre confirmation." },
  ];

  return (
    <div className={styles.page}>
      <SwipePager id={o.id} hintKey="fiche" hints={{ next: "Glissez vers la gauche : la ligne suivante", prev: "Glissez vers la droite : la ligne précédente" }}>
      <FichePanes className={styles.main}>
        <ListNav id={o.id} fallbackHref={o.kind === "FONDS" ? "/fonds" : "/"} fallbackLabel={o.kind === "FONDS" ? "Tous les fonds" : "Toutes les offres"} />
        <div className={styles.head}>
          <div className={styles.crumb}>
            {t(SEGMENT_LABEL[familySegment(offerFamily(o))])}
            {o.isExample && <span className="tag-ex">{t("exemple")}</span>}
          </div>
          <div className={styles.headRow}>
            <LineIdentity o={o} s={summary} size="xl" as="h1" />
            <div className={styles.headActions}>
              <span className={`pill ${st}`} data-coach="status">{t(statusLabel(o, st))}</span>
              {mark && (
                <Link href="/moi/profil" className={`${styles.profileMark} ${mark.level === "warn" ? styles.profileWarn : ""}`} title={t("Votre profil financier")}>
                  {mark[lang]}
                </Link>
              )}
              <div className={styles.headBtns}>
                <a className={`btn sm ${styles.pdfBtn}`} href={`/offres/${o.id}/fiche`} target="_blank" rel="noreferrer">
                  {t("Fiche PDF")}
                </a>
                <Link className="btn sm ghost" href={`/comparer?a=${o.id}`}>
                  {t("Comparer")}
                </Link>
                <WatchButton offerId={o.id} initial={watching} signedIn={Boolean(session)} />
                <LineMenu line={{ id: o.id, title: o.title, isin: o.isin, sub: `${summary.subtitle} · ${summary.hero} ${summary.heroUnit ?? ""}`.trim() }} watching={watching} onFiche={false} pdf />
                <CoachMarks id="fiche" replayLabel={t("Comment lire cette fiche ?")} stops={coachStops.map((c) => ({ ...c, title: t(c.title), text: t(c.text) }))} />
              </div>
            </div>
          </div>
        </div>

        <FicheReading o={o} data={fiche} />
      </FichePanes>
      </SwipePager>

      <aside className={styles.side} id="intention" data-coach="action">
        <IntentForm offer={o} types={types} initialType={initial} initialAmount={qty} held={held} past={past} signedIn={Boolean(session)} tier={o.kind === "FONDS" && session?.kycStatus === "approuve" ? 2 : (session?.tier ?? 0)} phone={session?.phone ?? ""} phoneProven={Boolean(session?.phoneVerified)} email={session?.email ?? ""} name={session?.name ?? ""} channels={channels} bridge={bridge} profileFlag={mark?.level === "warn" ? mark[lang] : undefined} investable={fin?.investable} />
        {o.maturityOn && !past && (
          <div className={styles.sideNote}>
            {t("Durée réelle")} <b>{tenorText(o.settleOn, o.maturityOn)}</b> · {t("règlement le")} {fmtDate(o.settleOn)} · {o.sizeLabel ?? ""}
          </div>
        )}
      </aside>
      {!past && <StickyAction label={t(o.kind === "FONDS" ? "Souscrire ou racheter" : o.kind === "MARCHE" ? "Passer un ordre" : "Déclarer une intention")} href={intentHref(o.id, { intent: sp.intent, qty, de: sp.de })} secondaryHref={`/comparer?a=${o.id}`} secondaryLabel={t("Comparer")} />}
    </div>
  );
}
