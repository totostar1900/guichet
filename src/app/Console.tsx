import Link from "next/link";
import { peutOPCVM, type Session } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { positionsFrom } from "@/lib/positions";
import { cashPosition } from "@/lib/domain/cash";
import { arretables } from "@/lib/domain/preavis";
import { Annonce } from "./Annonce";
import { diteAuClient } from "@/lib/domain/mesure";
import { direLAcces, direLeRetrait } from "@/lib/domain/acces-nomme";
import { direLePlafond } from "@/lib/domain/plafond-du-compte";
import { DemanderVersement } from "./DemanderVersement";
import { bilan, suivre, type LigneTenue } from "@/lib/domain/encaissement";
import { CeQuiVousAttend } from "@/components/CeQuiVousAttend";
import { CeQuiFermeBientot } from "@/components/CeQuiFermeBientot";
import { echeancesProches, presse } from "@/lib/domain/echeances";
import { SelectionDuDesk } from "@/components/SelectionDuDesk";
import { IndexPulse } from "@/components/IndexPulse";
import { aLaUne, pourquoiLu, publishedNews, titreLu } from "@/lib/news";
import { Rubriques } from "@/components/mobile/Rubriques";
import { INSTRUMENTS_PAGES } from "@/lib/nav-groups";
import { comptesParLieu, type ComptesParLieu } from "@/lib/domain/listes";
import { TrustNudge } from "@/components/TrustNudge";
import { Reinvest } from "@/components/Reinvest";
import { buildPerformanceParts } from "@/lib/performance-report";
import { courbeDuPortefeuille } from "@/lib/domain/courbe-portefeuille";
import { famillesDuPortefeuille, NOM_FAMILLE, type Famille } from "@/lib/domain/familles-actifs";
import { getLang, getT } from "@/i18n/server";
import { fmt, fmtDate, localIso } from "@/lib/format";
import styles from "./Console.module.css";

/**
 * LE SINGULIER ET LE PLURIEL DE CHAQUE FAMILLE, DANS SON UNITÉ À ELLE.
 *
 * Repris mot pour mot de « /instruments », fermée le 24 octobre 2026, avec sa
 * raison : « 2 ouvertes » convient à une séance, qui ouvre et se ferme ; une
 * ligne de la cote ne s'ouvre pas, et un fonds encore moins. Un mot juste
 * coûte un tableau de trois entrées, un mot faux coûte la confiance dans les
 * deux autres.
 */
const UNITE: Record<string, [string, string]> = {
  titres: ["1 ligne", "{n} lignes"],
  fonds: ["1 fonds", "{n} fonds"],
  calendrier: ["1 séance", "{n} séances"],
};

/**
 * Le portefeuille d'un client connecté : la racine de son espace.
 *
 * Il atterrissait sur la liste des titres. C'est le bon écran pour choisir un
 * instrument, et le mauvais pour revenir : après son premier achat, un client
 * ne vient pas parcourir, il vient voir ce qu'il a et décider. L'ordre de la
 * page est donc celui-là, et il est délibéré.
 *
 *   CE QUE ÇA VAUT, en un chiffre et trois faits. Une valeur sans le versé
 *   n'apprend rien : c'est l'écart entre les deux qui est le rendement.
 *
 *   CE QUI ATTEND UNE DÉCISION, avant les positions et jamais après. Au plus
 *   trois : une page qui en propose huit n'en propose aucune. Le compteur de
 *   la bande mène ici, à l'ancre « a-decider ».
 *
 *   CE QUI EST ENTRÉ ET CE QUI EST REVENU, en deux séries cumulées, et la
 *   valeur du jour en bout. La courbe de valorisation que portait la maquette
 *   n'est pas là, et c'est un refus : voir domain/courbe-portefeuille.ts.
 *
 *   PAR FAMILLE, puis LES LIGNES. Les services descendent à une bande : leurs
 *   gestes vivent sur l'objet qu'ils concernent, pas dans une grille de neuf
 *   tuiles qui concurrencerait le portefeuille.
 *
 *   PUIS VOTRE DOSSIER, EN BANDES, ET RIEN DE PLUS. Voir le sommaire plus
 *   bas : cette page répond, elle ne développe pas.
 *
 * ─── Ce qui est descendu d'ici, le 24 octobre 2026 ─────────────────────────
 *
 * ELLE PORTAIT LE RELEVÉ ENTIER, six sections dépliées, et disait trois fois
 * la même chose. Mesuré : 2 954 px, trois écrans et demi de téléphone. Le lien
 * de l'analyse y figurait deux fois, à 969 px d'écart ; les fiches des deux
 * lignes tenues, deux fois, à 815 et 870 px ; « Vos opérations », deux fois, à
 * 662 px ; et la date du 14 février trois fois, sous trois noms — « Prochaine
 * échéance », « Prochain flux », « prochain flux le ».
 *
 * TROIS COMPTEURS REDISAIENT LE RESTE DE LA PAGE, et l'un la contredisait.
 * « Positions valorisées · 7 M » était le SEUL chiffre de la page à compter la
 * ligne sans cours publié : 1 980 276 + 4 890 548, alors que la page écrit
 * quatre cents pixels plus haut « elle reste hors de ce total ». L'étiquette
 * disait l'inverse de ce que le chiffre faisait. Les trois sont partis.
 */
