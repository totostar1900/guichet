import { Simulator } from "@/components/Simulator";
import { GLOSSARY, type TermKey } from "@/lib/glossary";
import styles from "./page.module.css";

export const metadata = { title: "Simulateur & repères" };

const REPERES: TermKey[] = ["rendement_actuariel", "pair", "coupon_couru", "in_fine", "prix_limite", "lignes", "precompte", "svt", "decote_duree", "seuils", "liquidite", "nominal"];

export default function SimulateurPage() {
  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <h2>Simulateur d&apos;obligation</h2>
        <p className={styles.lead}>Un outil pour comprendre comment le prix, le coupon et la durée fabriquent le rendement. Il ne porte sur aucune offre en cours : les prix des offres sont fixés par le desk et se lisent dans le Guichet.</p>
        <div className={styles.warn}>Outil pédagogique — résultats bruts, avant fiscalité, convention Exact/Exact. Ne constitue ni une offre ni un conseil.</div>
        <Simulator />
      </div>
      <div className={styles.card}>
        <h2>Repères</h2>
        <p className={styles.lead}>Les mots qui reviennent dans chaque offre, expliqués une fois pour toutes.</p>
        <div className={styles.gloss}>
          {REPERES.map((k) => (
            <div key={k}>
              <b>{"long" in GLOSSARY[k] && GLOSSARY[k].long ? `${GLOSSARY[k].short} — ${GLOSSARY[k].long}` : GLOSSARY[k].short}</b>
              {GLOSSARY[k].text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
