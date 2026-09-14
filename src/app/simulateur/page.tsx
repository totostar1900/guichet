import { Simulator } from "@/components/Simulator";
import styles from "./page.module.css";

export const metadata = { title: "Simulateur & repères" };

const GLOSSARY: [string, string][] = [
  ["Rendement actuariel", "Ce que rapporte réellement le placement, prix d'achat et coupon couru compris. La seule mesure comparable d'une ligne à l'autre."],
  ["Coupon couru", "Intérêts déjà produits depuis le dernier versement. Vous les avancez au règlement, puis les récupérez intégralement au coupon suivant."],
  ["In fine", "Le capital revient en une seule fois, à l'échéance. Entre-temps, vous ne percevez que les coupons annuels."],
  ["Adjudication et prix limite", "Le Trésor retient les offres les mieux-disantes. Le prix publié par Purpose Capital est le prix auquel vos ordres sont présentés ; vous pouvez être servi en partie, ou pas du tout."],
  ["Nouvelle ligne, abondement, rachat", "Une ligne nouvelle démarre sans coupon couru. Un abondement rouvre une ligne existante, avec sa durée restante. Un rachat est l'inverse : le Trésor reprend ses titres, en général au pair."],
  ["BTA à intérêts précomptés", "Vous payez moins que le nominal et recevez le nominal à l'échéance. Le taux précompté est calculé sur 360 jours ; le rendement réel est un peu plus élevé."],
  ["SVT", "Spécialiste en Valeurs du Trésor : la banque agréée qui dépose les offres à l'adjudication. Purpose Capital regroupe vos ordres et les transmet à un SVT avant l'heure limite."],
  ["Décote et durée", "Une même décote rapporte d'autant plus par an que la ligne est courte : une réouverture à 1 an 5 mois peut offrir un rendement supérieur à une ligne à 3 ans."],
];

export default function SimulateurPage() {
  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <h2 className="display">Simulateur d&apos;obligation</h2>
        <p className={styles.lead}>Un outil pour comprendre comment le prix, le coupon et la durée fabriquent le rendement. Il ne porte sur aucune offre en cours : les prix des offres sont fixés par le desk et se lisent dans le Guichet.</p>
        <div className={styles.warn}>Outil pédagogique — résultats bruts, hors commission et fiscalité, convention Exact/Exact. Ne constitue ni une offre ni un conseil.</div>
        <Simulator />
      </div>
      <div className={styles.card}>
        <h2 className="display">Repères</h2>
        <p className={styles.lead}>Les mots qui reviennent dans chaque offre, expliqués une fois pour toutes.</p>
        <div className={styles.gloss}>
          {GLOSSARY.map(([t, d]) => (
            <div key={t}>
              <b>{t}</b>
              {d}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
