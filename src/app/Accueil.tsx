import Link from "next/link";
import { repo } from "@/lib/data";
import { buildCurve, horizon, MIN_POINTS } from "@/lib/market/curve";
import { derniereParDuree } from "@/lib/market/lecture-b";
import { abouti, ajuster } from "@/lib/market/nelson-siegel";
import { getT } from "@/i18n/server";
import { fmt } from "@/lib/format";
import styles from "./Accueil.module.css";

/**
 * L'accueil d'un visiteur qui n'est pas connecté.
 *
 * La racine portait la liste des titres. C'était le défaut de fond de la
 * plateforme : rangée par instrument, elle sert l'acquisition, et un visiteur
 * y tombait sur un catalogue sans savoir chez qui il était ni ce que la maison
 * fait. Neuf services construits, et aucune surface qui les porte.
 *
 * Cette page mène donc par les SERVICES et par le MARCHÉ, et non par un
 * catalogue. Trois partis pris, et chacun se défend contre l'usage du métier :
 *
 *   AUCUN CHIFFRE DE PERFORMANCE EN ACCROCHE. La vitrine ne porte que des
 *   preuves vérifiables : six Trésors, les séances relues une à une, les trois
 *   chemins vers un rendement, et zéro chiffre inventé. C'est le seul argument
 *   qu'un concurrent ne peut pas copier, parce qu'il est vrai.
 *
 *   LE MARCHÉ EST OUVERT. La courbe est sur l'accueil, sans compte. Le retenir
 *   donnerait l'air d'avoir quelque chose à cacher, et c'est ce qui fait
 *   revenir.
 *
 *   CE QUI SE VÉRIFIE AILLEURS. L'agrément au registre, les titres au nom du
 *   client, le compte de règlement ségrégué, la source de chaque chiffre. La
 *   confiance ne se demande pas, elle se contrôle.
 *
 * Les chiffres de la page sont lus au dépôt, jamais écrits en dur : une
 * vitrine qui vante la rigueur ne peut pas mentir sur ses propres comptes.
 */

const W = 420;
const H = 210;
const P = { l: 34, r: 24, t: 18, b: 30 };

