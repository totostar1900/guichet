import Link from "next/link";
import { repo } from "@/lib/data";
import { buildCurve, horizon, MIN_POINTS } from "@/lib/market/curve";
import { derniereParDuree } from "@/lib/market/lecture-b";
import { abouti, ajuster, type Ajustement } from "@/lib/market/nelson-siegel";
import { getT } from "@/i18n/server";
import { BandeInstruments, type LigneVitrine } from "@/components/accueil/BandeInstruments";
import type { Offer } from "@/lib/domain/types";
import styles from "./Accueil.module.css";

/**
 * L'accueil d'un visiteur qui n'est pas connecté.
 *
 * LA VITRINE NE PLAIDE PAS SA PROPRE CAUSE. La version précédente présentait
 * les neuf services en nommant, sous chacun, la limite qu'il porte. C'était
 * neuf raisons d'hésiter sur la seule page dont le travail est de donner envie
 * d'ouvrir un compte : un document d'information déguisé en page d'accueil.
 * Les limites n'ont pas disparu, elles ont déménagé là où elles portent, sur
 * « /info/risques » et au moment de l'acte.
 *
 * Trois partis pris, et chacun se défend contre l'usage du métier.
 *
 *   AUCUN SERVICE N'EST NOMMÉ NI DÉCRIT. Les neuf vivent derrière la porte.
 *   Ici la page parle en verbes, parce qu'un inventaire interne n'est pas une
 *   proposition : souscrire, négocier, placer, épargner, suivre. Chacun porte
 *   une figure géométrique plutôt qu'un numéro, parce qu'une liste numérotée
 *   promet un ordre qui n'existe pas.
 *
 *   AUCUN CHIFFRE, NULLE PART. La bande montre ce qui existe et retient les
 *   prix ; la courbe montre sa forme et laisse son échelle derrière la porte.
 *   Rien ici ne dit ce qui alimente nos analyses, ni sur quelle profondeur.
 *
 *   NI PROMESSE NI URGENCE. Pas de rendement en accroche, pas de compteur
 *   d'investisseurs, pas de compte à rebours.
 *
 * Ce qui paraît est lu au dépôt, jamais écrit en dur. Quand le dépôt ne rend
 * rien, la figure concernée ne paraît pas : elle ne se remplit pas.
 */

const W = 1000;
const H = 330;
const P = { l: 40, r: 15, t: 20, b: 58 };
/** Ce que la bande peut porter avant de devenir une liste qu'on ne lit plus. */
const MAX_BANDE = 18;

/** Le nom d'une nature d'instrument, sans son taux ni son montant. */
const NATURE: Record<string, string> = {
  BTA: "Bon du Trésor",
  OTA: "Obligation du Trésor",
  APE: "Obligation",
  ACTIONS: "Action",
  FONDS: "Part de fonds",
  RACHAT: "Obligation",
  MARCHE: "Obligation",
};

/** Trois familles : elles décident de la pastille et du marché affiché. */
const famille = (o: Offer): LigneVitrine["famille"] => (o.kind === "FONDS" ? "fonds" : o.kind === "ACTIONS" ? "cote" : "tresor");
const OU: Record<LigneVitrine["famille"], string> = { tresor: "Adjudication", cote: "Cote BVMAC", fonds: "OPCVM" };

/**
 * La durée d'une ligne, dite en mots, sans date.
 *
 * L'échéance exacte serait une donnée de marché ; « 7 ans » est l'identité de
 * la ligne, ce qui la fait reconnaître sans rien apprendre sur les prix.
 */
function duree(o: Offer): string {
  if (!o.maturityOn || !o.settleOn) return "";
  const j = Math.round((Date.parse(o.maturityOn) - Date.parse(o.settleOn)) / 86400000);
  if (!Number.isFinite(j) || j <= 0) return "";
  if (j < 400) return `${Math.round(j / 7)} semaines`;
  const a = Math.round(j / 365);
  return a > 1 ? `${a} ans` : "1 an";
}

