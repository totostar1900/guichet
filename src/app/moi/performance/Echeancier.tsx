import { fmt, fmtMillions } from "@/lib/format";
import { getT } from "@/i18n/server";
import { totalDeLEcheancier, type MoisDEcheancier } from "@/lib/domain/echeancier";
import { UNE_SERIE } from "@/lib/domain/palette-graphiques";
import styles from "./page.module.css";

/**
 * Les flux attendus, mois par mois.
 *
 * UNE SEULE SÉRIE, DONC UNE SEULE COULEUR et pas de légende : le titre dit ce
 * que les colonnes sont, et une boîte de légende pour une série unique est une
 * ligne de plus à lire pour rien.
 *
 * LES MOIS VIDES SONT DESSINÉS, à zéro. Les sauter donnerait un axe qui ment :
 * douze colonnes serrées laisseraient croire à douze mois de versements quand
 * il n'y en a que trois.
 *
 * SEUL LE PLUS GRAND PORTE SON CHIFFRE. Un nombre sur chaque colonne se lit
 * comme un tableau mal rangé ; le reste se lit au survol, et la table dessous
 * porte tout pour qui ne survole pas.
 *
 * CE QUE CE GRAPHIQUE NE DIT PAS, et la page l'écrit à côté : ce sont des
 * ÉCHÉANCES. L'application connaît la date à laquelle l'émetteur doit payer,
 * elle ne constate pas l'arrivée sur le compte.
 */
export async function Echeancier({ mois }: { mois: MoisDEcheancier[] }) {
  const t = await getT();
  const total = totalDeLEcheancier(mois);
  if (total <= 0) return <p className="muted">{t("Aucun flux attendu sur les douze prochains mois.")}</p>;

  const haut = Math.max(...mois.map((m) => m.montant));
  const L = 640;
  const H = 128;
  const base = 96;
  const pas = L / mois.length;
  const large = Math.min(42, pas - 14);
  const fort = mois.reduce((a, b) => (b.montant > a.montant ? b : a), mois[0]);
  const nomDuMois = (cle: string) => new Date(`${cle}-01T00:00:00Z`).toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" }).replace(".", "");

  return (
    <>
      <svg viewBox={`0 0 ${L} ${H}`} className={styles.graphe} role="img" aria-label={t("Flux attendus mois par mois, {n} FCFA au total sur douze mois", { n: fmt(Math.round(total)) })}>
        <line x1="0" y1={base} x2={L} y2={base} stroke="var(--line)" strokeWidth="1" />
        {mois.map((m, i) => {
          /* Une colonne à zéro n'a pas de barre : un rectangle de hauteur nulle
             se dessine quand même en un trait, et ce trait se lit comme un
             petit montant. */
          const h = haut > 0 ? Math.round((m.montant / haut) * 76) : 0;
          const x = Math.round(i * pas + (pas - large) / 2);
          return h > 0 ? <rect key={m.mois} x={x} y={base - h} width={large} height={h} rx="4" fill={UNE_SERIE}><title>{`${nomDuMois(m.mois)} · ${fmt(Math.round(m.montant))} FCFA`}</title></rect> : null;
        })}
        {mois.map((m, i) =>
          /* Un mois sur trois : douze étiquettes se chevauchent sur un
             téléphone, et l'axe devient illisible au lieu d'être précis. */
          i % 3 === 0 ? (
            <text key={m.mois} x={Math.round(i * pas + pas / 2)} y={base + 18} textAnchor="middle" fontSize="10" fill="var(--ink-3)">
              {nomDuMois(m.mois)}
            </text>
          ) : null,
        )}
        <text x={Math.round(mois.indexOf(fort) * pas + pas / 2)} y={base - Math.round((fort.montant / haut) * 76) - 6} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--ink)">
          {fmtMillions(fort.montant)}
        </text>
      </svg>
      <p className={styles.sousGraphe}>
        {t("Coupons et remboursements attendus · {n} FCFA sur douze mois", { n: fmt(Math.round(total)) })}
      </p>
    </>
  );
}
