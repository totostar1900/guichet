"use client";

import styles from "./commun.module.css";

/**
 * LES PIÈCES COMMUNES DES MAQUETTES, ÉCRITES UNE FOIS.
 *
 * DEMANDÉ LE 28 OCTOBRE 2026, à la quatrième : « harmoniser — on ne veut pas
 * une présentation entièrement nouvelle à chaque fois, mais rester dans une
 * approche très semblable ». La demande est juste, et elle arrive au bon
 * moment : trois maquettes partageaient déjà une feuille de style, mais
 * chacune redessinait ses blocs en JSX. Elles se ressemblaient parce que
 * j'avais recopié ; elles se seraient éloignées à la première retouche.
 *
 * CE QUI EST COMMUN EST DONC ICI, et ce qui reste dans une maquette est sa
 * SEULE question : un montant contre des titres, une enchère contre un
 * repère, un jour du mois, une quantité détenue. Une maquette qui ne pose pas
 * de question neuve n'a pas lieu d'être.
 *
 * Elles vivent toutes à des adresses provisoires et partent avec la décision.
 */

/** Le bandeau qui dit que rien n'est envoyé, et ce que cette maquette essaie. */
export function Bandeau({ essaie }: { essaie: string }) {
  return (
    <p className={styles.bandeau}>
      Maquette · rien n&apos;est envoyé · <span>{essaie}</span>
    </p>
  );
}

/** Le haut de l'écran : d'où l'on est, ce qu'on regarde, et son code. */
export function Tete({ sur, titre, isin }: { sur: string; titre: string; isin: string }) {
  return (
    <header className={styles.tete}>
      <span className={styles.marche}>{sur}</span>
      <h1 className={styles.titre}>{titre}</h1>
      <span className={styles.isin}>{isin}</span>
    </header>
  );
}

/**
 * LE CHAMP : une question, de quoi y répondre, et la conséquence dessous.
 *
 * C'EST LA FORME DE TOUTE LA PROPOSITION, et elle ne dépend pas de la façon
 * dont on répond. On répond en tapant un montant, en choisissant un jour sur
 * une grille, demain peut-être en faisant glisser un curseur : la question
 * reste au-dessus, la conséquence reste dessous, et la carte reste la même.
 *
 * ÉCRIT LE 28 OCTOBRE 2026 PARCE QU'UNE ÉPREUVE L'A EXIGÉ. L'épargne demande
 * un JOUR DU MOIS, qui ne se tape pas : faute d'avoir cette pièce-ci, elle
 * recopiait le libellé et la ligne de conséquence de « Boite » à la main.
 * Elle se ressemblait, et elle aurait divergé à la première retouche — ce
 * qui est exactement ce que la demande du jour veut empêcher.
 */
/**
 * LA FINE INSÉCABLE DEVANT LES SIGNES DOUBLES.
 *
 * Relevé sur la capture du 28 octobre : « Combien voulez-vous verser chaque
 * mois ? » renvoyait le point d'interrogation SEUL à la ligne suivante. Une
 * espace ordinaire est un endroit où le navigateur a le droit de couper ; la
 * fine insécable (U+202F) est celle que le français demande devant ? ! : ; et
 * elle ne se coupe pas. La maison s'en sert déjà pour les milliers
 * (« src/lib/format.ts ») ; ici c'est le kit qui l'applique, une fois, pour
 * que personne n'ait à y penser en écrivant sa question.
 */
export const fine = (s: string) => s.replace(/ ([?!:;])/g, " $1");

export function Champ({
  question,
  pour,
  nomme,
  children,
  dessous,
}: {
  question: string;
  /** L'identifiant du champ que ce libellé désigne, quand il y en a un. */
  pour?: string;
  /** L'identifiant DU LIBELLÉ, quand la réponse est un groupe et non un champ. */
  nomme?: string;
  children: React.ReactNode;
  /** Ce que la réponse donne, lu à voix haute dès qu'elle change. */
  dessous: React.ReactNode;
}) {
  return (
    <section className={styles.carte}>
      {pour ? (
        <label className={styles.champLabel} htmlFor={pour}>
          {fine(question)}
        </label>
      ) : (
        <span className={styles.champLabel} id={nomme}>
          {fine(question)}
        </span>
      )}
      {children}
      <p className={styles.equiv} aria-live="polite">
        {dessous}
      </p>
    </section>
  );
}

