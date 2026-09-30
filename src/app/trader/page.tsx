import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { loadBeacAuctions } from "@/lib/market/beac-feed";
import type { BeacAuction } from "@/lib/market/beac";
import { positionsFrom } from "@/lib/positions";
import { cashPosition } from "@/lib/domain/cash";
import { bilan, suivre, type LigneTenue } from "@/lib/domain/encaissement";
import { compteDesEtats, ETAPES, servicesDuClient, type ContexteClient, type EtatService } from "@/lib/domain/services";
import { getT } from "@/i18n/server";
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

  const [intents, offers, cash, standing, avis, feed] = await Promise.all([
    r.listIntents(),
    r.listOffers(),
    r.listCash(s.userId).catch(() => []),
    r.listStandingOrders(s.userId).catch(() => []),
    r.listCustodyNotices({ userId: s.userId }).catch(() => []),
    loadBeacAuctions().catch(() => ({ auctions: [] as BeacAuction[] })),
  ]);

  const mine = intents.filter((i) => i.clientId === s.userId);
  const positions = positionsFrom(mine, offers);
  const poche = cashPosition(cash, mine);
  const lignes: LigneTenue[] = positions.map((p) => ({ intentId: p.intent.id, titre: p.offer.title, echus: p.paid, aVenir: p.flows }));
  const b = bilan(suivre(lignes, cash));
  const part = positions.find((p) => p.offer.kind === "FONDS");
  const action = positions.find((p) => p.offer.kind === "ACTIONS");
  const reinv = standing.find((x) => x.state === "active" && x.source === "encaissements");
  const epargne = standing.find((x) => x.state === "active" && x.source === "virement");
  const devant = feed.auctions.filter((a) => a.kind === "annonce" && a.on && a.on >= aujourdHui).sort((a, b2) => a.on!.localeCompare(b2.on!))[0];

  const ctx: ContexteClient = {
    lignes: positions.length,
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
  const compte = compteDesEtats(services);

  const classe: Record<EtatService, string> = { en_place: styles.enPlace, a_activer: styles.aActiver, indisponible: styles.indisponible };
  const mot: Record<EtatService, string> = { en_place: t("en place"), a_activer: t("à activer"), indisponible: t("indisponible") };
  // « Allons-y » ouvre la page où le geste commence, et la destination se nomme
  // à côté : une commande doit dire exactement ce qui va se passer. Un service
  // fermé n'en porte pas, il n'y a nulle part où aller.
  const geste: Record<EtatService, { mot: string; cls: string }> = {
    en_place: { mot: t("Allons-y"), cls: styles.gSecond },
    a_activer: { mot: t("Allons-y"), cls: styles.gPrincipal },
    indisponible: { mot: t("En savoir plus"), cls: styles.gDiscret },
  };

  const comptes = [
    { n: compte.en_place, mot: t("en place"), sous: t("ils tournent sans vous"), cls: styles.enPlace },
    { n: compte.a_activer, mot: t("à activer"), sous: t("ouverts, jamais pris"), cls: styles.aActiver },
    { n: compte.indisponible, mot: t("indisponible"), sous: t("et la raison est dite"), cls: styles.indisponible },
  ];

  const contextes = [
    { quand: t("Un coupon est encaissé"), alors: t("La ligne propose de le replacer, ou d'activer le réinvestissement une fois pour toutes"), ou: t("sur l'espèce") },
    { quand: t("Une séance est annoncée"), alors: t("Le titre concerné propose de déclarer une intention, ou de répondre au sondage"), ou: t("sur le titre") },
    { quand: t("Une part de fonds est détenue"), alors: t("La ligne propose le passage vers un autre fonds, ou un versement programmé dessus"), ou: t("sur la ligne") },
    { quand: t("Une ligne arrive à échéance"), alors: t("Le portefeuille propose ce qui la remplacerait, à durée et à signature comparables"), ou: t("sur la ligne") },
  ];

  return (
    <div className={styles.page}>

      <header className={styles.tete}>
        <h1>{t("Ce que vous pouvez faire")}</h1>
        <p>{t("Chaque geste dit son état, ce qu'il fait pour vous en ce moment avec vos chiffres, et ses étapes dans l'ordre. Aucun ne décrit un service en général.")}</p>
      </header>

      <section className={styles.comptes}>
        {comptes.map((c) => (
          <div className={`${styles.compte} ${c.cls}`} key={c.mot}>
            <b>{c.n}</b>
            <span>
              <em>{c.mot}</em>
              <small>{c.sous}</small>
            </span>
          </div>
        ))}
      </section>

      <section className={styles.liste}>
        {services.map((sv) => (
          <div className={styles.ligne} key={sv.cle}>
            <span className={`${styles.etat} ${classe[sv.etat]}`}>
              <i aria-hidden="true" />
              <span>{mot[sv.etat]}</span>
            </span>
            <span className={styles.num}>{sv.n}</span>
            <span className={styles.quoi}>
              <b>{t(sv.nom)}</b>
              <small>{t(sv.ou)}</small>
            </span>
            <span className={styles.dit}>
              <p>{t(sv.phrase.key, sv.phrase.params)}</p>
              {sv.sinon && <small>{t(sv.sinon.key, sv.sinon.params)}</small>}
              {/* Les étapes, dans l'ordre : c'est la seule liste numérotée de la
                  maison, parce que c'est la seule vraie séquence. */}
              {ETAPES[sv.cle] && (
                <ol className={styles.etapes}>
                  {ETAPES[sv.cle].map((e) => (
                    <li key={e}>{t(e)}</li>
                  ))}
                </ol>
              )}
            </span>
            <Link href={sv.href} className={`${styles.geste} ${geste[sv.etat].cls}`}>
              {geste[sv.etat].mot}
              <em>{t(sv.ou)}</em>
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
