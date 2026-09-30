import Link from "next/link";
import type { Offer } from "@/lib/domain/types";
import { getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import { identite } from "./identite";
import styles from "./ApercuPartage.module.css";

/**
 * Ce qu'un visiteur voit d'une ligne qu'on lui a partagée.
 *
 * Le canal WhatsApp est réel : un lien de fiche circule, et le refermer d'un
 * mur de connexion sec le tuerait. La page continue donc de travailler, et
 * elle rend l'IDENTITÉ de la ligne, jamais ses chiffres : l'émetteur, la
 * nature, le marché, l'échéance et le mode de remboursement, qui sont les
 * termes publiés par l'émetteur lui-même. Le taux, le rendement, le dernier
 * prix servi et l'échéancier restent derrière la porte, et la page dit
 * lesquels plutôt que de faire comme s'ils n'existaient pas.
 *
 * ELLE VEND EXACTEMENT CE QU'ELLE RETIENT.
 */

export async function ApercuPartage({ offer }: { offer: Offer }) {
  const t = await getT();
  const id = identite(offer);
  const marche = offer.kind === "FONDS" ? "OPCVM" : offer.kind === "ACTIONS" ? "Cote BVMAC" : "Adjudication, puis cote BVMAC";

  const faits: { quoi: string; dit: string }[] = [
    { quoi: t("Émetteur"), dit: offer.issuer || offer.countryName },
    { quoi: t("Nature"), dit: t(id.nature) },
    { quoi: t("Marché"), dit: t(marche) },
  ];
  if (offer.maturityOn) faits.push({ quoi: t("Échéance"), dit: t(fmtDate(offer.maturityOn)) });
  if (offer.kind === "OTA" || offer.kind === "APE") faits.push({ quoi: t("Remboursement"), dit: t("In fine") });

  const retenus = [t("Taux nominal"), t("Rendement"), t("Dernier prix servi"), t("Échéancier des flux")];

  return (
    <div className={styles.page}>
      <div className={styles.corps}>
        <header className={styles.tete}>
          <span className={styles.etiquette}>
            {t(id.nature)}
            {offer.countryName ? ` · ${offer.countryName}` : ""}
          </span>
          <h1>
            {t(id.nature)}
            {id.duree ? `, ${t(id.duree)}` : ""}
          </h1>
          <p>{t("Quelqu'un vous a partagé cette ligne. Voici ce qu'elle est.")}</p>
        </header>

        <div className={styles.faits}>
          {faits.map((f) => (
            <div key={f.quoi}>
              <span>{f.quoi}</span>
              <b>{f.dit}</b>
            </div>
          ))}
        </div>

        <div className={styles.retenu}>
          <span className={styles.verrou}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M6 11V8a6 6 0 0 1 12 0v3" />
              <rect x="4" y="11" width="16" height="9" />
            </svg>
            {t("Ce qui se lit avec un compte")}
          </span>
          <div className={styles.retenuListe}>
            {retenus.map((r) => (
              <div key={r}>
                <span>{r}</span>
                <em>· · ·</em>
              </div>
            ))}
          </div>
          <p>{t("Le prix, le rendement et l'échéancier sont réservés aux titulaires d'un compte. L'ouverture prend dix minutes, depuis ce téléphone.")}</p>
        </div>
      </div>

      <div className={styles.pied}>
        <Link className={styles.principal} href="/ouvrir-un-compte">
          {t("Ouvrir un compte-titres")}
        </Link>
        <Link className={styles.second} href={`/connexion?next=${encodeURIComponent(`/offres/${offer.id}`)}`}>
          {t("J'ai déjà un compte")}
        </Link>
      </div>
    </div>
  );
}
