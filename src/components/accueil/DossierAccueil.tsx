import Link from "next/link";
import { getT } from "@/i18n/server";
import { PastilleEtat } from "@/components/PastilleEtat";
import { sousLigne } from "@/lib/domain/ligne-titre";
import { gabaritDIntention, gabaritDeSondage, limitesDeSondage, periodeDeFonds } from "@/lib/domain/gabarit";
import { chiffresDeLIntention, gestesProposables, rubriquesPresentes, seancesOuvertes, seancesPrevues, TON_DE_LETAT, type CleDeRubrique, type FaitsDuDossier, type GesteProposable } from "@/lib/domain/accueil";
import { echeancesProches, joursEnMots } from "@/lib/domain/echeances";
import type { AvisGarde } from "@/lib/domain/garde";
import { attendUneSignature, INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { displayStatus } from "@/lib/domain/status";
import type { StandingOrder } from "@/lib/domain/standing";
import { summarize } from "@/lib/domain/summary";
import type { Intent, LigneSondee, Offer, Watch } from "@/lib/domain/types";
import { fmt, fmtDate, fmtPct, fmtPrice } from "@/lib/format";
import { BlocPlat } from "./BlocPlat";
import styles from "./DossierAccueil.module.css";

function Fleche() {
  return (
    <svg className={styles.chev} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/* Toute la rangée est un lien vers sa page. Défini hors du rendu — un composant créé pendant le rendu repartirait de zéro à chaque passage. */
function Rang({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={styles.rang}>
      {children}
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
      /* LE RENDEMENT EN HAUT, LA PÉRIODE SUR SA LIGNE, ET PLUS DE DOUBLON (2 novembre 2026). Le chiffre de tête et sa note disaient deux fois « +7,4 % sur 12 mois ». Le chiffre est seul ; la période s'écrit avec ses deux dates (« du 18 sept. 2025 au 18 sept. 2026 ») pour un fonds, et avec sa condition (« si servi à 97 % ») pour le reste ; ce qui presse (une clôture) est une pastille. */
      const periodeFonds = o.kind === "FONDS" && o.fund ? periodeDeFonds(o.fund) : undefined;
      return {
        href: `/offres/${o.id}`,
        nom: t(o.title),
        sous: sousLigne(o, t(s.subtitle)),
        valeur: s.hero,
        periode: periodeFonds ? `${periodeFonds.a} – ${periodeFonds.b}` : s.heroUnit ? t(s.heroUnit) : undefined,
        urgence: q ? t("ferme {q}", { q: t(q.key, q.params) }) : undefined,
        statut: !q && displayStatus(o, now) !== "quoted" ? t(s.status) : undefined,
        presse: Boolean(e && e.urgence !== "calme"),
        jours: e?.jours ?? 9999,
      };
    })
    .sort((a, b) => a.jours - b.jours)
    .slice(0, 3);

  const intentions = mine.slice(0, 3).map((i) => {
    const c = chiffresDeLIntention(i, offre(i.offerId)?.kind ?? "");
    const o = offre(i.offerId);
    /* LE GABARIT DE LA MAISON (2 novembre 2026) : « OTA 4 ans • CMR » en tête ; dessous, le type, le montant (en or), le coupon et la limite du client (en bleu). */
    const limite = i.limitPrice != null && o?.instrument === "obligation" ? `${fmtPrice(i.limitPrice)} ${i.type === "vente" ? t("min") : t("max")}` : undefined;
    return {
      href: `/offres/${i.offerId}`,
      nom: (o && gabaritDIntention(o)) ?? t(titreDe(i.offerId)),
      type: t(INTENT_LABEL[i.type]),
      montant: c.montant ? { texte: fmt(c.montant.valeur), unite: c.montant.unite } : undefined,
      coupon: o?.kind === "OTA" && o.couponRate ? fmtPct(o.couponRate, 2) : undefined,
      limite,
      etat: t(INTENT_STATE_LABEL[i.state]),
      ton: TON_DE_LETAT[i.state],
      servi: c.serviPct != null ? t("servi à {n} %", { n: String(c.serviPct) }) : undefined,
    };
  });
  type Ligne = { id: string; texte: string; limites: ReturnType<typeof limitesDeSondage>; montant: string; etat: string; ton: "bon" | "attention" | "neutre" };
  const auSondage: Ligne[] = vivantes.slice(0, 3).map((x) => ({
    id: x.id,
    texte: gabaritDeSondage(x),
    limites: limitesDeSondage(x),
    montant: fmt(x.montant),
    etat: t(x.state === "consolidee" ? "portée au Trésor" : "ouverte"),
    ton: x.state === "consolidee" ? "neutre" : "bon",
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
    profil: { href: "/moi/profil", nom: t("Compléter mon profil d'investisseur"), dit: "" },
    suivre: { href: "/titres", nom: t("Suivre une ligne"), dit: t("Une alerte à la clôture ou au prix") },
    sondage: { href: "/sondage", nom: t("Proposer une adjudication"), dit: t("Dites ce que vous prendriez avant qu'une séance ouvre") },
    simulateur: { href: "/info/simulateur", nom: t("Essayer le simulateur"), dit: t("Calculer un rendement avant d'ordonner") },
    comparer: { href: "/comparer", nom: t("Comparer deux lignes"), dit: t("Côte à côte, avec l'indice en repère") },
  };
  const gestes = gestesProposables({ ...faits, conventionOk, dossierAPoursuivre, profilRenseigne, appareilAjoute, couponsSansReinvestissement, sansAdjudication: seancesOuvertes(offers, now).length === 0 && seancesPrevues(offers, now, 1).length === 0 }).map((g) => GESTES[g]);

  const rien = !presentes.size && !suivies.length;
  if (rien && !gestes.length) return null;

  return (
    <section className="pile" aria-label={t("Mon dossier")}>
      {presentes.has("intentions") && (
        <BlocPlat id="dossier-intentions" titre="Mes intentions" href="/moi/ordres" etiquette={aSigner ? <PastilleEtat ton="attention">{t("à signer")}</PastilleEtat> : undefined}>
          {intentions.map((l, k) => (
            <Rang key={k} href={l.href}>
              <span className={styles.qui}>
                <b>{l.nom}</b>
                <small>
                  {l.type}
                  {l.montant && (
                    <>
                      {" • "}
                      <span className={styles.groupe}>
                        <span className={styles.or}>{l.montant.texte}</span> {l.montant.unite}
                      </span>
                    </>
                  )}
                  {l.coupon && (
                    <>
                      {" • "}
                      <span className={styles.groupe}>
                        {t("coupon")} <span className={styles.bleu}>{l.coupon}</span>
                      </span>
                    </>
                  )}
                  {l.limite && (
                    <>
                      {" • "}
                      <span className={`${styles.bleu} ${styles.groupe}`}>{l.limite}</span>
                    </>
                  )}
                </small>
              </span>
              <span className={styles.quoi}>
                <PastilleEtat ton={l.ton}>{l.etat}</PastilleEtat>
                {l.servi && <small>{l.servi}</small>}
              </span>
            </Rang>
          ))}
        </BlocPlat>
      )}
      {presentes.has("sondage") && (
        <BlocPlat id="dossier-sondage" titre="Mes intentions au sondage" href="/sondage">
          {auSondage.map((l, k) => (
            <Rang key={k} href={`/sondage?ligne=${l.id}`}>
              <span className={styles.qui}>
                <b>{l.texte}</b>
                {(l.limites.niveau || l.limites.prix) && (
                  <small>
                    {l.limites.niveau && (
                      <span className={`${styles.bleu} ${styles.groupe}`}>
                        {t(l.limites.niveau.mot)} {t("min")} {l.limites.niveau.valeur}
                      </span>
                    )}
                    {l.limites.niveau && l.limites.prix && " • "}
                    {l.limites.prix && (
                      <span className={`${styles.bleu} ${styles.groupe}`}>
                        {t("prix")} {t("min")} {l.limites.prix.valeur}
                        {l.limites.rendement && <span className={styles.gris}> (≈ {l.limites.rendement.valeur})</span>}
                      </span>
                    )}
                  </small>
                )}
              </span>
              <span className={styles.montant}>
                <b>
                  {l.montant}
                  <i className={styles.unite}>FCFA</i>
                </b>
                <PastilleEtat ton={l.ton}>{l.etat}</PastilleEtat>
              </span>
            </Rang>
          ))}
        </BlocPlat>
      )}
      {presentes.has("suivies") && suivies.length > 0 && (
        <BlocPlat id="dossier-suivies" titre="Mes lignes suivies" href="/moi/suivies">
          {suivies.map((l, k) => (
            <Rang key={k} href={l.href}>
              <span className={styles.qui}>
                <b>{l.nom}</b>
                <small>{l.sous}</small>
              </span>
              <span className={`${styles.quoi} ${styles.quoiLarge}`}>
                <b className={styles.or}>{l.valeur}</b>
                {l.periode && <small className={styles.periode}>{l.periode}</small>}
                {l.urgence && <PastilleEtat ton={l.presse ? "attention" : "neutre"}>{l.urgence}</PastilleEtat>}
                {l.statut && <small>{l.statut}</small>}
              </span>
            </Rang>
          ))}
        </BlocPlat>
      )}
      {compactes.length > 0 && (
        <BlocPlat id="dossier-espace" titre="Mon espace">
          {compactes.map((c) => (
            <Rang key={c.cle} href={c.href}>
              <span className={styles.qui}>
                <b>{c.nom}</b>
                {c.resume && <small>{c.resume}</small>}
              </span>
              {c.etiquette && <PastilleEtat ton="attention">{c.etiquette}</PastilleEtat>}
              <Fleche />
            </Rang>
          ))}
        </BlocPlat>
      )}
      {gestes.length > 0 && (
        <BlocPlat id="dossier-aussi" titre="Vous pouvez aussi">
          {gestes.map((g) => (
            <Rang key={g.href} href={g.href}>
              <span className={styles.qui}>
                <b>{g.nom}</b>
                {g.dit && <small>{g.dit}</small>}
              </span>
              <svg className={styles.plus} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Rang>
          ))}
        </BlocPlat>
      )}
    </section>
  );
}
