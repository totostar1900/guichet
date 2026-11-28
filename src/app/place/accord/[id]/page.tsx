import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { fmt, fmtDateTime } from "@/lib/format";
import { facialLisible } from "@/lib/domain/facial-lisible";
import { monAccord, peutParticiper, placeOuverte } from "@/lib/place-donnees";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { Decompte } from "./Decompte";
import { Signature } from "./Signature";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accord" };

type Pas = { cle: string; titre: string; detail: string; etat: "fait" | "en_cours" | "a_venir" };

/**
 * L'ACCORD DU PARTICIPANT (28 novembre 2026, planche 4A et 5A) : une piste verticale en cinq pas et le compte à rebours des 72 heures, puis le contrat d'échange en cinq blocs. Les « textes du juriste »
 * sont des espaces réservés : aucune clause n'est écrite ici. Ne dit jamais qui est l'autre partie ni ce que l'autre paie.
 */
export default async function AccordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession(`/place/accord/${id}`);
  if (!placeOuverte() || !peutParticiper(s)) notFound();
  const t = await getT();
  const a = await monAccord(s.userId, id);
  if (!a) notFound();
  const clos = a.etat === "expire" || a.etat === "annule" || a.etat === "echec";
  const signe = a.etat === "signe" || a.etat === "bloque" || a.etat === "regle";
  const pas: Pas[] = [
    { cle: "principe", titre: t("Accord de principe"), detail: t("Le prix est convenu. Vous avez 72 heures pour signer."), etat: "fait" },
    { cle: "frais", titre: t("Frais"), detail: a.mesFrais != null ? `${fmt(a.mesFrais)} FCFA` : t("La maison vous appelle pour les convenir."), etat: a.mesFrais != null ? "fait" : "en_cours" },
    { cle: "signature", titre: t("Signatures"), detail: `${a.jAiSigne ? t("Vous avez signé.") : t("Vous n'avez pas signé.")} ${a.lAutreASigne ? t("L'autre partie a signé.") : t("L'autre partie n'a pas signé.")}`, etat: signe ? "fait" : a.mesFrais != null ? "en_cours" : "a_venir" },
    { cle: "blocage", titre: a.role === "acheteur" ? t("Fonds bloqués") : t("Titres bloqués"), detail: (a.role === "acheteur" ? a.fondsBloques : a.titresBloques) ? t("C'est fait.") : t("Après les deux signatures."), etat: a.etat === "bloque" || a.etat === "regle" ? "fait" : a.etat === "signe" ? "en_cours" : "a_venir" },
    { cle: "echange", titre: t("Échange réglé"), detail: a.regleLe ? fmtDateTime(a.regleLe) : t("Quand fonds et titres sont bloqués."), etat: a.etat === "regle" ? "fait" : a.etat === "bloque" ? "en_cours" : "a_venir" },
  ];
  const prix = a.unite === "pct" ? `${a.prix.toLocaleString("fr-FR")} %` : `${fmt(a.prix)} FCFA`;
  return (
    <Glissement>
      <div className="pile">
        <EnTete titre={a.titre} phrase={a.role === "vendeur" ? t("Vous vendez") : t("Vous achetez")} />
        {a.etat === "accord_de_principe" && <Decompte expireLe={a.expireLe} />}
        {clos && <p className={styles.clos}>{a.etat === "expire" ? t("Les 72 heures sont écoulées : l'accord est tombé.") : a.etat === "annule" ? t("Cet accord a été annulé.") : t("L'échange n'a pas pu être réglé : fonds et titres sont débloqués.")}</p>}
        <ol className={styles.piste}>
          {pas.map((p) => (
            <li key={p.cle} className={`${styles.pas} ${styles[p.etat]}`}>
              <strong>{p.titre}</strong>
              <span>{p.detail}</span>
            </li>
          ))}
        </ol>
        <section className={styles.contrat}>
          <h2>{t("Contrat d'échange")}</h2>
          <div className={styles.bloc}>
            <h3>{t("1. Parties et rôle d'arrangeur")}</h3>
            <p>{a.role === "vendeur" ? t("Vous êtes le vendeur. L'acheteur reste anonyme.") : t("Vous êtes l'acheteur. Le vendeur reste anonyme.")} {t("Purpose arrange l'échange : elle rapproche les parties, reçoit les fonds, livre les titres.")}</p>
          </div>
          <div className={styles.bloc}>
            <h3>{t("2. Objet")}</h3>
            <p>{fmt(a.quantite)} {t("titres")} · {t("facial")} {facialLisible(a.facial)} FCFA · {prix} · {t("valeur")} {fmt(a.valeur)} FCFA</p>
          </div>
          <div className={styles.bloc}>
            <h3>{t("3. Frais")}</h3>
            <p>{a.mesFrais != null ? `${fmt(a.mesFrais)} FCFA` : t("À convenir avec la maison avant la signature.")}</p>
          </div>
          <div className={styles.bloc}>
            <h3>{t("4. Règlement")}</h3>
            <p>{t("Les fonds de l'acheteur et les titres du vendeur sont bloqués, puis l'échange est réglé le même jour.")}</p>
          </div>
          <div className={styles.bloc}>
            <h3>{t("5. Dispositions juridiques")}</h3>
            <p className={styles.reserve}>{t("[Texte du juriste : à insérer avant l'ouverture.]")}</p>
          </div>
        </section>
        {a.peutSigner && !clos && <Signature accordId={a.id} />}
      </div>
    </Glissement>
  );
}
