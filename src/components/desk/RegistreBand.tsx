import { MOTIFS_D_ECART, type Correspondance } from "@/lib/domain/registre-ecartes";
import styles from "./RegistreBand.module.css";

/**
 * LE DRAPEAU DU REGISTRE, AU-DESSUS DE LA DÉCISION.
 *
 * Il est au-dessus et pas à côté : une correspondance découverte APRÈS
 * l'approbation ne sert plus à rien, et un bandeau qu'il faut chercher est
 * un bandeau qu'on ne voit pas le jour où il compte.
 *
 * Il ne décide rien. Il nomme la personne du dossier qui a accroché, ce sur
 * quoi elle a accroché, et ce que la maison avait écrit ce jour-là. Le reste
 * est le travail d'un responsable.
 */
export function RegistreBand({ hits, t }: { hits: Correspondance[]; t: (s: string, v?: Record<string, string>) => string }) {
  if (hits.length === 0) return null;
  const dur = hits.some((h) => h.niveau === "correspondance");
  return (
    <div className={`${styles.band} ${dur ? styles.dur : styles.doux}`} role="status">
      <span className={styles.eyebrow}>{t("Registre des personnes écartées")}</span>
      <b>
        {dur
          ? t("Une pièce de ce dossier figure au registre.")
          : t("Une personne de ce dossier ressemble à une inscription du registre.")}
      </b>
      <ul className={styles.liste}>
        {hits.map((h, i) => (
          <li key={i}>
            <b>{h.personne.nom}</b> <span className={styles.role}>({t(h.personne.role)})</span> ·{" "}
            {h.niveau === "correspondance" ? t("même pièce") : t("même nom et même date de naissance")} : {h.sur}
            <br />
            <span className={styles.quoi}>
              {t("Inscrit le {d} par {q}", { d: h.ecarte.le.slice(0, 10), q: h.ecarte.par })} · {t(MOTIFS_D_ECART[h.ecarte.motif].libelle)}
              {/* LE MOTIF SE DIT ICI, ET C'EST VOULU. Le silence de la conformité
                  protège la personne d'apprendre qu'elle est soupçonnée : il vaut
                  envers elle, pas envers celui qui doit décider de son dossier. Un
                  responsable qui ne sait pas si c'est une fraude ou une sanction ne
                  peut pas trancher, et la marque lui rappelle ce qu'il ne répétera
                  pas au client. */}
              {MOTIFS_D_ECART[h.ecarte.motif].conformite ? ` · ${t("ne se dit pas à la personne")}` : ""}
              {h.ecarte.note ? ` · ${h.ecarte.note}` : ""}
            </span>
          </li>
        ))}
      </ul>
      <small className={styles.pied}>
        {t(
          "Le registre ne refuse pas : il vous le dit. Pour approuver malgré tout, écrivez dans « Notes internes » ce qui écarte la correspondance (homonymie, pièce rendue, inscription levée ailleurs), puis approuvez : la note est gardée avec la décision.",
        )}
      </small>
    </div>
  );
}
