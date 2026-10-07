import Link from "next/link";
import { ContactRapide } from "@/components/ContactRapide";
import type { Channel } from "@/lib/domain/types";
import { ListNav } from "@/components/ListNav";
import { newsFor } from "@/lib/news";
import { notFound } from "next/navigation";
import { IntentForm } from "@/components/IntentForm";
import { LineIdentity } from "@/components/LineIdentity";
import { FichePanes, StickyAction } from "@/components/mobile/FichePanes";
import { SwipePager } from "@/components/mobile/SwipePager";
import { FicheReading, loadFiche } from "./FicheReading";
import { FicheHead } from "./FicheHead";
import { summarize } from "@/lib/domain/summary";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { familySegment, offerFamily, SEGMENT_LABEL, statusLabel } from "@/lib/domain/status";
import { ficheStops } from "@/lib/domain/fiche-stops";
import { tenorText } from "@/lib/finance";
import { fmtDate } from "@/lib/format";
import styles from "./page.module.css";
import { getLang, getT } from "@/i18n/server";
import { intentHref, loadIntentContext } from "./intent-context";
import { COMPANY, PRODUCT } from "@/lib/config";
import { ApercuPartage } from "./ApercuPartage";
import { identite } from "./identite";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ intent?: string; qty?: string; de?: string; canal?: string }> };

/**
 * Ce qu'une messagerie montre sous un lien partagé.
 *
 * Elle portait les chiffres : le rendement, la clôture, le ticket. Une carte
 * de partage est lue par le robot de WhatsApp, qui n'a pas de session : elle
 * publiait donc en clair ce que la page retient maintenant, et par un canal
 * que personne ne contrôle. Elle dit désormais l'identité de la ligne, la même
 * que la page, et ce qui s'y trouve.
 *
 * Le titre suit la même règle : `offer.title` porte le coupon (« OTA 5,6 %
 * 2033 »), et il est remplacé par la nature et la durée.
 */
export async function generateMetadata({ params }: Props) {
  const o = await repo().getOffer((await params).id);
  if (!o) return { title: "Offre" };
  const id = identite(o);
  const title = `${id.nom} · ${id.emetteur}`;
  const description = `La fiche de cette ligne sur le Guichet : son émetteur, sa nature, son échéance. ${COMPANY.name}, ${COMPANY.licence.split(" · ")[0].replace(/^S/, "s")}.`;
  return { title, description, openGraph: { title, description, type: "article", siteName: `${PRODUCT.name} · ${COMPANY.name}` }, twitter: { card: "summary_large_image", title, description } };
}



