import Link from "next/link";
import type { Session } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { loadBeacAuctions } from "@/lib/market/beac-feed";
import type { BeacAuction } from "@/lib/market/beac";
import { positionsFrom } from "@/lib/positions";
import { cashPosition } from "@/lib/domain/cash";
import { bilan, suivre, type LigneTenue } from "@/lib/domain/encaissement";
import { attentesDuClient, compteDesEtats, servicesDuClient, type ContexteClient, type EtatService } from "@/lib/domain/services";
import { buildCurve, horizon, MIN_POINTS } from "@/lib/market/curve";
import { getT } from "@/i18n/server";
import { fmt, fmtDate, localIso } from "@/lib/format";
import styles from "./Console.module.css";

/**
 * L'accueil d'un client connecté : une console, pas un catalogue.
 *
 * Il atterrissait sur la liste des titres. C'est le bon écran pour choisir un
 * instrument, et le mauvais pour revenir : après son premier achat, un client
 * ne vient pas parcourir, il vient agir. Trois choses le prouvent, dans cet
 * ordre à l'écran :
 *
 *   CE QUI VOUS ATTEND, et rien d'autre. Au plus trois décisions possibles
 *   aujourd'hui. Une console qui en propose huit n'en propose aucune.
 *
 *   VOS SERVICES, chacun portant son ÉTAT et vos chiffres, jamais sa
 *   description. « Épargne programmée » ne se lit pas ; « en place · 50 000 le
 *   5 · prochain le 5 octobre » se lit. La règle vit dans domain/services.ts.
 *
 *   LE PORTEFEUILLE ET LE MARCHÉ, après : ils se consultent, ils ne se
 *   décident pas.
 */