export async function Accueil() {
  const t = await getT();
  const [offres, seances] = await Promise.all([
    repo()
      .listOffers()
      .catch(() => [] as Offer[]),
    repo()
      .listAuctionResults({ limit: 1000 })
      .catch(() => []),
  ]);

  /**
   * La bande : ce qui existe, sans un chiffre. Les trois familles alternent au
   * lieu de se suivre par paquets, pour qu'un lecteur qui regarde trois
   * secondes voie les trois.
   */
  const vivantes = offres.filter((o) => !o.hidden && o.status !== "draft" && !o.isExample);
  const par = (f: LigneVitrine["famille"]): LigneVitrine[] =>
    vivantes
      .filter((o) => famille(o) === f)
      // Une ligne d'État se nomme par son pays : « Trésor public de la
      // République centrafricaine » ne tient pas dans une colonne et se répète
      // à chaque ligne. Un émetteur privé, lui, garde son nom.
      .map((o) => ({ emetteur: (f === "tresor" ? o.countryName : o.issuer) || o.issuer || o.countryName, nature: NATURE[o.kind] ?? "Ligne", duree: duree(o), marche: OU[f], famille: f }));
  const paquets = [par("tresor"), par("cote"), par("fonds")];
  const lignes: LigneVitrine[] = [];
  for (let i = 0; lignes.length < MAX_BANDE && paquets.some((p) => p[i]); i++) {
    for (const p of [paquets[0], paquets[1], paquets[0], paquets[2]]) {
      if (p[i] && lignes.length < MAX_BANDE && !lignes.includes(p[i])) lignes.push(p[i]);
    }
  }

  /**
   * La courbe du premier Trésor qui en porte une, réduite à sa forme. On ne
   * choisit pas le pays d'avance : on prend celui qui s'ajuste, et s'il n'y en
   * a aucun la figure ne paraît pas. Une vitrine ne montre pas une courbe vide
   * en prétendant que le marché est là.
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
      return abouti(f) ? { fit: f, durees: [...new Set(obs.map((q) => q.annees))].sort((a, b) => a - b) } : undefined;
    })
    .find((x): x is NonNullable<typeof x> => Boolean(x));
  const trace = ajustee ? forme(ajustee.fit, ajustee.durees) : undefined;

  const verbes = [
    { d: "M3 25h22 M14 21V5 M8.5 11L14 5l5.5 6", titre: t("Souscrire au primaire."), dit: t("Votre demande part au Trésor sur la séance de votre choix, et l'allocation vous revient à votre nom, avec le prix servi.") },
    { d: "M4 10h20 M19.5 5.5L24 10l-4.5 4.5 M24 19H4 M8.5 14.5L4 19l4.5 4.5", titre: t("Négocier sur la cote."), dit: t("Les obligations et les actions de la BVMAC, au dernier cours publié et à sa date, avec les états financiers de l'émetteur à côté.") },
    { d: "M14 3l11 6-11 6-11-6z M3 15l11 6 11-6 M3 21l11 6 11-6", titre: t("Placer en fonds."), dit: t("Les fonds de la zone, leur valeur liquidative, leurs frais et leur date, comparés sur une même page.") },
    { d: "M24 14a10 10 0 1 1-3.2-7.3 M24.5 3.5v6h-6", titre: t("Épargner sans y penser."), dit: t("Un montant, un jour du mois, une destination fixée à la signature. Ce qui revient repart sur la ligne choisie d'avance.") },
    { d: "M3 23l7-7 5 4 9.5-11 M25 5h-6 M25 5v6", titre: t("Suivre le marché."), dit: t("La courbe de la zone, l'indice de la BVMAC, les séances à venir et les publications du desk.") },
  ];

  const etapes = [
    { d: "M6 3h11l5 5v17H6z M17 3v6h5 M10 16h9 M10 20h6", titre: t("Vous ouvrez"), dit: t("Une pièce d'identité, un justificatif de domicile, et le questionnaire de connaissance. Dix minutes, depuis votre téléphone.") },
    { d: "M14 4v13 M8.5 11.5L14 17l5.5-5.5 M3 21v4h22v-4", titre: t("Vous approvisionnez"), dit: t("Par virement, vers le compte espèces ouvert à votre nom. Le journal porte chaque mouvement, avec sa date de valeur.") },
    { d: "M6 4l18 10-18 10z M6 14h11", titre: t("Vous déclarez votre première intention"), dit: t("Sur la séance annoncée de votre choix, ou sur une ligne de la cote. Le desk confirme, et vous suivez l'allocation.") },
  ];

  return (
    <div className={styles.page}>

      <section className={styles.ouverture}>
        <div className={styles.dire}>
          <span className={styles.agrement}>{t("Société de bourse agréée COSUMAF · n° COSUMAF-SDB-01/2026")}</span>
          <h1>{t("Le marché primaire et la cote, dans un seul compte.")}</h1>
          <div className={styles.gestes}>
            <Link className={styles.principal} href="/ouvrir-un-compte">
              {t("Ouvrir un compte-titres")}
            </Link>
            <Link className={styles.second} href="/info/parcours">
              {t("Visite guidée · 30 secondes")}
            </Link>
          </div>
        </div>
        <div className={styles.cote}>
          <p className={styles.chapeau}>{t("Ouvert en quelques minutes. Les occasions du marché de la zone vous arrivent le jour même, et se traitent depuis votre téléphone.")}</p>
          <div className={styles.acces}>
            <span>
              <b>{t("Les Trésors de la zone")}</b>
              <small>{t("Cameroun, Congo, Gabon, Tchad, Guinée équatoriale, Centrafrique")}</small>
            </span>
            <span>
              <b>{t("La cote BVMAC")}</b>
              <small>{t("Les obligations et les actions des émetteurs cotés")}</small>
            </span>
            <span>
              <b>{t("Les fonds de la zone")}</b>
              <small>{t("Souscription et rachat, à la valeur liquidative et à sa date")}</small>
            </span>
          </div>
        </div>
      </section>

      {lignes.length > 0 && <BandeInstruments lignes={lignes} />}

      <section className={styles.verbes}>
        <div className={styles.verbesTete}>
          <h2>{t("Un compte. Tous les marchés de la zone.")}</h2>
          <p>{t("Le primaire, la cote, les fonds. Ce qui se présente vous arrive, et se traite sans quitter l'écran.")}</p>
        </div>
        <div className={styles.verbesListe}>
          {verbes.map((v) => (
            <div className={styles.verbe} key={v.titre}>
              <span className={styles.figure}>
                <svg viewBox="0 0 28 28" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={v.d} />
                </svg>
              </span>
              <div>
                <b>{v.titre}</b>
                <p>{v.dit}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* La seule surface pleine de la page. */}
      <section className={styles.analyses}>
        <div className={styles.analysesDire}>
          <span className={styles.etiquetteOr}>{t("Analyses et publications")}</span>
          <h2>{t("Le marché, lu et commenté.")}</h2>
          <p>{t("Le desk suit le marché de la zone et publie ce qu'il en tire : la courbe des taux, des analyses, des points réguliers. L'ensemble se consulte depuis votre espace.")}</p>
          <div>
            <Link className={styles.orBouton} href="/ouvrir-un-compte">
              {t("Ouvrir un compte-titres")}
            </Link>
          </div>
        </div>
        {trace && (
          <div className={styles.analysesFigure}>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("La forme de la courbe des taux de la zone, sans son échelle")}>
              <line x1={P.l} y1={P.t} x2={P.l} y2={H - P.b} stroke="var(--navy-2)" strokeWidth="1" />
              <line x1={P.l} y1={H - P.b} x2={W - P.r} y2={H - P.b} stroke="var(--navy-2)" strokeWidth="1" />
              <path d={trace.chemin} fill="none" stroke="var(--gold)" strokeWidth="2.4" strokeLinecap="round" />
              {trace.points.map((pt) => (
                <circle key={`${pt.x}-${pt.y}`} cx={pt.x} cy={pt.y} r="4.5" fill="var(--navy)" stroke="#ffffff" strokeWidth="2" />
              ))}
              {trace.reperes.map((r) => (
                <text key={r.mot} x={r.x} y={H - P.b + 24} textAnchor={r.fin ? "end" : "middle"} className={styles.repere}>
                  {t(r.mot)}
                </text>
              ))}
              <text x={P.l + 12} y={P.t + 14} className={styles.axeNom}>
                {t("TAUX")}
              </text>
              <text x={P.l + 12} y={P.t + 32} className={styles.axeNote}>
                {t("échelle après connexion")}
              </text>
            </svg>
          </div>
        )}
      </section>

      <section className={styles.coupDoeil}>
        <div className={styles.coupDire}>
          <span className={styles.etiquette}>{t("Un coup d'oeil dedans")}</span>
          <h2>{t("Votre écran s'ouvre sur ce qui vous attend.")}</h2>
          <div className={styles.coupListe}>
            <span>
              <b>{t("Votre console")}</b>
              <small>{t("Ce qui attend une décision aujourd'hui, en trois lignes au plus, avec le geste à côté.")}</small>
            </span>
            <span>
              <b>{t("Votre portefeuille")}</b>
              <small>{t("Chaque ligne, son échéancier, et ce qui est réellement arrivé sur le compte.")}</small>
            </span>
            <span>
              <b>{t("Le marché")}</b>
              <small>{t("La courbe, l'indice de la BVMAC, et les séances à venir, dès leur annonce.")}</small>
            </span>
          </div>
          <div>
            <Link className={styles.second} href="/info/parcours">
              {t("Visite guidée · 30 secondes")}
            </Link>
          </div>
        </div>
        <div className={styles.appareils}>
          <div className={styles.appareilFond} aria-hidden="true" />
          <div className={styles.appareil}>
            <div className={styles.appTop}>
              <span>
                <b>PURPOSE CAPITAL</b>
                <em>Guichet</em>
              </span>
              <i>G</i>
            </div>
            <div className={styles.appCorps}>
              <div className={styles.appTete}>
                <b>{t("Bonjour G.")}</b>
                <span>{t("Dossier complet")}</span>
              </div>
              <span className={styles.appEtiquette}>{t("Ce qui vous attend")}</span>
              <div className={styles.appAttente}>
                <span>{t("Sur votre compte")}</span>
                <b>
                  148 500 <em>FCFA</em>
                </b>
                <small>{t("Reçus et disponibles. Votre réinvestissement les placera au prochain passage.")}</small>
                <i>{t("Replacer")}</i>
              </div>
              <div className={styles.appSeance}>
                <span>{t("Une séance annoncée")}</span>
                <small>{t("Le Trésor a publié son avis d'annonce. Vous pouvez déclarer une intention jusqu'à la veille.")}</small>
              </div>
              <span className={styles.appEtiquette}>{t("Vos services")}</span>
              <div className={styles.appService}>
                <i className={styles.pastilleBon} />
                <b>{t("Conservation et tenue de compte")}</b>
                <em className={styles.motBon}>{t("en place")}</em>
              </div>
              <div className={styles.appService}>
                <i className={styles.pastilleOr} />
                <b>{t("Réinvestissement")}</b>
                <em className={styles.motOr}>{t("à activer")}</em>
              </div>
              <div className={styles.appService}>
                <i className={styles.pastilleOr} />
                <b>{t("Épargne programmée")}</b>
                <em className={styles.motOr}>{t("à activer")}</em>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Le moment typographique, une seule fois, sans chiffre. */}
      <section className={styles.moment}>
        <h2>{t("Une séance s'annonce. Vous décidez le jour même.")}</h2>
        <div>
          <p>{t("L'avis d'annonce vous parvient dès sa publication, et votre intention part de la même page.")}</p>
          <Link className={styles.principal} href="/ouvrir-un-compte">
            {t("Ouvrir un compte-titres")}
          </Link>
        </div>
      </section>

      <section className={styles.entrer}>
        <div className={styles.entrerTete}>
          <h2>{t("Ouvrir un compte")}</h2>
          <span>{t("En ligne, et le desk vous rappelle si un document manque.")}</span>
        </div>
        <div className={styles.etapes}>
          {etapes.map((e) => (
            <div className={styles.etape} key={e.titre}>
              <span className={styles.figure}>
                <svg viewBox="0 0 28 28" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={e.d} />
                </svg>
              </span>
              <b>{e.titre}</b>
              <p>{e.dit}</p>
            </div>
          ))}
        </div>
        <div className={styles.portes}>
          <div>
            <b>{t("Entrez par où vous voulez.")}</b>
            <span>{t("Par e-mail, par WhatsApp ou avec Google : c'est le même compte, et personne n'a de mot de passe à retenir.")}</span>
          </div>
          <div className={styles.portesListe}>
            <span>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              {t("E-mail")}
            </span>
            <span>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--good)" strokeWidth="1.6" aria-hidden="true">
                <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1L4 20z" />
              </svg>
              {t("WhatsApp")}
            </span>
            <span>
              <svg viewBox="0 0 48 48" width="15" height="15" aria-hidden="true">
                <path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-4H24v7.5h12c-.2 2-1.5 5-4.4 7l6.7 5.2C42.2 36.2 45 30.7 45 24z" />
                <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.9-12.5-9.2l-7.1 5.5C8.1 41 15.4 46 24 46z" />
                <path fill="#FBBC05" d="M11.5 28.3A13.4 13.4 0 0 1 10.8 24c0-1.5.3-3 .7-4.3l-7.1-5.6A22 22 0 0 0 2 24c0 3.6.9 6.9 2.4 9.9z" />
                <path fill="#EA4335" d="M24 10.3c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.1 29.9 2 24 2 15.4 2 8.1 7 4.4 14.1l7.1 5.6C13.3 14.2 18.2 10.3 24 10.3z" />
              </svg>
              {t("Google")}
            </span>
            <Link className={styles.principal} href="/ouvrir-un-compte">
              {t("Ouvrir un compte-titres")}
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