/**
 * LA BOÎTE : un champ dont la réponse est un grand chiffre, avec son unité.
 *
 * C'est le cas le plus fréquent, et la raison d'être de ces maquettes : le
 * chiffre que le client écrit de sa main occupe une boîte à lui, dans la plus
 * grande police de l'écran, et ce qu'il produit se lit sous sa main pendant
 * qu'il tape.
 */
export function Boite({
  id,
  question,
  valeur,
  onChange,
  unite,
  gabarit = "0",
  mode = "numeric",
  entre,
  dessous,
}: {
  id: string;
  question: string;
  valeur: string;
  onChange: (v: string) => void;
  unite: string;
  gabarit?: string;
  mode?: "numeric" | "decimal";
  /**
   * CE QUI S'INTERCALE ENTRE LE CHIFFRE ET SA CONSÉQUENCE, quand le produit en
   * demande : la jauge du taux d'une adjudication est là, et nulle part
   * ailleurs. Une fente dans la pièce commune vaut mieux qu'une seconde pièce
   * presque pareille — c'est ainsi que deux maquettes se mettent à diverger.
   */
  entre?: React.ReactNode;
  /** Ce que le chiffre donne, lu à voix haute dès qu'il change. */
  dessous: React.ReactNode;
}) {
  return (
    <Champ question={question} pour={id} dessous={dessous}>
      <div className={styles.saisie}>
        <input id={id} inputMode={mode} autoComplete="off" placeholder={gabarit} value={valeur} onChange={(e) => onChange(e.target.value)} />
        <span className={styles.unite}>{unite}</span>
      </div>
      {entre}
    </Champ>
  );
}

/** Ce qu'on lit quand rien n'est encore tapé : gris, et jamais un reproche. */
export const Attente = ({ children }: { children: React.ReactNode }) => <span className={styles.equivVide}>{children}</span>;
/** Ce qui empêche d'avancer : dit, pas crié. */
export const Trop = ({ children }: { children: React.ReactNode }) => <span className={styles.equivCourt}>{children}</span>;

/** Le pied : une seule action pleine largeur, et ce qu'il faut savoir dessous. */
export function Pied({ mot, pret = true, sur, note, second, surSecond }: { mot: string; pret?: boolean; sur: () => void; note?: React.ReactNode; second?: string; surSecond?: () => void }) {
  return (
    <div className={styles.pied}>
      <button type="button" className={styles.action} disabled={!pret} onClick={sur}>
        {mot}
      </button>
      {second && (
        <button type="button" className={styles.second} onClick={surSecond}>
          {second}
        </button>
      )}
      {note && <small>{note}</small>}
    </div>
  );
}

/** Le récapitulatif : ce qu'on relit, et non ce qu'on remplit. */
export function Recap({
  titre,
  lignes,
  mot,
  apres,
}: {
  titre: string;
  lignes: { quoi: string; dit: React.ReactNode; fort?: boolean }[];
  mot: React.ReactNode;
  /** Ce qu'une maquette ajoute sous sa phrase — un lien, un autre chemin. */
  apres?: React.ReactNode;
}) {
  return (
    <section className={styles.carte}>
      <h2 className={styles.recapTitre}>{titre}</h2>
      <dl className={styles.recap}>
        {lignes.map((l) => (
          <div key={l.quoi} className={l.fort ? styles.recapFort : undefined}>
            <dt>{l.quoi}</dt>
            <dd>{l.dit}</dd>
          </div>
        ))}
        <div>
          <dt>On vous répond</dt>
          <dd className={styles.coordonnees}>
            <span>Georges Nitcheu</span>
            <span>georges.nitcheu@gmail.com</span>
            <span>WhatsApp +237 6 87 67 67 67</span>
          </dd>
        </div>
      </dl>
      <p className={styles.recapMot}>{mot}</p>
      {apres}
    </section>
  );
}

/** Mille, cent, dix : groupés comme on les lit. */
export const MILLIERS = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ");
/** Ce qu'on garde d'une frappe sur un montant : des chiffres, et rien d'autre. */
export const chiffres = (v: string) => v.replace(/\D/g, "");