export default async function OfferPage({ params, searchParams }: Props) {
    const [{ id }, sp] = await Promise.all([params, searchParams]);
  /* « ?canal=WhatsApp » : le geste qui a amene ici disait deja comment on veut
     etre rappele, la page ne le redemande pas. */
  const canalDemande = (["WhatsApp", "Appel", "E-mail"] as Channel[]).find((c) => c === sp.canal);
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const [o, session] = await Promise.all([repo().getOffer(id), getSession()]);
  if (!o) notFound();
  /* La fiche est la seule adresse du catalogue restée devant la porte, parce
     qu'un lien partagé par WhatsApp doit continuer de travailler. Déconnecté,
     elle rend l'identité de la ligne et nomme ce qu'elle retient. */
  if (!session) return <ApercuPartage offer={o} />;
  if (o.status === "withdrawn" && !isDesk(session)) {
    return (
      <div className={styles.page}>
        <div className={styles.main}>
          <ListNav id={o.id} fallbackHref="/" fallbackLabel="Toutes les offres" />
          <h1 className="display" style={{ marginTop: 12 }}>
            {o.title}
          </h1>
          <p className="muted">{t("Cette ligne a été retirée de Guichet. Pour toute question, contactez le desk.")}</p>
        </div>
      </div>
    );
  }
  // Quatre lectures qui ne s'attendent pas : la veille du lecteur, le contexte
  // de l'intention, le corps de la fiche, les actualités liées. Enchaînées, la
  // page payait quatre allers-retours avant de commencer à se rendre, et c'est
  // ce qu'on attendait en glissant d'une fiche à la suivante.
  const [watching, ctx, fiche, relatedNews] = await Promise.all([
    session ? repo().listWatches(session.userId).then((w) => w.some((x) => x.offerId === id)) : Promise.resolve(false),
    loadIntentContext(o, sp, session),
    loadFiche(o),
    newsFor("offer", o.id).then((n) => n.length),
  ]);
  const { channels, bridge, fin, mark, types, initial, held, qty, st, past, switchTargets } = ctx;
  const summary = summarize(o, new Date());

  // « À garder en tête » comes from the product type (desk-editable in the référentiel).
  // Les repères du tour parlent de CETTE ligne, avec ses chiffres. Ils sont
  // fabriqués dans le domaine plutôt qu'ici, pour qu'un cliquet puisse vérifier
  // qu'ils passent en anglais : composés autour du chiffre principal, ils
  // traversent t() sous forme de variable, et le scanner de clefs ne les voit pas.
  const coachStops = ficheStops(o, summary, { hasNews: relatedNews > 0 });

  return (
    <div className={styles.page}>
      <SwipePager id={o.id} hintKey="fiche" hints={{ next: "Glissez vers la gauche : la ligne suivante", prev: "Glissez vers la droite : la ligne précédente" }}>
      <FichePanes className={styles.main}>
        <ListNav id={o.id} fallbackHref={o.kind === "FONDS" ? "/fonds" : "/"} fallbackLabel={o.kind === "FONDS" ? "Tous les fonds" : "Toutes les offres"} />
        <FicheHead o={o} s={summary} st={st} coach horizon={{ level: mark?.level, text: mark?.[lang], hasProfile: Boolean(fin) }} watching={watching} signedIn={Boolean(session)} stops={coachStops.map((c) => ({ ...c, title: t(c.title), text: t(c.text) }))} />

        <FicheReading o={o} data={fiche} />
      </FichePanes>
      </SwipePager>

      <aside className={styles.side} id="intention" data-coach="action">
        {/* AU-DESSUS DU FORMULAIRE, parce qu'il répond à la question la plus
            fréquente et la moins engageante. Un client dont un canal est
            prouvé n'a rien à redéclarer pour demander un rappel : le
            formulaire entier existe pour engager une opération. */}
        <div id="contact">
          <ContactRapide
            offer={{ id: o.id, title: o.title }}
            emailProuve={Boolean(channels?.emailVerifiedAt || session?.email)}
            telephoneProuve={Boolean(channels?.phoneVerifiedAt && channels?.phone)}
            canalInitial={canalDemande}
          />
        </div>
        <IntentForm offer={o} types={types} initialType={initial} initialAmount={qty} held={held} switchTargets={switchTargets} past={past} signedIn={Boolean(session)} tier={o.kind === "FONDS" && session?.kycStatus === "approuve" ? 2 : (session?.tier ?? 0)} phone={session?.phone ?? ""} phoneProven={Boolean(session?.phoneVerified)} email={session?.email ?? ""} name={session?.name ?? ""} channels={channels} bridge={bridge} profileFlag={mark?.level === "warn" ? mark[lang] : undefined} investable={fin?.investable} />
        {o.maturityOn && !past && (
          <div className={styles.sideNote}>
            {t("Durée réelle")} <b>{t(tenorText(o.settleOn, o.maturityOn))}</b> · {t("règlement le")} {fmtDate(o.settleOn)} · {o.sizeLabel ?? ""}
          </div>
        )}
      </aside>
      {!past && <StickyAction label={t(o.kind === "FONDS" ? "Souscrire ou racheter" : o.kind === "MARCHE" ? "Passer un ordre" : "Déclarer une intention")} href={intentHref(o.id, { intent: sp.intent, qty, de: sp.de })} secondaryHref={`/comparer?a=${o.id}`} secondaryLabel={t("Comparer")} />}
    </div>
  );
}