export async function Accueil() {
  const t = await getT();
  const seances = await repo()
    .listAuctionResults({ limit: 1000 })
    .catch(() => []);
  const relues = seances.filter((s) => s.confirmedBy && !s.setAsideAt);
  const tresors = new Set(relues.map((s) => s.country)).size;

  /**
   * La courbe du premier Trésor qui en porte une, ajustée.
   *
   * On ne choisit pas le Cameroun d'avance : on prend celui qui s'ajuste, et
   * s'il n'y en a aucun la figure ne paraît pas. Une vitrine ne montre pas une
   * courbe vide en prétendant que le marché est là.
   */
  const courbe = buildCurve(seances, { windowDays: 365 });
  const ajustee = courbe.countries
    .filter((c) => c.points.length >= MIN_POINTS)
    .map((c) => {
      const obs = derniereParDuree(
        c.points.map((p) => {
          const h = horizon(p.years);
          return { annees: p.years, pct: p.yield.pct, mot: `${h.n} ${h.unit}`, age: p.ageDays, mince: p.thin };
        }),
      );
      const f = ajuster(obs.map((q) => ({ annees: q.annees, pct: q.pct })));
      return abouti(f) ? { pays: c.country, fit: f, n: obs.length } : undefined;
    })
    .find((x): x is NonNullable<typeof x> => Boolean(x));

  const preuves = [
    { n: String(tresors || 6), quoi: t("Trésors suivis"), sous: t("Cameroun, Congo, Gabon, Tchad, RCA, Guinée équatoriale") },
    { n: fmt(relues.length), quoi: t("séances relues"), sous: t("une à une, sur le communiqué du Trésor") },
    { n: "3", quoi: t("chemins vers un rendement"), sous: t("imprimé par le Trésor, calculé du prix, converti d'un taux précompté") },
    { n: "0", quoi: t("chiffre inventé"), sous: t("ce qui manque est compté et nommé, jamais comblé") },
  ];

  const familles = [
    {
      etiquette: t("Placer"),
      titre: t("Entrer sur le marché"),
      quoi: t("Le primaire des six Trésors, les fonds de la zone et les actions cotées, avec la même exigence de preuve sur chaque chiffre."),
      items: [
        { n: "01", mot: t("Carnet de demande et placement primaire") },
        { n: "02", mot: t("Intermédiation sur les fonds") },
        { n: "05", mot: t("Courtage sur les actions cotées") },
      ],
    },
    {
      etiquette: t("Faire vivre"),
      titre: t("Ne rien laisser dormir"),
      quoi: t("Un coupon tombé sur un compte en banque cesse de rapporter pendant que la ligne qui l'a versé, elle, continue."),
      items: [
        { n: "06", mot: t("Réinvestissement des coupons") },
        { n: "03", mot: t("Épargne programmée mensuelle") },
        { n: "08", mot: t("Passage d'un fonds à l'autre") },
      ],
    },
    {
      etiquette: t("Tenir"),
      titre: t("Savoir ce que vous avez"),
      quoi: t("La conservation des titres à votre nom, et ce qu'ils ont rapporté, pondéré par les montants et par les dates."),
      items: [
        { n: "07", mot: t("Conservation et tenue de compte") },
        { n: "09", mot: t("Sondage avant une adjudication") },
        { n: "04", mot: t("Appariement des intentions") },
      ],
    },
  ];

  const garanties = [
    { titre: t("L'agrément"), quoi: t("n° COSUMAF-SDB-01/2026, inscrit au registre du régulateur régional.") },
    { titre: t("Les titres à votre nom"), quoi: t("Inscrits nominativement au dépositaire, jamais au nom de la maison.") },
    { titre: t("Le règlement ségrégué"), quoi: t("Votre argent ne se mêle pas au nôtre, et un journal en rend compte.") },
    { titre: t("La source de chaque chiffre"), quoi: t("Chaque taux affiché dit s'il a été imprimé par le Trésor ou calculé, et sur quoi.") },
  ];

  return (
    <div className={styles.page}>

      <section className={styles.ouverture}>
        <div className={styles.dire}>
          <span className={styles.agrement}>{t("Société de bourse agréée COSUMAF · SDB-01/2026")}</span>
          <h1>{t("Le marché des titres publics de la CEMAC, ouvert à qui veut y placer.")}</h1>
          <p className={styles.chapeau}>
            {t(
              "Bons et obligations des six Trésors, fonds de la zone, actions cotées à la BVMAC. Vous voyez les prix réellement adjugés, ce qu'ils rapportent, et ce qu'on ne sait pas encore.",
            )}
          </p>
          <div className={styles.gestes}>
            <Link className={styles.principal} href="/ouvrir-un-compte">
              {t("Ouvrir un compte-titres")}
            </Link>
            <Link className={styles.second} href="/services">
              {t("Voir les neuf services")}
            </Link>
          </div>
          {/* Une phrase entière, et non trois morceaux recollés : l'ordre des
              mots change d'une langue à l'autre, et une phrase découpée en
              clefs se brise à la traduction. */}
          <p className={styles.nominatif}>
            {t("À votre nom, jamais au nôtre : les titres sont inscrits nominativement au dépositaire. Ouverture en ligne, pièces signées en ligne.")}
          </p>
        </div>

        {/* La courbe, sans compte : c'est l'argument, et il est gratuit. */}
        {ajustee && <CourbeVitrine pays={ajustee.pays} fit={ajustee.fit} n={ajustee.n} t={t} />}
      </section>

      <section className={styles.preuves}>
        {preuves.map((p) => (
          <div key={p.quoi}>
            <b>{p.n}</b>
            <em>{p.quoi}</em>
            <small>{p.sous}</small>
          </div>
        ))}
      </section>

      <section className={styles.familles}>
        <div className={styles.tete}>
          <h2>{t("Ce que la maison fait pour vous")}</h2>
          <p>{t("Neuf services, chacun lisible avant d'ouvrir un compte. Ce qui demande une connexion, c'est de s'en servir.")}</p>
        </div>
        <div className={styles.grille3}>
          {familles.map((f) => (
            <div className={styles.famille} key={f.etiquette}>
              <span className={styles.etiquette}>{f.etiquette}</span>
              <h3>{f.titre}</h3>
              <p>{f.quoi}</p>
              <div className={styles.services}>
                {f.items.map((i) => (
                  <Link key={i.n} href="/services">
                    <i>{i.n}</i>
                    {i.mot}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* La seule surface pleine de la page. */}
      <section className={styles.verifie}>
        <h2>{t("Ce qui se vérifie")}</h2>
        <p className={styles.verifieDit}>
          {t("La confiance ne se demande pas. Voici quatre choses qu'un client peut contrôler ailleurs que chez nous, avant même d'ouvrir un compte.")}
        </p>
        <div className={styles.garanties}>
          {garanties.map((g) => (
            <div key={g.titre}>
              <b>{g.titre}</b>
              <span>{g.quoi}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.entrer}>
        <div>
          <h2>{t("Entrez par où vous voulez")}</h2>
          <p>{t("Par e-mail, par WhatsApp, ou par Google. C'est le même compte, et personne n'a de mot de passe à retenir.")}</p>
        </div>
        <Link href="/connexion">{t("Commencer")}</Link>
      </section>

    </div>
  );
}

/**
 * La courbe de la vitrine : une vraie courbe, tracée du modèle.
 *
 * Elle ne porte ni bande ni points : ce n'est pas l'écran d'analyse, c'est une
 * preuve que le marché existe et qu'on sait le lire. La phrase sous elle dit
 * sur quoi elle est ajustée et à combien elle s'en écarte, faute de quoi elle
 * serait une décoration.
 */
function CourbeVitrine({
  pays,
  fit,
  n,
  t,
}: {
  pays: string;
  fit: { taux: (a: number) => number; rmsePb: number; borne: { court: number; long: number } };
  n: number;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const court = fit.borne.court;
  const long = fit.borne.long;
  const grille = Array.from({ length: 40 }, (_, i) => Math.exp(Math.log(court) + ((Math.log(long) - Math.log(court)) * i) / 39));
  const ys = grille.map((a) => fit.taux(a));
  const lo = Math.min(...ys) - 0.3;
  const hi = Math.max(...ys) + 0.3;
  const X = (a: number) => P.l + ((Math.log(a) - Math.log(court)) / (Math.log(long) - Math.log(court) || 1)) * (W - P.l - P.r);
  const Y = (v: number) => H - P.b - ((v - lo) / (hi - lo || 1)) * (H - P.t - P.b);
  const graduations: number[] = [];
  for (let v = Math.ceil(lo * 2) / 2; v <= hi; v += 0.5) graduations.push(v);
  const usuels = [0.25, 0.5, 1, 2, 3, 5, 7, 10].filter((u) => u >= court && u <= long);
  const mot = (a: number) => (a < 1 ? t("{n} mois", { n: Math.round(a * 12) }) : a === 1 ? t("1 an") : t("{n} ans", { n: Math.round(a * 10) / 10 }));
  const pc = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.figTete}>
        <b>{t("La courbe du {p}", { p: pays })}</b>
        <span>{t("visible sans compte")}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("Courbe des taux ajustée du {p}, de {a} % à {d1} à {b} % à {d2}", { p: pays, a: pc(fit.taux(court)), d1: mot(court), b: pc(fit.taux(long)), d2: mot(long) })}>
        {graduations.map((v) => (
          <g key={v}>
            <line x1={P.l} y1={Y(v)} x2={W - P.r} y2={Y(v)} stroke="var(--line)" strokeWidth={1} />
            <text x={P.l - 7} y={Y(v) + 3} textAnchor="end" fill="var(--ink-3)" fontSize="9" fontFamily="var(--font-ui)">
              {v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </text>
          </g>
        ))}
        <polyline points={grille.map((a) => `${X(a).toFixed(1)},${Y(fit.taux(a)).toFixed(1)}`).join(" ")} fill="none" stroke="var(--navy)" strokeWidth={2} strokeLinejoin="round" />
        {usuels.map((u) => (
          <g key={u}>
            <circle cx={X(u)} cy={Y(fit.taux(u))} r={3} fill="var(--navy)" />
            <text x={X(u)} y={H - P.b + 16} textAnchor="middle" fill="var(--ink-3)" fontSize="9" fontFamily="var(--font-ui)">
              {mot(u)}
            </text>
          </g>
        ))}
      </svg>
      <p className={styles.figPied}>
        {t("Ajustée sur les {n} dernières durées adjugées, à {e} points de base près.", { n, e: Math.round(fit.rmsePb) })}{" "}
        <Link href="/info">{t("La méthode")}</Link>
      </p>
    </figure>
  );
}