/**
 * La courbe réduite à sa forme.
 *
 * L'échelle verticale est normalisée sur ses propres bornes : la figure garde
 * la forme de la vraie courbe et ne laisse lire aucun taux. Les durées restent
 * nommées en abscisse, parce que c'est ce qui fait reconnaître une courbe des
 * taux, et il n'y a rien à en tirer sur les prix.
 */
function forme(fit: Ajustement, durees: number[]) {
  const min = durees[0];
  const max = durees[durees.length - 1];
  const etendue = Math.log(max) - Math.log(min) || 1;
  const x = (an: number) => P.l + ((Math.log(an) - Math.log(min)) / etendue) * (W - P.l - P.r);
  const pas = Array.from({ length: 61 }, (_, i) => min * Math.pow(max / min, i / 60));
  const ys = pas.map((an) => fit.taux(an));
  const lo = Math.min(...ys);
  const haut = Math.max(...ys);
  const y = (v: number) => H - P.b - ((v - lo) / (haut - lo || 1)) * (H - P.b - P.t - 12);
  return {
    chemin: pas.map((an, i) => `${i ? "L" : "M"}${x(an).toFixed(1)} ${y(ys[i]).toFixed(1)}`).join(" "),
    points: durees.map((an) => ({ x: Number(x(an).toFixed(1)), y: Number(y(fit.taux(an)).toFixed(1)) })),
    reperes: durees.map((an, i) => {
      const h = horizon(an);
      return { x: Number(x(an).toFixed(1)), mot: `${h.n} ${h.unit}`, fin: i === durees.length - 1 };
    }),
  };
}
