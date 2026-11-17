import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { ordreSignable } from "@/lib/domain/intent";
import { buildPerformance } from "@/lib/performance-report";
import { fmt, fmtPct } from "@/lib/format";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { EnBref } from "@/components/EnBref";
import { SoldeDeLaProvision } from "../provision/Solde";
import { GestesDeLArgent } from "./Gestes";
import { reglesEnPlace } from "./en-place";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mon argent") };
}

/**
 * « MON ARGENT » : LE SOLDE EN TÊTE, TROIS GESTES, ET CE QUI PART TOUT SEUL (16 novembre 2026, planche « Mon argent », 1A et 2B).
 *
 * La provision est le haut de la page : le solde, ses deux états, puis les trois gestes — verser, placer, retirer. Dessous, « Ce qui part tout seul » : chaque règle en place y paraît UNE
 * fois, avec son état et, quand elle attend quelque chose du client, le geste dans la rangée. Les anciennes pages « Ma provision » et « Ce qui part tout seul » redirigent ici.
 */
export default async function ArgentPage() {
  const t = await getT();
  const s = await requireSession("/moi/argent");
  const r = repo();
  const [regles, mandats, intents, offers, cash] = await Promise.all([reglesEnPlace(s.userId, t), r.listMandats(s.userId).catch(() => []), r.listIntents().catch(() => []), r.listOffers().catch(() => []), r.listCash(s.userId).catch(() => [])]);
  const mandat = mandats.find((m) => m.objet === "provision" && m.state !== "revoque");
  /* « SUIVRE MON ARGENT » PORTE SES CHIFFRES : combien d'ordres attendent, et ce que l'épargne a rapporté (les mêmes chiffres que la page du rendement, lus du même calcul). */
  const mes = intents.filter((i) => i.clientId === s.userId);
  const aSigner = mes.filter((i) => ordreSignable(i)).length;
  const enCours = mes.filter((i) => ["recue", "contre_proposee", "confirmee", "transmise"].includes(i.state) && !ordreSignable(i)).length;
  const perf = buildPerformance(mes, offers, cash);
  const signe = (v: number) => (v > 0 ? "+" : "");
  const rendement = perf.lines.length === 0 ? t("Paraît dès votre première opération réglée.") : perf.lines.some((l) => l.valuable) && perf.rate != null ? `${t("{p} par an", { p: `${signe(perf.rate)}${fmtPct(perf.rate, 2)}` })} · ${signe(perf.gain)}${fmt(Math.round(perf.gain))} FCFA` : t("La répartition, l'échéancier et vos opérations.");
  const suivi: { href: string; nom: string; dit: string; attend?: string }[] = [
    { href: "/moi/ordres", nom: t("Mes ordres"), dit: aSigner + enCours === 0 ? t("Aucun ordre en cours.") : [aSigner ? t("{n} à signer", { n: String(aSigner) }) : undefined, enCours ? t("{n} en cours", { n: String(enCours) }) : undefined].filter(Boolean).join(" · "), attend: aSigner ? t("à signer") : undefined },
    { href: "/moi/performance", nom: t("Ce que mon épargne a rapporté"), dit: rendement },
    { href: "/moi/documents/argent", nom: t("Les mouvements"), dit: t("Versements, prélèvements, retraits.") },
    { href: "/moi/tarifs", nom: t("Ce que cela coûte"), dit: t("Rien : ni la tenue, ni le virement de retour") },
  ];
  return (
    <Glissement>
      <div className={`pile ${styles.page}`}>
        <EnTete surTitre={t("Mon argent chez nous")} titre={t("Mon argent")} phrase={t("Ce que vous avez, ce que vous pouvez en faire, et ce qui part tout seul.")} aCote={<EnBref brief="provision" />} />
        <section className={styles.groupe} aria-label={t("Mon solde")}>
          <div className={styles.chapitre}>
            <h2 className={styles.titre}>{t("Mon solde")}</h2>
            <p className={styles.promesse}>{t("Ce que vous avez, et ce que vous en faites.")}</p>
          </div>
          <SoldeDeLaProvision userId={s.userId} />
          <GestesDeLArgent mandatId={mandat?.id} />
        </section>
        <section className={styles.groupe} id="en-place" aria-label={t("Ce qui part tout seul")}>
          <div className={styles.chapitre}>
            <h2 className={styles.titre}>{t("Ce qui part tout seul")}</h2>
            <p className={styles.promesse}>{t("Vos règles en place, et ce qu'elles attendent de vous.")}</p>
          </div>
          <div className={styles.lignes}>
            {regles.map((l) => (
              <div key={l.cle} className={styles.ligne}>
                <Link href={l.href} className={styles.corps}>
                  <span>
                    <b>{l.nom}</b>
                    <small>{l.dit}</small>
                  </span>
                  <em className={l.ton === "actif" ? styles.actif : l.ton === "attente" ? styles.attend : styles.autre}>{l.etat}</em>
                </Link>
                {l.geste && (
                  <Link href={l.geste.href} className={styles.geste2}>
                    {l.geste.libelle} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
        <section className={styles.groupe} aria-label={t("Suivre mon argent")}>
          <div className={styles.chapitre}>
            <h2 className={styles.titre}>{t("Suivre mon argent")}</h2>
            <p className={styles.promesse}>{t("Où il en est, ce qu'il a rapporté, ce qu'il coûte.")}</p>
          </div>
          <div className={styles.tuiles}>
            {suivi.map((x) => (
              <Link key={x.href} href={x.href} className={styles.tuile}>
                <span>
                  <b>{x.nom}</b>
                  <small>{x.dit}</small>
                </span>
                {x.attend && <em className={styles.attend}>{x.attend}</em>}
                <i aria-hidden="true">›</i>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </Glissement>
  );
}