export async function Console({ session }: { session: Session }) {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const r = repo();
  const aujourdHui = localIso(new Date());

  const moi = await r.getContact(session.userId).catch(() => undefined);
  const mesureDite = diteAuClient(moi?.mesure);
  /* SUR QUEL COMPTE J AGIS, et à quel titre. Un représentant légal qui se
     connecte voit le portefeuille d une société : le lui dire en haut de
     page évite la seule erreur qui compte vraiment ici, croire qu on est
     chez soi. */
  const accesDit = direLAcces(session.agissant?.role, session.name);
  /* ET CE QUE LIT CELLE À QUI ON L A RETIRÉ : sans cette phrase, elle
     croit à une panne, et elle n a plus de compte où se plaindre. */
  const retraitDit = session.accesRetire ? direLeRetrait(session.accesRetire.cause, session.accesRetire.nomDuCompte, session.accesRetire.le) : undefined;
  /* LE PLAFOND SE DIT AVANT, PAS AU REFUS. Le découvrir en butant dessus au
     moment de signer est une panne muette : le client a déjà réuni le
     groupe et rempli son ordre. */
  const plafondDit = session.plafondParOrdre != null ? direLePlafond({ montant: session.plafondParOrdre, source: session.plafondSource ?? "compte" }, (n) => n.toLocaleString("fr-FR")) : undefined;
  const [intents, offers, cash, payouts, preavis, standing, temoignages] = await Promise.all([
    r.listIntents(),
    r.listOffers(),
    r.listCash(session.userId).catch(() => []),
    r.listPayouts({ userId: session.userId }).catch(() => []),
    r.listPreavis({ userId: session.userId }).catch(() => []),
    r.listStandingOrders(session.userId).catch(() => []),
    /* Ce que le client a déjà dit : sans cela, la bande du réinvestissement
       lui redemanderait ce qu'il vient de répondre. */
    r.listTemoignages({ userId: session.userId }).catch(() => []),
  ]);

  const mine = intents.filter((i) => i.clientId === session.userId);
  const positions = positionsFrom(mine, offers);
  const poche = cashPosition(cash, mine);
  /* La demande ouverte s'il y en a une, sinon la dernière réponse reçue : un
     refus motivé que le client ne verrait pas le laisserait attendre un
     virement sans savoir pourquoi. */
  const derniereDemande = payouts.find((p) => p.state === "demandee") ?? [...payouts].sort((x, y) => y.askedAt.localeCompare(x.askedAt))[0];
  const tenues: LigneTenue[] = positions.map((p) => ({ intentId: p.intent.id, titre: p.offer.title, echus: p.echus, aVenir: p.flows }));
  const b = bilan(suivre(tenues, cash));

  const { perf, mouvements } = buildPerformanceParts(mine, offers, cash);
  /* Lues une fois, pour la bande ET pour savoir où la poser : le seuil de
     sept jours décide de sa place, et il ne se calcule pas deux fois. */
  const echeances = echeancesProches(offers);
  /* Les trois familles, comptées par les fonctions mêmes que leurs pages
     emploient pour dresser leur liste : voir la section « Investir ». */
  const comptes = comptesParLieu(offers);
  /* La dépêche du jour, s'il y en a une : « loadNews » est en cache pour la
     requête, donc cette lecture ne coûte rien à qui la demande déjà. */
  const une = aLaUne(await publishedNews().catch(() => []));
  /* UNE FAMILLE SANS COMPTE NE PORTE PAS D'ÉTIQUETTE, ET NE CASSE RIEN. Le
     jour où une quatrième page entre dans la liste sans que « comptesParLieu »
     la connaisse, elle paraît sans chiffre plutôt qu'avec « undefined » ou
     avec celui de sa voisine. Zéro ne s'écrit pas non plus : une famille vide
     se visite quand même. */
  const etiquetteDe = (cle: string) => {
    const n = cle in comptes ? comptes[cle as keyof ComptesParLieu] : 0;
    const mots = UNITE[cle];
    return n > 0 && mots ? t(mots[n > 1 ? 1 : 0], { n: String(n) }) : undefined;
  };
  const courbe = courbeDuPortefeuille(mouvements, perf.valued, aujourdHui);
  const familles = famillesDuPortefeuille(perf.lines, new Map(offers.map((o) => [o.id, o])), poche.idle);

  const total = perf.valued + poche.idle;
  const gain = perf.valued + perf.returned - perf.invested;
  const prochaine = positions
    .map((p) => p.nextFlow)
    .filter(Boolean)
    .sort((a, b2) => a!.date.localeCompare(b2!.date))[0];

  const trace = dessin(courbe);
  const famille = (f: Famille) => t(NOM_FAMILLE[f]);
  const pct = (v: number) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  const signe = (v: number) => `${v > 0 ? "+" : ""}${pct(v)}`;

  return (
    <div className={styles.page}>

      <div className={styles.bonjour}>
        <h1>{t("Bonjour {p}", { p: session.name.split(" ")[0] })}</h1>
        {/* « valide » n'a jamais été un état de dossier : les huit valeurs vont
            de brouillon à clos. La comparaison était donc toujours fausse, et un
            client dont le compte est ouvert depuis des mois lisait « Dossier à
            compléter ». La règle du compte ouvert vit dans peutOPCVM, et
            l'état intermédiaire a maintenant ses propres mots. */}
        {/* UNE ÉTIQUETTE QUI DIT « À FAIRE » SE CLIQUE. Celle-ci annonçait
            « Convention à accepter » en gris depuis des semaines, sans lien :
            elle décrivait un devoir au lieu de l'ouvrir, et son lecteur a fini
            par demander où se trouvait la convention. Complet, l'état reste un
            constat et garde sa place de constat. */}
        {peutOPCVM(session) ? (
          <span className={styles.canaux}>{t("Dossier complet")}</span>
        ) : (
          <Link className={`${styles.canaux} ${styles.canauxManque}`} href="/ouvrir-un-compte">
            {session.kycStatus === "approuve" ? t("Convention à accepter") : t("Dossier à compléter")}
          </Link>
        )}
      </div>

      {/* CE QUI VA PARTIR, ET LE MOYEN DE DIRE NON.
          Le robot exécutait puis prévenait ; prévenir sans bouton d'arrêt
          n'aurait déplacé le problème que d'une case. Cette bande expire, d'où
          sa place : une information qui périme ne se range pas au milieu d'un
          relevé qu'on consulte à loisir. Vide, le composant ne rend rien. */}

      {/* CE QUI VA PARTIR, ET LE MOYEN DE DIRE NON.
          Le robot exécutait puis prévenait ; prévenir sans bouton d'arrêt
          n'aurait déplacé le problème que d'une case. Cette bande expire, d'où
          sa place : une information qui périme ne se range pas au milieu d'un
          relevé qu'on consulte à loisir. Vide, le composant ne rend rien. */}
      {/* UNE MESURE SE DIT AU CLIENT, ET D ABORD. Une restriction qu il
          découvre en butant dessus est une panne muette : il croit avoir mal
          cliqué. Le motif de conformité, lui, ne se dit jamais, et ce silence
          est la loi, pas une pudeur. */}
      {retraitDit && (
        <p className="panel" style={{ borderLeft: "2px solid var(--warn)", padding: "var(--s-5) var(--s-6)" }}>
          {retraitDit}
        </p>
      )}

      {accesDit && (
        <p className="panel" style={{ borderLeft: "2px solid var(--gold)", padding: "var(--s-5) var(--s-6)" }}>
          {accesDit}
        </p>
      )}

      {plafondDit && (
        <p className="panel" style={{ borderLeft: "2px solid var(--line)", padding: "var(--s-5) var(--s-6)", fontSize: ".88rem" }}>
          {plafondDit}
        </p>
      )}

      {mesureDite && (
        <p className="panel" style={{ borderLeft: "2px solid var(--crit)", padding: "var(--s-5) var(--s-6)" }}>
          {mesureDite}
        </p>
      )}

      <Annonce
        preavis={arretables(preavis, aujourdHui)}
        titres={Object.fromEntries(standing.map((x) => [x.id, offers.find((o) => o.id === x.offerId)?.title ?? x.ref]))}
      />

      {/* LES DEVOIRS, PUIS LES OCCASIONS, PUIS LE CONSTAT : C'EST L'ORDRE
          D'UN RETOUR. Un client qui revient après une semaine demande d'abord
          ce qu'on attend de lui, ensuite ce qui s'est ouvert pendant son
          absence ; sa valorisation, elle, l'attendra trois lignes de plus.

          LA BANDE REVIENT ICI, et c'est un revirement assumé. Le 5 octobre
          2026 elle avait quitté cette page pour Agir, au motif qu'un geste se
          range au siège du geste, et la note de l'époque prévoyait la suite :
          « si cela se paie en signatures en retard, la réponse n'est pas de
          remettre la bande ». Le prix a été pire qu'une signature en retard.
          La convention à accepter, qui ferme à elle seule toute souscription,
          ne figurait NI dans cette liste, ni dans la pastille du menu : elle
          se lisait en gris sous « Bonjour », et un dossier approuvé est resté
          en plan sans que personne, dans la maison, voie où cliquer. Un geste
          rangé au bon endroit reste invisible s'il faut déjà savoir qu'il
          existe pour aller le chercher. */}
      {/* LA LISTE ENTIÈRE, ET SEULEMENT ICI. Les deux sièges qui la portent
          s'en tiennent aux deux plus bloquantes et renvoient au reste : un
          sommaire n'a pas à porter la file d'attente complète, il a à ne rien
          cacher. Cette page-ci, où l'on atterrit, l'a pour sujet. */}
      <CeQuiVousAttend userId={session.userId} tout />
      {/* UNE CLÔTURE SOUS SEPT JOURS PASSE DEVANT LE RESTE, et c'est la seule
          chose qui déplace une section de cette page. La raison n'est pas
          l'esthétique : un virement interbancaire de la zone met deux à trois
          jours, et l'argent doit être arrivé avant le dépôt. En deçà du
          seuil, la séance n'est plus une annonce, c'est un délai. Au-delà,
          elle attend son tour plus bas — voir `domain/echeances`, qui tient
          le seuil pour les deux surfaces. */}
      {presse(echeances) && <CeQuiFermeBientot offres={offers} />}
      {/* CE QUI EST REVENU ET DORT : la seule décision entre l'achat et le
          remboursement, et elle remonte ici. Elle vivait au bas du relevé, à
          deux mille pixels du titre, pendant que cette page écrivait sa propre
          règle trois cents lignes plus haut : « ce qui attend une décision,
          avant les positions et jamais après ». */}
      <Reinvest positions={positions} entries={cash} temoignages={temoignages} now={new Date()} />
      <SelectionDuDesk />
      {/* Rien ne presse : la liste se lit après ce que le client possède. */}
      {!presse(echeances) && <CeQuiFermeBientot offres={offers} />}

      {/* 1. Ce que ça vaut, et ce que ça a rapporté. */}
      {positions.length > 0 ? (
        <section className={styles.valeur}>
          <div className={styles.grand}>
            <span className={styles.etiquette}>{t("Votre portefeuille")}</span>
            {/* Rien de valorisable et de l'argent versé : « 0 FCFA » serait
                exact et illisible, un client lirait une perte totale. Un chiffre
                absent se nomme au lieu d'être affiché à zéro. */}
            {total === 0 && perf.unvalued > 0 ? (
              <b className={styles.sansValeur}>{t("Pas encore de valorisation")}</b>
            ) : (
              <b>
                {fmt(Math.round(total))} <em>FCFA</em>
              </b>
            )}
            {perf.invested > 0 && (
              <span className={styles.gain}>
                <b className={gain >= 0 ? styles.bon : styles.moins}>
                  {gain >= 0 ? "+" : ""}
                  {fmt(Math.round(gain))}
                </b>
                <b className={gain >= 0 ? styles.bon : styles.moins}>{signe(Math.round((gain / perf.invested) * 1000) / 10)}</b>
                <small>{t("depuis l'origine, coupons reçus compris")}</small>
              </span>
            )}
          </div>
          {/* Une ligne sans cours publié ne se compte pas zéro : elle sort du
              total, et la page dit laquelle et combien on y a mis, plutôt que
              de laisser un chiffre inexpliqué à côté du tableau des lignes. */}
          {perf.unvalued > 0 && (
            <p className={styles.horsTotal}>
              {perf.unvalued === 1
                ? t("Une ligne est tenue sans cours publié : {m} FCFA y sont versés, et elle reste hors de ce total.", { m: fmt(Math.round(perf.unvaluedInvested)) })
                : t("{n} lignes sont tenues sans cours publié : {m} FCFA y sont versés, et elles restent hors de ce total.", { n: perf.unvalued, m: fmt(Math.round(perf.unvaluedInvested)) })}
            </p>
          )}
          <div className={styles.faits}>
            <span>
              <small>{t("Versé à ce jour")}</small>
              <b>{fmt(Math.round(perf.invested + perf.unvaluedInvested))}</b>
            </span>
            <span>
              <small>{t("Reçu à ce jour")}</small>
              <b>{fmt(Math.round(b.encaisse))}</b>
            </span>
            <span>
              <small>{t("Prochaine échéance")}</small>
              <b>{prochaine ? fmtDate(prochaine.date) : "—"}</b>
            </span>
            {/* LE CHIFFRE MÈNE À SA PAGE DEPUIS LE 9 OCTOBRE 2026. Il se lisait
                ici, dans Trader et sur le réinvestissement, et nulle part on ne
                pouvait l'alimenter, voir ce qu'un ordre signé en avait mis de
                côté, ni savoir en combien de temps il repart. Un solde qu'on
                voit sans pouvoir agir dessus est un chiffre, pas un service. */}
            <Link href="/moi/provision" className={poche.idle > 0 ? styles.dispo : undefined}>
              <small>{t("Disponible")}</small>
              <b>{fmt(Math.round(poche.idle))}</b>
            </Link>
          </div>
          {/* Ce solde appartient au client : il le lit ici, donc il le réclame ici. */}
          <DemanderVersement montant={poche.idle} demande={derniereDemande} />
        </section>
      ) : (
        <p className={styles.vide}>{t("Vous ne tenez encore aucune ligne. Les titres et les fonds ouverts se parcourent sans engagement.")}</p>
      )}

      {/* 3. Ce qui est entré, ce qui est revenu, et ce que ça vaut aujourd'hui. */}
      {trace && (
        <section>
          <div className={styles.tete}>
            <b>{t("Ce que vous avez versé, ce qui vous est revenu")}</b>
            <Link href="/moi/performance">{t("L'analyse de votre portefeuille")} →</Link>
          </div>
          <svg className={styles.courbe} viewBox="0 0 1000 300" role="img" aria-label={t("Les versements et les retours cumulés, mois par mois, et la valeur du jour")}>
            <line x1="52" y1="14" x2="52" y2="248" stroke="var(--line)" strokeWidth="1" />
            <line x1="52" y1="248" x2="986" y2="248" stroke="var(--line)" strokeWidth="1" />
            <path d={trace.verse} fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeDasharray="4 5" />
            <path d={trace.recu} fill="none" stroke="var(--good)" strokeWidth="2.4" strokeLinecap="round" />
            <line x1={trace.fin.x} y1={trace.fin.yVerse} x2={trace.fin.x} y2={trace.fin.yValeur} stroke="var(--gold-line)" strokeWidth="1" strokeDasharray="3 4" />
            <circle cx={trace.fin.x} cy={trace.fin.yValeur} r="5" fill="var(--paper)" stroke="var(--gold)" strokeWidth="2.6" />
            {trace.reperes.map((r2) => (
              <text key={r2.mois} x={r2.x} y={268} textAnchor={r2.fin ? "end" : r2.x < 60 ? "start" : "middle"} className={styles.repere}>
                {r2.mot}
              </text>
            ))}
          </svg>
          <div className={styles.legende}>
            <span>
              <i className={styles.tVerse} /> {t("Ce que vous avez versé")}
            </span>
            <span>
              <i className={styles.tRecu} /> {t("Ce qui vous est revenu")}
            </span>
            <span>
              <i className={styles.tValeur} /> {t("La valeur du jour")}
            </span>
            {/* On ne dessine pas ce qu'on ne sait pas : il n'y a pas d'historique
                de valorisation, donc pas de courbe de valeur dans le temps. */}
            <small>{t("La valeur d'une ligne n'est connue qu'au dernier cours publié : la page ne trace donc pas de valeur passée.")}</small>
          </div>
        </section>
      )}

      {/* 4. Par famille d'actif. */}
      {familles.length > 0 && (
        <section>
          <div className={styles.tete}>
            <b>{t("Par type d'actif")}</b>
            <span>{t("ce que vous détenez, par famille, à la dernière valeur connue")}</span>
          </div>
          <div className={styles.barre}>
            {familles.map((f) => (
              <i key={f.famille} className={styles[f.famille]} style={{ flexGrow: Math.max(f.part, 0.5) }} aria-hidden="true" />
            ))}
          </div>
          <div className={styles.familles}>
            {familles.map((f) => (
              <div key={f.famille}>
                <i className={styles[f.famille]} aria-hidden="true" />
                <b>{famille(f.famille)}</b>
                <span>{fmt(Math.round(f.valeur))}</span>
                <span className={styles.part}>{pct(f.part)}</span>
                <span className={f.rendu == null ? styles.part : f.rendu >= 0 ? styles.bon : styles.moins}>{f.rendu == null ? "—" : signe(f.rendu)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Les lignes. */}
      {positions.length > 0 && (
        <section>
          <div className={styles.tete}>
            <b>{t("Vos lignes")}</b>
          </div>
          <div className={styles.lignes}>
            {positions.map((p) => (
              <Link key={p.intent.id} href={`/offres/${p.offer.id}`}>
                <span className={styles.quoi}>
                  <b>{p.offer.title}</b>
                  <small>{p.offer.issuer || p.offer.countryName}</small>
                </span>
                <span className={styles.qte}>{fmt(Math.round(p.units))}</span>
                {/* Sans cours publié, un tiret : afficher le prix de revient à
                    la place d'une valeur ferait passer ce qu'on a payé pour ce
                    que ça vaut. */}
                <span className={styles.val}>{p.marketValue == null ? <em className={styles.sansCours}>—</em> : fmt(Math.round(p.marketValue))}</span>
                <span className={styles.flux}>{p.nextFlow ? fmtDate(p.nextFlow.date) : t("sans échéance")}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 6. OÙ PLACER : LES TROIS FAMILLES, ET CE QU'ELLES CONTIENNENT.
          Elles avaient une page à elles, « /instruments », fermée le
          24 octobre quand Trade les a absorbées. Cette page portait un compte
          par famille et le défendait : « Adjudications » ne dit pas s'il y a
          une séance ouverte cette semaine, « Adjudications · 3 séances » le
          dit, et épargne le détour. Le compte est mort avec elle ; il revient
          ici, où le client décide.

          ET LA PAGE DIT L'INVERSE TROIS CENTS LIGNES PLUS BAS : « aucune [des
          rubriques du dossier] ne porte de compte, un nombre posé sur la page
          d'avant se calcule toujours ailleurs que là où il sera vérifié. »
          Les deux règles tiennent, et ce qui les sépare est l'origine du
          nombre. Les rubriques du dossier mènent à des pages qui recomptent
          CE QUE LE CLIENT A, chacune à sa façon. Ces trois-ci comptent le
          CATALOGUE, par « comptesParLieu », c'est-à-dire par les mêmes trois
          fonctions que leurs pages d'arrivée emploient pour dresser leur
          liste. Un seul calcul, deux surfaces : il ne peut pas diverger.

          ZÉRO NE S'ÉCRIT PAS, et c'est la règle de l'ancienne page qu'on
          garde : une famille vide se visite quand même, et annoncer son vide
          l'éteindrait.

          PAS D'APERÇU DES LIGNES, en revanche. La maquette en donnait deux
          par famille ; pour les adjudications, ces deux lignes sont
          exactement celles que « Ce qui ferme bientôt » vient de poser plus
          haut sur cette même page. */}
      <div className={styles.dossier}>
        <span className="eyebrow">{t("Investir")}</span>
        <Rubriques
          items={INSTRUMENTS_PAGES.map((p) => ({
            href: p.href,
            nom: t(p.label),
            quoi: t(p.hint),
            etiquette: etiquetteDe(p.key),
          }))}
        />
      </div>

      {/* 7. LE MARCHÉ, EN UN CHIFFRE ET SA DATE.
          L'indice est la seule mesure de la place qui oriente sans qu'on
          sache déjà ce qu'on cherche : un niveau, la séance qui l'a produit,
          et les fenêtres où le mouvement existe. « IndexPulse » le rend
          depuis mars, sur deux pages où l'on arrive en sachant déjà qu'on
          vient lire le marché ; il manquait là où l'on arrive sans le savoir.

          IL SAIT SE TAIRE : sans bulletin portant l'indice, il rend null, et
          la section disparaît avec lui.

          UN SEUL LIEN, ET NON UNE RANGÉE DE PASTILLES. La maquette en posait
          trois — les sociétés, les notes, les actualités. « /marche » EST la
          porte de cette famille, son propre fichier le dit, et le bandeau du
          téléphone donne déjà la famille entière dès qu'on y est. Trois
          pastilles ici seraient une seconde porte à soixante pixels de la
          première.

          CE QUI N'Y EST PAS, ET POURQUOI. La maquette portait un second
          volet, l'activité de la dernière séance — lignes servies,
          transactions, montant échangé. Il se calcule par « indexPageData »,
          qui lit deux mille bulletins, les derniers cours, les sociétés, puis
          deux mille cotations PAR LIGNE cotée : une dizaine de requêtes, sur
          la page la plus visitée de la maison. L'indice en coûte une. */}
      <section>
        <div className={styles.tete}>
          <b>{t("Le marché")}</b>
          <Link href="/marche">{t("La place")} →</Link>
        </div>
        <IndexPulse compact />
      </section>

      {/* 8. À LA UNE : UN ARTICLE, ET CE QU'IL CHANGE.
          Le même que la page des actualités met en tête, par « aLaUne » : ce
          titre désignait deux articles différents selon la page, et la maison
          n'en a qu'un.

          LE « POURQUOI ÇA COMPTE » VIENT AVEC. C'est la seule chose que la
          maison ajoute à un lien de presse — deux lignes, sans
          recommandation, écrites par le desk. Un titre seul renverrait le
          lecteur sur un communiqué qu'il devra interpréter lui-même ; c'est
          ce travail-là qui justifie que la dépêche paraisse ici.

          ELLE S'EFFACE QUAND IL N'Y A RIEN : cinq dépêches reçues et relues,
          non publiées, ne sont pas une actualité, et une rubrique vide en
          tête de page apprend à ne plus l'ouvrir. */}
      {une && (
        <section>
          <div className={styles.tete}>
            <b>{t("À la une")}</b>
            <Link href="/actualites">{t("Toutes les actualités")} →</Link>
          </div>
          <Link href="/actualites" className={styles.une}>
            <small>
              {une.source} · {fmtDate(une.publishedAt.slice(0, 10), false)}
            </small>
            <b>{titreLu(une, lang, t)}</b>
            <span>
              <b>{t("Pourquoi ça compte.")}</b> {pourquoiLu(une, lang, t)}
            </span>
          </Link>
        </section>
      )}

      {/* 9. S'INSCRIRE SANS ATTENDRE UN CODE. Une proposition qui se referme
          d'une croix, et ne revient pas. */}
      <TrustNudge />

      {/* 10. VOTRE DOSSIER : UN SOMMAIRE, ET PLUS SIX SECTIONS DÉPLIÉES.
          Le relevé était le bas de cette page, et il y développait ce qui a
          désormais une adresse : les intentions, les versements programmés et
          leurs instructions — avec leur formulaire de modification —, les
          droits de garde, les lignes suivies. Mesuré le 24 octobre 2026, cela
          faisait 2 954 px, trois écrans et demi de téléphone, où la même
          chose se lisait deux fois : le lien de l'analyse à 969 px de
          lui-même, deux fiches de ligne à 815 et 870 px des leurs, « Vos
          opérations » à 662 px de sa tuile, et la date du 14 février sous
          trois noms différents.

          LA RÈGLE QUI EN SORT : une page d'accueil RÉPOND, elle ne développe
          pas. Ce qui vous attend, ce que ça vaut, puis où aller — et chaque
          « où » est une bande, de la même forme que les six autres sommaires
          de la maison. Aucune ne porte de compte : un nombre posé sur la page
          d'avant se calcule toujours ailleurs que là où il sera vérifié. */}
      <div className={styles.dossier}>
        <span className="eyebrow">{t("Votre dossier")}</span>
        <Rubriques
          items={[
            { href: "/moi/ordres", nom: t("Vos intentions"), quoi: t("Où en est chaque ordre, et ce qu'il attend de vous") },
            { href: "/moi/epargne", nom: t("Vos versements programmés"), quoi: t("Ce qui part chaque mois, et comment le changer") },
            { href: "/moi/garde", nom: t("Vos droits de garde"), quoi: t("Ce que la conservation a coûté, avis par avis") },
            { href: "/moi/suivies", nom: t("Lignes suivies"), quoi: t("Ce que vous surveillez sans le détenir") },
            { href: "/moi/performance#operations", nom: t("Vos opérations et l'échéancier"), quoi: t("Ce que votre argent a fait, et ce qui vient") },
            { href: "/moi/documents", nom: t("Mes documents"), quoi: t("Relevés, avis d'opéré et bulletins") },
            { href: "/trader", nom: t("Vos services"), quoi: t("Ce que Guichet peut faire pour vous") },
          ]}
        />
      </div>

    </div>
  );
}

/** Les deux séries cumulées, mises à l'échelle de la plus haute des trois valeurs. */
function dessin(c: ReturnType<typeof courbeDuPortefeuille>) {
  if (c.points.length < 2) return undefined;
  const W = 1000;
  const P = { l: 52, r: 14, t: 14, b: 52 };
  const haut = Math.max(...c.points.map((p) => Math.max(p.verse, p.recu)), c.valeur, 1);
  const x = (i: number) => P.l + (i / (c.points.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => 248 - (v / haut) * (248 - P.t);
  const chemin = (clef: "verse" | "recu") => c.points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p[clef]).toFixed(1)}`).join(" ");

  const dernier = c.points.length - 1;
  const reperes = c.points
    .map((p, i) => ({ ...p, i }))
    .filter((p, i) => i === 0 || i === dernier || (c.points.length > 6 ? p.mois.endsWith("-01-01") : true))
    .map((p) => ({ mois: p.mois, x: Number(x(p.i).toFixed(1)), mot: fmtDate(p.mois, false), fin: p.i === dernier }));

  return {
    verse: chemin("verse"),
    recu: chemin("recu"),
    fin: { x: Number(x(dernier).toFixed(1)), yVerse: Number(y(c.points[dernier].verse).toFixed(1)), yValeur: Number(y(c.valeur).toFixed(1)) },
    reperes,
  };
}
