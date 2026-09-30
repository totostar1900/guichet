import Link from "next/link";
import type { Offer } from "@/lib/domain/types";
import { getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
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

/** Le nom d'une nature, sans taux ni montant. Le même que celui de la bande. */
const NATURE: Record<string, string> = {
  BTA: "Bon du Trésor",
  OTA: "Obligation du Trésor",
  APE: "Obligation",
  ACTIONS: "Action",
  FONDS: "Part de fonds",
  RACHAT: "Obligation",
  MARCHE: "Obligation",
};

/** La durée en mots, sans date : « 26 semaines », « 7 ans », ou rien. */
function duree(o: Offer): string {
  if (!o.maturityOn || !o.settleOn) return "";
  const j = Math.round((Date.parse(o.maturityOn) - Date.parse(o.settleOn)) / 86400000);
  if (!Number.isFinite(j) || j <= 0) return "";
  if (j < 400) return `${Math.round(j / 7)} semaines`;
  const a = Math.round(j / 365);
  return a > 1 ? `${a} ans` : "1 an";
}

/**
 * L'identité d'une ligne, sans un chiffre de marché.
 *
 * `offer.title` porte le coupon (« OTA 5,6 % 2033 ») : le mettre en titre
 * d'une page qui retient les taux annulerait la page. La carte de partage lit
 * la même fonction, pour que l'aperçu envoyé dans une conversation dise
 * exactement ce que la page dira.
 */
export function identite(o: Offer): { nature: string; duree: string; emetteur: string } {
  return { nature: NATURE[o.kind] ?? "Ligne", duree: duree(o), emetteur: o.issuer || o.countryName };
}

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
