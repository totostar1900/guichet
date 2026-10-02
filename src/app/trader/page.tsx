import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { loadBeacAuctions } from "@/lib/market/beac-feed";
import type { BeacAuction } from "@/lib/market/beac";
import { positionsFrom } from "@/lib/positions";
import { cashPosition } from "@/lib/domain/cash";
import { bilan, suivre, type LigneTenue } from "@/lib/domain/encaissement";
import { ETAPES, servicesDuClient, type ContexteClient, type EtatService } from "@/lib/domain/services";
import { getT } from "@/i18n/server";
import { ConseillerCard } from "./ConseillerCard";
import { Etapes } from "./Etapes";
import { fmtDate, localIso } from "@/lib/format";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trader" };

/**
 * Trader : ce que vous pouvez faire, et par où chaque geste commence.
 *
 * LE TROU QUE CETTE PAGE BOUCHE. Le portefeuille suppose qu'on possède déjà, le
 * marché suppose qu'on sait quel instrument on cherche. Personne ne répondait à
 * « j'ai de l'argent, qu'est-ce que je peux en faire ». Les neuf services
 * vivaient sous « Mon espace », où l'on ne va pas chercher ce qu'on ne sait pas
 * offert.
 *
 * Elle absorbe l'ancienne page « Mes services » : l'état de marche et la porte
 * d'entrée étaient deux vues de la même chose. Chaque service porte donc trois
 * choses, et il en fallait trois : son ÉTAT, ce qu'il fait pour VOUS avec vos
 * chiffres, et ses ÉTAPES dans l'ordre. L'état dit où l'on en est, la phrase
 * dit ce que ça donne, les étapes disent ce qu'il va falloir faire.
 *
 * Un service se présente par son état, jamais par sa description : la règle vit
 * dans domain/services.ts, et les étapes avec elle.
 *
 * Le tableau du bas dit la chose que cette page ne peut pas faire seule : une
 * page de services ne suffit jamais, parce que personne ne va la chercher. Le
 * geste doit se présenter au moment où il sert, sur la ligne concernée. La
 * page l'annonce pour qu'on sache où le retrouver.
 */