export async function Console({ session }: { session: Session }) {
  const t = await getT();
  const r = repo();
  const aujourdHui = localIso(new Date());

  const [intents, offers, cash, standing, avis, feed, seances] = await Promise.all([
    r.listIntents(),
    r.listOffers(),
    r.listCash(session.userId).catch(() => []),
    r.listStandingOrders(session.userId).catch(() => []),
    r.listCustodyNotices({ userId: session.userId }).catch(() => []),
    loadBeacAuctions().catch(() => ({ auctions: [] as BeacAuction[] })),
    r.listAuctionResults({ limit: 400 }).catch(() => []),
  ]);

  const mine = intents.filter((i) => i.clientId === session.userId);
  const positions = positionsFrom(mine, offers);
  const poche = cashPosition(cash, mine);
  const lignes: LigneTenue[] = positions.map((p) => ({ intentId: p.intent.id, titre: p.offer.title, echus: p.paid, aVenir: p.flows }));
  const b = bilan(suivre(lignes, cash));

  const part = positions.find((p) => p.offer.kind === "FONDS");
  const action = positions.find((p) => p.offer.kind === "ACTIONS" || p.offer.instrument === "action");
  const reinv = standing.find((s) => s.state === "active" && s.source === "encaissements");
  const epargne = standing.find((s) => s.state === "active" && s.source === "virement");
  const dernierAvis = avis[0];

  /* La prochaine séance annoncée : le calendrier de la BEAC, filtré sur ce qui
     reste devant. Sans elle, deux services perdent leur prise, et le disent. */
  const devant = feed.auctions
    .filter((a) => a.kind === "annonce" && a.on && a.on >= aujourdHui)
    .sort((a, b2) => a.on!.localeCompare(b2.on!))[0];

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
    epargne: epargne
      ? { montant: epargne.amount, jour: epargne.dayOfMonth, destination: offers.find((o) => o.id === epargne.offerId)?.title ?? epargne.offerId, prochain: epargne.lastRunOn ? undefined : undefined }
      : undefined,
    garde: dernierAvis ? { periode: dernierAvis.period, du: dernierAvis.du } : undefined,
    prochaineSeance: devant ? { pays: devant.country ?? t("la zone"), quoi: [devant.instrument, devant.tenor].filter(Boolean).join(" ") || t("une séance"), le: fmtDate(devant.on!) } : undefined,
    moisDHistorique: positions.length ? 12 : 0,
    appariementExecutable: false,
  };

  const services = servicesDuClient(ctx);
  const compte = compteDesEtats(services);
  const attentes = attentesDuClient(ctx, fmt);

  /* Les trois chiffres du portefeuille, et rien de plus : une console n'est
     pas un relevé, elle renvoie au relevé. */
  const valorise = positions.reduce((s, p) => s + (p.marketValue ?? p.costBasis), 0);
  const prochaine = positions.map((p) => p.nextFlow).filter(Boolean).sort((a, b2) => a!.date.localeCompare(b2!.date))[0];

  /* Le marché du jour : la dernière durée adjugée par Trésor, trois au plus. */
  const courbe = buildCurve(seances, { windowDays: 365 });
  const cotes = courbe.countries
    .filter((c) => c.points.length >= MIN_POINTS)
    .slice(0, 3)
    .map((c) => {
      const p = [...c.points].sort((x, y) => x.ageDays - y.ageDays)[0];
      const h = horizon(p.years);
      return { pays: c.country, mot: `${h.n} ${h.unit}`, pct: p.yield.pct };
    });

  const classe: Record<EtatService, string> = { en_place: styles.enPlace, a_activer: styles.aActiver, indisponible: styles.indisponible };
  const mot: Record<EtatService, string> = { en_place: t("en place"), a_activer: t("à activer"), indisponible: t("indisponible") };

  return (
    <div className={styles.page}>

      <div className={styles.bonjour}>
        <h1>{t("Bonjour {p}", { p: session.name.split(" ")[0] })}</h1>
        <span className={`${styles.canaux} ${session.kycStatus === "valide" ? "" : styles.canauxManque}`}>
          {session.kycStatus === "valide" ? t("Dossier complet") : t("Dossier à compléter")}
        </span>
      </div>

      {/* 1. Ce qui attend une décision aujourd'hui, et rien d'autre. */}
      {attentes.length > 0 && (
        <section>
          <div className={styles.tete}>
            <b>{t("Ce qui vous attend")}</b>
            <span>{attentes.length === 1 ? t("une décision possible aujourd'hui") : t("{n} décisions possibles aujourd'hui", { n: attentes.length })}</span>
          </div>
          <div className={styles.attentes}>
            {attentes.map((a) => (
              <div key={a.cle} className={`${styles.attente} ${a.ton === "arrive" ? styles.arrive : a.ton === "annonce" ? styles.annonce : styles.retard}`}>
                <span>{t(a.quand.key, a.quand.params)}</span>
                <b>{a.chiffre}</b>
                <p>{t(a.quoi.key, a.quoi.params)}</p>
                <Link href={a.href}>{t(a.geste)}</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. Les services, chacun avec son état : c'est ce qui manquait. */}
      <section>
        <div className={styles.tete}>
          <b>{t("Vos services")}</b>
          <Link href="/moi/services">
            {t("{a} en place · {b} à activer", { a: compte.en_place, b: compte.a_activer })} →
          </Link>
        </div>
        <div className={styles.services}>
          {services.map((s) => (
            <Link key={s.cle} href={s.href} className={styles.service}>
              <span className={`${styles.etat} ${classe[s.etat]}`}>
                <i aria-hidden="true" />
                <span>{mot[s.etat]}</span>
              </span>
              <b>{t(s.nom)}</b>
              <small>{t(s.phrase.key, s.phrase.params)}</small>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Le portefeuille et le marché : ils se consultent. */}
      <section className={styles.bas}>
        <div className={styles.pf}>
          <div className={styles.tete}>
            <b>{t("Votre portefeuille")}</b>
            <Link href="/moi">{t("Le relevé")} →</Link>
          </div>
          {positions.length ? (
            <div className={styles.chiffres}>
              <div>
                <span>{t("Valorisé")}</span>
                <b>{fmt(Math.round(valorise))}</b>
                <small>{t("{n} lignes à votre nom", { n: positions.length })}</small>
              </div>
              <div>
                <span>{t("Reçu à ce jour")}</span>
                <b>{fmt(Math.round(b.encaisse))}</b>
                <small>{t("coupons et remboursements portés au journal")}</small>
              </div>
              <div>
                <span>{t("Prochaine échéance")}</span>
                <b>{prochaine ? fmtDate(prochaine.date) : "—"}</b>
                <small>{prochaine ? t("{m} FCFA attendus", { m: fmt(Math.round(prochaine.amount)) }) : t("aucune échéance connue")}</small>
              </div>
            </div>
          ) : (
            <p className={styles.vide}>{t("Vous ne tenez encore aucune ligne. Les titres et les fonds ouverts se parcourent sans engagement.")}</p>
          )}
        </div>

        <div className={styles.marche}>
          <div className={styles.tete}>
            <b>{t("Le marché aujourd'hui")}</b>
            <Link href="/marche">{t("Analyses")} →</Link>
          </div>
          {cotes.length ? (
            cotes.map((c) => (
              <div key={c.pays} className={styles.cote}>
                <span>
                  {c.pays} · {c.mot}
                </span>
                <b>{c.pct.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %</b>
              </div>
            ))
          ) : (
            <p className={styles.vide}>{t("Aucune séance relue sur l'année écoulée : le marché se remplira à la première.")}</p>
          )}
        </div>
      </section>

    </div>
  );
}
