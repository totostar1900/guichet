import Link from "next/link";
import { getT } from "@/i18n/server";
import { chiffresDeLIntention, gestesProposables, rubriquesPresentes, type CleDeRubrique, type FaitsDuDossier, type GesteProposable } from "@/lib/domain/accueil";
import { echeancesProches, joursEnMots } from "@/lib/domain/echeances";
import type { AvisGarde } from "@/lib/domain/garde";
import { attendUneSignature, INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { displayStatus } from "@/lib/domain/status";
import type { StandingOrder } from "@/lib/domain/standing";
import { summarize } from "@/lib/domain/summary";
import type { Intent, LigneSondee, Offer, Watch } from "@/lib/domain/types";
import { fmt, fmtDate } from "@/lib/format";
import styles from "./DossierAccueil.module.css";

function Fleche() {
  return (
    <svg className={styles.chev} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/* Une rubrique en pleine largeur : toute la tuile est le lien, et son pied le dit. Défini hors du rendu — un composant créé pendant le rendu repartirait de zéro à chaque passage. */
function Pleine({ href, nom, etiquette, sous, children, lien }: { href: string; nom: string; etiquette?: string; sous?: string; children: React.ReactNode; lien: string }) {
  return (
    <Link href={href} className={styles.pleine}>
      <span className={styles.entete}>
        <b>{nom}</b>
        {etiquette && <span className={styles.etiquette}>{etiquette}</span>}
        <Fleche />
      </span>
      {sous && <small className={styles.sous}>{sous}</small>}
      {children}
      <span className={styles.lien}>{lien} →</span>
    </Link>
  );
}

/**
 * « MON DOSSIER » : CE QUI A DE L'INFORMATION LA MONTRE, OUVERT ; CE QUI N'EN A PAS DEVIENT UN GESTE.
 *
 * Une version a mis les rubriques en tuiles qui se dépliaient. Le client devait
 * toucher pour lire ce qu'il avait lui-même choisi de suivre — ses intentions,
 * son sondage, ses lignes —, c'est-à-dire l'information qu'il vient chercher.
 * Décidé le 1er novembre 2026 : **trois rubriques en pleine largeur, ouvertes
 * d'office, quand elles ont du contenu** ; les autres en petites tuiles qui
 * montrent leur seule ligne et mènent à leur page, sans se déplier ; celles qui
 * n'ont rien à dire n'existent pas — et leur geste passe dans « Vous pouvez
 * aussi », qui reste ouvert.
 *
 * CHACUNE DIT SON DERNIER FAIT, jamais un compte dans son nom (arbitrage du
 * 29 octobre 2026). Les lignes suivies sont les plus fournies : le chiffre qui
 * compte par ligne, ce qui presse (une clôture proche), et — pour un fonds — sa
 * performance sur douze mois. Les variations des autres lignes demandent des
 * séries que la page ne lit pas : elles n'y sont pas.
 *
 * LES LECTURES SONT CELLES DE LA PAGE, plus celles qu'elle ajoute pour ce
 * bloc, bornées au client et parties avec les autres : avis de garde, veilles,
 * lignes du sondage, profil, appareils.
 */
export async function DossierAccueil({
  mine,
  offers,
  standing,
  avis,
  veilles,
  sondees,
  mandats,
  mandatASigner,
  prochaine,
  operations,
  conventionOk,
  dossierAPoursuivre,
  profilRenseigne,
  appareilAjoute,
  couponsSansReinvestissement,
}: {
  mine: Intent[];
  offers: Offer[];
  standing: StandingOrder[];
  avis: AvisGarde[];
  veilles: Watch[];
  sondees: LigneSondee[];
  mandats: number;
  mandatASigner: boolean;
  /** Le prochain flux d'argent, s'il y en a un. */
  prochaine?: { date: string; titre: string };
  operations: number;
  conventionOk: boolean;
  dossierAPoursuivre: boolean;
  profilRenseigne: boolean;
  appareilAjoute: boolean;
  couponsSansReinvestissement: boolean;
}) {
  const t = await getT();
  const now = new Date();
  const offre = (id: string) => offers.find((o) => o.id === id);
  const titreDe = (id: string) => offre(id)?.title ?? id;
  const actives = standing.filter((x) => x.state === "active");
  const vivantes = sondees.filter((x) => x.state !== "close");
  const faits: FaitsDuDossier = {
    intentions: mine.length,
    attentesSondees: vivantes.length,
    mandats,
    versements: actives.length,
    avisDeGarde: avis.length,
    lignesSuivies: veilles.length,
    operations,
    /* Tout papier naît d'une intention ou d'un mouvement : sans l'un ni l'autre, « Mes documents » n'a rien à ouvrir. */
    documents: mine.length + operations,
  };
  const presentes = new Set<CleDeRubrique>(rubriquesPresentes(faits));
  const aSigner = mine.filter(attendUneSignature).length;

  /* LES LIGNES SUIVIES : ce qui presse d'abord (la clôture la plus proche), puis dans l'ordre où le client les a posées. */
  const pressantes = new Map(echeancesProches(offers, now).map((e) => [e.offerId, e]));
  const suivies = veilles
    .map((w) => offre(w.offerId))
    .filter((o): o is Offer => Boolean(o))
    .map((o) => {
      const s = summarize(o, now);
      const e = pressantes.get(o.id);
      const q = e ? joursEnMots(e.jours) : undefined;
      const perf = o.kind === "FONDS" && o.fund?.perf1yPct != null ? `${o.fund.perf1yPct > 0 ? "+" : ""}${o.fund.perf1yPct.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} % ${t("sur 12 mois")}` : undefined;
      return {
        nom: t(o.title),
        sous: t(s.subtitle),
        valeur: `${s.hero}${s.heroUnit ? ` ${t(s.heroUnit)}` : ""}`,
        note: q ? t("ferme {q}", { q: t(q.key, q.params) }) : (perf ?? (displayStatus(o, now) === "quoted" ? "" : t(s.status))),
        presse: Boolean(e && e.urgence !== "calme"),
        jours: e?.jours ?? 9999,
      };
    })
    .sort((a, b) => a.jours - b.jours)
    .slice(0, 3);

  type Ligne = { texte: string; note?: string };
  /* LES CHIFFRES DE « MES INTENTIONS » : le type d'ordre et le montant à gauche, l'état et la part servie à droite. Voir « chiffresDeLIntention ». */
  const intentions = mine.slice(0, 3).map((i) => {
    const c = chiffresDeLIntention(i, offre(i.offerId)?.kind ?? "");
    return {
      nom: t(titreDe(i.offerId)),
      detail: [t(INTENT_LABEL[i.type]), c.montant ? `${fmt(c.montant.valeur)} ${c.montant.unite}` : ""].filter(Boolean).join(" · "),
      etat: t(INTENT_STATE_LABEL[i.state]),
      servi: c.serviPct != null ? t("servi à {n} %", { n: String(c.serviPct) }) : undefined,
    };
  });
  const auSondage: Ligne[] = vivantes.slice(0, 2).map((x) => ({
    texte: `${x.instrument} ${x.tenor} · ${t(x.country)}`,
    note: `${fmt(x.montant)} FCFA · ${t(x.state === "consolidee" ? "portée au Trésor" : "ouverte")}`,
  }));

  type Compacte = { cle: CleDeRubrique; href: string; nom: string; resume: string; etiquette?: string };
  const toutesCompactes: Compacte[] = [
    { cle: "versements", href: "/moi/epargne", nom: t("Mes versements programmés"), resume: actives[0] ? t("Le {j} de chaque mois · {m} FCFA", { j: String(actives[0].dayOfMonth), m: fmt(actives[0].amount) }) : "" },
    { cle: "prelevements", href: "/moi/prelevements", nom: t("Mes prélèvements"), resume: t("Le mandat qui vous débite, et ce qu'il a payé"), etiquette: mandatASigner ? t("à signer") : undefined },
    { cle: "operations", href: "/moi/performance#operations", nom: t("Mes opérations et l'échéancier"), resume: prochaine ? t("Prochain flux le {d}", { d: fmtDate(prochaine.date, false) }) : t("Ce que votre argent a fait, et ce qui vient") },
    { cle: "garde", href: "/moi/garde", nom: t("Mes droits de garde"), resume: avis[0] ? t("Dernier avis : {p}", { p: avis[0].period }) : "" },
    { cle: "documents", href: "/moi/documents", nom: t("Mes documents"), resume: t("Relevés, avis d'opéré et bulletins") },
  ];
  const compactes = toutesCompactes.filter((c) => presentes.has(c.cle));

  const GESTES: Record<GesteProposable, { href: string; nom: string; dit: string }> = {
    dossier: { href: "/ouvrir-un-compte", nom: t("Compléter mon dossier"), dit: t("Dix minutes pour pouvoir verser et placer") },
    intention: { href: "/trader", nom: t("Déclarer une intention sur une ligne"), dit: t("Dites ce que vous prendriez, le desk revient vers vous") },
    versement: { href: "/moi/epargne", nom: t("Programmer un versement"), dit: t("Une somme chaque mois, sans y penser") },
    reinvestir: { href: "/moi/reinvestir", nom: t("Réinvestir mes coupons"), dit: t("Ne laissez pas dormir ce qui vous revient") },
    appareil: { href: "/moi/securite", nom: t("Ajouter ce téléphone"), dit: t("Ouvrir d'un doigt la prochaine fois") },
    profil: { href: "/moi/profil", nom: t("Compléter mon profil d'investisseur"), dit: t("Dix-sept questions, quelques minutes") },
    suivre: { href: "/titres", nom: t("Suivre une ligne"), dit: t("Une alerte à la clôture ou au prix") },
    sondage: { href: "/sondage", nom: t("Proposer une adjudication"), dit: t("Dites ce que vous prendriez avant qu'une séance ouvre") },
    simulateur: { href: "/info/simulateur", nom: t("Essayer le simulateur"), dit: t("Calculer un rendement avant d'ordonner") },
    comparer: { href: "/comparer", nom: t("Comparer deux lignes"), dit: t("Côte à côte, avec l'indice en repère") },
  };
  const gestes = gestesProposables({ ...faits, conventionOk, dossierAPoursuivre, profilRenseigne, appareilAjoute, couponsSansReinvestissement }).map((g) => GESTES[g]);

  const rien = !presentes.size && !suivies.length;
  if (rien && !gestes.length) return null;

  return (
    <section className={styles.bloc} aria-label={t("Mon dossier")}>
      <div className="pile-tuiles">
        {presentes.has("intentions") && (
          <Pleine href="/moi/ordres" nom={t("Mes intentions")} etiquette={aSigner ? t("à signer") : undefined} lien={t("Mes intentions")}>
            {intentions.map((l, k) => (
              <span key={k} className={styles.suivie}>
                <span className={styles.qui}>
                  <b>{l.nom}</b>
                  <small>{l.detail}</small>
                </span>
                <span className={styles.quoi}>
                  <b>{l.etat}</b>
                  {l.servi && <small>{l.servi}</small>}
                </span>
              </span>
            ))}
          </Pleine>
        )}
        {presentes.has("sondage") && (
          <Pleine href="/sondage" nom={t("Mes intentions au sondage")} sous={t("Ce que vous prendriez, avant qu'une séance ouvre")} lien={t("Mes intentions au sondage")}>
            {auSondage.map((l, k) => (
              <span key={k} className={styles.ligne}>
                <b>{l.texte}</b>
                <small>{l.note}</small>
              </span>
            ))}
          </Pleine>
        )}
        {presentes.has("suivies") && suivies.length > 0 && (
          <Pleine href="/moi/suivies" nom={t("Mes lignes suivies")} lien={t("Toutes mes lignes suivies")}>
            {suivies.map((l, k) => (
              <span key={k} className={styles.suivie}>
                <span className={styles.qui}>
                  <b>{l.nom}</b>
                  <small>{l.sous}</small>
                </span>
                <span className={styles.quoi}>
                  <b>{l.valeur}</b>
                  {l.note && <small className={l.presse ? styles.presse : undefined}>{l.note}</small>}
                </span>
              </span>
            ))}
          </Pleine>
        )}
        {compactes.length > 0 && (
          <div className={styles.grille}>
            {compactes.map((c) => (
              <Link key={c.cle} href={c.href} className={styles.compacte}>
                <span className={styles.entete}>
                  <b>{c.nom}</b>
                  {c.etiquette && <span className={styles.etiquette}>{c.etiquette}</span>}
                  <Fleche />
                </span>
                {c.resume && <small className={styles.sous}>{c.resume}</small>}
              </Link>
            ))}
          </div>
        )}
        {gestes.length > 0 && (
          <div className={styles.aussi}>
            <b>{t("Vous pouvez aussi")}</b>
            <ul>
              {gestes.map((g) => (
                <li key={g.href}>
                  <Link href={g.href}>
                    <span>
                      <span className={styles.geste}>{g.nom}</span>
                      <small>{g.dit}</small>
                    </span>
                    <svg className={styles.plus} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
