import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { EnBref } from "@/components/EnBref";
import { Rubriques } from "@/components/mobile/Rubriques";
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
  const [regles, mandats] = await Promise.all([reglesEnPlace(s.userId, t), repo().listMandats(s.userId).catch(() => [])]);
  const mandat = mandats.find((m) => m.objet === "provision" && m.state !== "revoque");
  return (
    <Glissement>
      <div className={`pile ${styles.page}`}>
        <EnTete surTitre={t("Mon argent chez nous")} titre={t("Mon argent")} phrase={t("Ce que vous avez, ce que vous pouvez en faire, et ce qui part tout seul.")} aCote={<EnBref brief="provision" />} />
        <SoldeDeLaProvision userId={s.userId} />
        <GestesDeLArgent mandatId={mandat?.id} />
        <section className={styles.groupe} id="en-place" aria-label={t("Ce qui part tout seul")}>
          <h2 className={styles.titre}>{t("Ce qui part tout seul")}</h2>
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
        <Rubriques
          items={[
            { href: "/moi/documents/argent", nom: t("D'où vient ce solde"), quoi: t("Chaque mouvement au journal, à sa date de valeur") },
            { href: "/moi/tarifs", nom: t("Ce que cela coûte"), quoi: t("Rien : ni la tenue, ni le virement de retour") },
          ]}
        />
      </div>
    </Glissement>
  );
}