export default async function TraderPage() {
  const s = await requireSession("/trader");
  const t = await getT();
  const r = repo();
  const aujourdHui = localIso(new Date());

  const [intents, offers, cash, standing, avis, feed, advisor, dossier] = await Promise.all([
    r.listIntents(),
    r.listOffers(),
    r.listCash(s.userId).catch(() => []),
    r.listStandingOrders(s.userId).catch(() => []),
    r.listCustodyNotices({ userId: s.userId }).catch(() => []),
    loadBeacAuctions().catch(() => ({ auctions: [] as BeacAuction[] })),
    r.findAdvisor(s.userId).catch(() => undefined),
    r.getClientFileByUser(s.userId).catch(() => undefined),
  ]);

  const mine = intents.filter((i) => i.clientId === s.userId);
  // La dernière intention par la date, pas par l'ordre de la table : une
  // lecture qui suppose un tri que personne ne garantit finit par mentir.
  const derniere = [...mine].sort((a, b2) => b2.createdAt.localeCompare(a.createdAt))[0]?.ref;
  const positions = positionsFrom(mine, offers);
  const poche = cashPosition(cash, mine);
  const lignes: LigneTenue[] = positions.map((p) => ({ intentId: p.intent.id, titre: p.offer.title, echus: p.echus, aVenir: p.flows }));
  const b = bilan(suivre(lignes, cash));
  const part = positions.find((p) => p.offer.kind === "FONDS");
  const action = positions.find((p) => p.offer.kind === "ACTIONS");
  const reinv = standing.find((x) => x.state === "active" && x.source === "encaissements");
  const epargne = standing.find((x) => x.state === "active" && x.source === "virement");
  const devant = feed.auctions.filter((a) => a.kind === "annonce" && a.on && a.on >= aujourdHui).sort((a, b2) => a.on!.localeCompare(b2.on!))[0];

  const ctx: ContexteClient = {
    lignes: positions.length,
    aSigner: mine.filter((i) => i.state === "confirmee").length,
    aRepondre: mine.filter((i) => i.state === "contre_proposee").length,
    partsDeFonds: part ? { titre: part.offer.title, parts: part.units } : undefined,
    fondsOuverts: offers.filter((o) => o.kind === "FONDS" && o.fund?.distributed && !o.hidden).length,
    actions: action ? { titre: action.offer.title, n: action.units } : undefined,
    disponible: poche.idle,
    attendu: b.nbAttendus ? { montant: b.attendu, retardJours: b.retardMax } : undefined,
    reinvestissement: reinv
      ? { destination: offers.find((o) => o.id === reinv.offerId)?.title ?? reinv.offerId, plancher: reinv.minAmount, dernier: reinv.lastRunOn ? { montant: 0, le: fmtDate(reinv.lastRunOn) } : undefined }
      : undefined,
    epargne: epargne ? { montant: epargne.amount, jour: epargne.dayOfMonth, destination: offers.find((o) => o.id === epargne.offerId)?.title ?? epargne.offerId } : undefined,
    garde: avis[0] ? { periode: avis[0].period, du: avis[0].du } : undefined,
    prochaineSeance: devant ? { pays: devant.country ?? t("la zone"), quoi: [devant.instrument, devant.tenor].filter(Boolean).join(" ") || t("une séance"), le: fmtDate(devant.on!) } : undefined,
    moisDHistorique: positions.length ? 12 : 0,
    appariementExecutable: false,
  };

  const services = servicesDuClient(ctx);

  /**
   * UN SEUL ÉTAT SE DIT, ET C'EST LE BON.
   *
   * Chaque service portait son état en toutes lettres, « en place », « à
   * activer », « indisponible », avec un numéro à côté et trois compteurs au-
   * dessus. Un service qui s'annonce indisponible ferme une porte que rien ne
   * ferme vraiment : il demande seulement qu'on ait commencé par autre chose,
   * et c'est cela qu'il faut dire.
   *
   * Reste donc la seule marque qui apprend quelque chose : ce qui tourne déjà.
   * Le reste se lit dans la phrase du service, qui dit par quoi commencer.
   */
  const dejaLa = (e: EtatService) => e === "en_place";
  const geste: Record<EtatService, string> = { en_place: styles.gSecond, a_activer: styles.gPrincipal, indisponible: styles.gPrincipal };

  const contextes = [
    { quand: t("Un coupon est encaissé"), alors: t("La ligne propose de le replacer, ou d'activer le réinvestissement une fois pour toutes"), ou: t("sur l'espèce") },
    { quand: t("Une séance est annoncée"), alors: t("Le titre concerné propose de déclarer une intention, ou de répondre au sondage"), ou: t("sur le titre") },
    { quand: t("Une part de fonds est détenue"), alors: t("La ligne propose le passage vers un autre fonds, ou un versement programmé dessus"), ou: t("sur la ligne") },
    { quand: t("Une ligne arrive à échéance"), alors: t("Le portefeuille propose ce qui la remplacerait, à durée et à signature comparables"), ou: t("sur la ligne") },
  ];

  return (
    <div className={styles.page}>

      <header className={styles.tete}>
        <h1>{t("Trader maintenant")}</h1>
      </header>

      <ConseillerCard advisor={advisor} client={{ nom: s.name, compte: dossier?.review.custodianAccount, lignes: positions.length, derniere }} />

      <section className={styles.liste}>
        {services.map((sv) => (
          <div className={styles.ligne} key={sv.cle}>
            <span className={styles.quoi}>
              {dejaLa(sv.etat) && (
                <em className={styles.enPlace}>
                  <i aria-hidden="true" />
                  {t("en place")}
                </em>
              )}
              <b>{t(sv.nom)}</b>
              <small>{t(sv.ou)}</small>
            </span>
            <span className={styles.dit}>
              <p>{t(sv.phrase.key, sv.phrase.params)}</p>
              {ETAPES[sv.cle] && <Etapes items={ETAPES[sv.cle]} />}
            </span>
            <Link href={sv.href} className={`${styles.geste} ${geste[sv.etat]}`}>
              {t("Allons-y")}
            </Link>
          </div>
        ))}
      </section>

      {/* Une page de services ne suffit jamais : personne ne va la chercher. */}
      <section className={styles.contexte}>
        <div>
          <h2>{t("Et là où le besoin naît")}</h2>
          <p>{t("Le geste se présente au moment où il sert, sur la ligne concernée. Cette page dit où le retrouver, elle ne le remplace pas.")}</p>
        </div>
        <div className={styles.quand}>
          {contextes.map((c) => (
            <div className={styles.quandLigne} key={c.quand}>
              <span>{c.quand}</span>
              <span>{c.alors}</span>
              <em>{c.ou}</em>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
