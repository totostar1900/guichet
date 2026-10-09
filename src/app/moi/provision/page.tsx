import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { SETTLEMENT } from "@/lib/config";
import { cashPosition, referenceDeProvision } from "@/lib/domain/cash";
import { prochaineEcheance, PREAVIS_JOURS } from "@/lib/domain/prelevement";
import { positionsFrom } from "@/lib/positions";
import { getT } from "@/i18n/server";
import { fmt, fmtDate, localIso } from "@/lib/format";
import { DemanderVersement } from "@/app/DemanderVersement";
import { PlacerLaProvision } from "./PlacerLaProvision";
import { Copier } from "./Copier";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Votre provision") };
}

/** Un fonds monétaire : le catalogue ne porte pas l'étiquette, le nom et la catégorie la disent. */
const estMonetaire = (titre: string, categorie?: string) => /mon(é|e)taire|trésorerie/i.test(`${titre} ${categorie ?? ""}`);

/**
 * LE DOMICILE DU SOLDE, ET IL N'EN AVAIT PAS.
 *
 * Le disponible se lisait en trois endroits : un chiffre dans la console, un
 * compteur dans Trader, une ligne sur la page du réinvestissement. Trois
 * lectures, aucune adresse : rien ne disait comment l'alimenter, ce qui était
 * mis de côté et pour quel ordre, ni combien de temps un versement demandé
 * mettrait à partir.
 *
 * LA PAGE DIT LE SOLDE, PUIS CE QU'ON EN FAIT, et le 9 octobre 2026 elle a
 * été reprise sur ces deux points :
 *
 * LE SOLDE. Trois chiffres côte à côte (disponible, mis de côté, total)
 * disaient les montants sans dire qu'ils se répondent. Il y a maintenant un
 * total, une barre qui le partage, et chaque état porte SON geste : le
 * disponible se place ou se reprend, le mis de côté s'explique par les ordres
 * qui le retiennent. Ce qui est placé en parts de fonds paraît SOUS le total
 * et hors de lui : une somme devenue titres n'est plus un solde, mais la
 * taire ferait voir un disponible fondu sans raison visible.
 *
 * LES GESTES. Quatre, numérotés, dont un marqué « sans vous » : c'est la
 * réponse à « que puis-je faire ici », qu'une suite de sections ne donnait
 * pas. Et le prélèvement entre enfin sur la page, à côté du virement, parce
 * que c'est l'autre façon de la garnir : il n'était nommé nulle part ici. Il
 * se montre MÊME SANS MANDAT (décidé le 9 octobre 2026) : une porte qui
 * n'apparaît qu'à ceux qui l'ont déjà franchie n'ouvre sur personne.
 */
export default async function ProvisionPage() {
  const t = await getT();
  const s = await requireSession("/moi/provision");
  const r = repo();
  const [cash, intents, offers, payouts, mandats, file] = await Promise.all([
    r.listCash(s.userId).catch(() => []),
    r.listIntents(),
    r.listOffers(),
    r.listPayouts({ userId: s.userId }).catch(() => []),
    r.listMandats(s.userId).catch(() => []),
    r.getClientFileByUser(s.userId).catch(() => undefined),
  ]);
  const mine = intents.filter((i) => i.clientId === s.userId);
  const poche = cashPosition(cash, mine);
  const reserves = mine
    .filter((i) => i.coveredAt && i.state !== "reglee" && i.state !== "annulee" && i.state !== "non_servie")
    .map((i) => ({ i, titre: offers.find((o) => o.id === i.offerId)?.title ?? i.offerId }));
  const derniereDemande = payouts.find((p) => p.state === "demandee") ?? [...payouts].sort((x, y) => y.askedAt.localeCompare(x.askedAt))[0];
  /* Le fonds monétaire où placer : la page ne choisit pas pour le client, elle
     lui montre ce qui existe. */
  const monetaires = offers.filter((o) => o.kind === "FONDS" && !o.hidden && o.fund?.distributed && estMonetaire(o.title, o.fund?.category));
  const reference = referenceDeProvision(s.userId);

  /* CE QUI EST DÉJÀ PLACÉ, lu des positions et non d'un compteur à part : le
     même argent compté deux fois serait le défaut de la maison. */
  const placees = positionsFrom(mine, offers).filter((p) => p.offer.kind === "FONDS" && estMonetaire(p.offer.title, p.offer.fund?.category));
  const place = placees.reduce((somme, p) => somme + (p.marketValue ?? p.nominalAmount ?? 0), 0);

  /* LE MANDAT QUI GARNIT LA PROVISION : son état se lit ici, il se change là
     où il vit (/moi/prelevements). Un écho, pas un second domicile. */
  const mandat = mandats.find((m) => m.objet === "provision" && m.state !== "revoque" && m.signedAt);
  const prochainTirage = mandat?.dayOfMonth ? prochaineEcheance(mandat.dayOfMonth, localIso(new Date())) : undefined;

  const dernierMouvement = cash.length ? cash.reduce((d, e) => (e.at > d ? e.at : d), cash[0].at) : undefined;
  const compte = file?.funds.bankName ? `${file.funds.bankName}${file.funds.bankAccount ? ` …${file.funds.bankAccount.replace(/\s/g, "").slice(-4)}` : ""}` : undefined;

  /* La barre ne se peint que s'il y a quelque chose à partager : à solde nul,
     deux parts de zéro donneraient une barre vide qui ressemble à une panne. */
  const partage = poche.balance > 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div className="eyebrow">{t("Votre argent chez nous")}</div>
        <h1 className="display">{t("Votre provision")}</h1>
        <p className={styles.lead}>
          {t(
            "Ce que vous laissez ici règle vos ordres sans attendre un virement. Elle n'est jamais obligatoire : vous pouvez payer chaque ordre au coup par coup. Elle reste votre argent, sur un compte séparé de celui de la maison.",
          )}
        </p>
      </div>

      <section className={styles.solde}>
        <div className={styles.soldeTete}>
          <div>
            <span className={styles.quoi}>{t("Ce que la maison vous doit")}</span>
            <b className={styles.grand}>
              {fmt(Math.round(poche.balance))} <small>FCFA</small>
            </b>
          </div>
          {dernierMouvement && <div className={styles.depuis}>{t("dernier mouvement le {d}", { d: fmtDate(dernierMouvement, false) })}</div>}
        </div>

        {partage && (
          <div className={styles.barre} aria-hidden="true">
            <i className={styles.part1} style={{ flex: Math.max(0, poche.idle) }} />
            <i className={styles.part2} style={{ flex: Math.max(0, poche.balance - poche.idle) }} />
          </div>
        )}

        <div className={styles.etats}>
          <div className={styles.etat}>
            <span className={styles.cle}>
              <i className={`${styles.puce} ${styles.part1}`} /> {t("Disponible")}
            </span>
            <b className={styles.valeur}>{fmt(Math.round(poche.idle))} FCFA</b>
            <p>{t("Pour votre prochain ordre, ou à reprendre quand vous voulez.")}</p>
            {poche.idle > 0 && (
              <div className={styles.gestesDeLEtat}>
                <a href="#placer">{t("La faire travailler")}</a>
                <a href="#reprendre">{t("Me la faire virer")}</a>
              </div>
            )}
          </div>
          <div className={styles.etat}>
            <span className={styles.cle}>
              <i className={`${styles.puce} ${styles.part2}`} /> {t("Mis de côté")}
            </span>
            <b className={styles.valeur}>{fmt(Math.round(poche.balance - poche.idle))} FCFA</b>
            <p>{t("Par vos ordres signés. Cette somme ne sort qu'au règlement, et ce qui n'est pas consommé revient.")}</p>
            {/* UN MONTANT RÉSERVÉ SANS SON ORDRE EST UNE RETENUE INEXPLIQUÉE.
                C'est le seul endroit où le client peut vérifier que son argent
                n'est pas immobilisé par une opération qu'il a oubliée. */}
            {reserves.length > 0 && (
              <ul className={styles.reserves}>
                {reserves.map(({ i, titre }) => (
                  <li key={i.id}>
                    <Link href={`/moi/ordres/${i.id}`}>
                      <span>
                        <b>{titre}</b>
                        <small>
                          {t("Ordre")} <span className="mono">{i.ref}</span> · {t("signé le {d}", { d: fmtDate(i.signedAt ?? i.coveredAt!, false) })}
                        </small>
                      </span>
                      <b className={styles.montant}>{fmt(Math.round(i.coveredAmount ?? 0))}</b>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {place > 0 && (
          <div className={styles.horsSolde}>
            <span>
              <b>{t("{m} FCFA placés", { m: fmt(Math.round(place)) })}</b> {t("en parts de {f}, inscrites à votre nom.", { f: placees[0].offer.title })}
            </span>
            <span>
              {t("Hors de ce solde : c'est une ligne de votre portefeuille.")} <Link href={`/offres/${placees[0].offer.id}`}>{t("La voir")} →</Link>
            </span>
          </div>
        )}
      </section>

      <div className={styles.titreDesGestes}>
        <h2 className="display">{t("Ce que vous pouvez en faire")}</h2>
        <p className={styles.sous}>{t("Trois gestes sont les vôtres. Le quatrième, celui qui règle vos ordres, se fait sans vous.")}</p>
      </div>

      <div className={styles.gestes}>
        {/* 1 · L'ALIMENTER, par ses deux chemins. */}
        <section className={`${styles.geste} ${styles.large}`} id="alimenter">
          <div className={styles.gTete}>
            <i className={styles.n}>1</i>
            <div>
              <b>{t("L'alimenter")}</b>
              <small>{t("Deux chemins : une fois, ou chaque mois")}</small>
            </div>
            {mandat && <span className={`${styles.etiq} ${styles.etiqOn}`}>{t("Prélèvement actif")}</span>}
          </div>
          <div className={styles.chemins}>
            <div className={styles.chemin}>
              <h3>
                {t("Par virement")} <span>{t("une fois")}</span>
              </h3>
              <div className={styles.motif}>
                <span>
                  {t("Motif du virement")}
                  <b className="mono">{reference}</b>
                </span>
                <Copier valeur={reference} quoi={t("le motif du virement")} />
              </div>
              <dl className={styles.coord}>
                <div>
                  <dt>{t("Bénéficiaire")}</dt>
                  <dd>
                    <span>{SETTLEMENT.beneficiary}</span>
                    <Copier valeur={SETTLEMENT.beneficiary} quoi={t("le bénéficiaire")} />
                  </dd>
                </div>
                <div>
                  {/* PAS « Banque » TOUT COURT : cette clef est déjà le secteur
                      d'une société cotée, traduit « Banking ». Un mot seul fait
                      une clef fragile, et la maison s'est déjà fait prendre. */}
                  <dt>{t("Banque du bénéficiaire")}</dt>
                  <dd>
                    <span>{SETTLEMENT.bank}</span>
                    <Copier valeur={SETTLEMENT.bank} quoi={t("la banque")} />
                  </dd>
                </div>
                <div>
                  <dt>{t("RIB / IBAN")}</dt>
                  <dd>
                    <span className="mono">{SETTLEMENT.iban}</span>
                    <Copier valeur={SETTLEMENT.iban} quoi={t("le RIB")} />
                  </dd>
                </div>
              </dl>
              <p className={styles.avert}>{t("Le motif rattache votre virement à votre compte : sans lui, il arrive sans nom. Le compte émetteur doit être au vôtre.")}</p>
            </div>

            <div className={styles.chemin}>
              <h3>
                {t("Par prélèvement")} <span>{t("chaque mois")}</span>
              </h3>
              {mandat ? (
                <>
                  <div className={styles.encadre}>
                    <b>{mandat.amount ? t("{m} FCFA le {j} de chaque mois", { m: fmt(mandat.amount), j: String(mandat.dayOfMonth ?? "") }) : t("Mandat signé")}</b>
                    <br />
                    {t("Mandat")} <span className="mono">{mandat.ref}</span>
                    {mandat.signedAt ? `, ${t("signé le {d}", { d: fmtDate(mandat.signedAt, false) })}` : ""}
                    {prochainTirage ? ` · ${t("prochain prélèvement le {d}, annoncé {n} jours avant", { d: fmtDate(prochainTirage, false), n: String(PREAVIS_JOURS) })}` : ""}
                    {mandat.state === "suspendu" ? ` · ${t("suspendu après deux rejets : votre banque a refusé le prélèvement")}` : ""}
                  </div>
                  <div className={styles.gestesDeLEtat}>
                    <Link href="/moi/prelevements">{t("Changer le montant")}</Link>
                    <Link href="/moi/prelevements">{t("Révoquer le mandat")}</Link>
                  </div>
                  <p className={styles.avert}>{t("Chaque prélèvement est annoncé avant de partir, et nous ne prélevons jamais plus que le montant que vous avez signé.")}</p>
                </>
              ) : (
                <>
                  {/* LE CHEMIN SE MONTRE MÊME SANS MANDAT : une porte qui
                      n'apparaît qu'à ceux qui l'ont déjà franchie n'ouvre sur
                      personne. Même leçon que les neuf services invisibles. */}
                  <p className={styles.avert}>
                    {t("Faites venir une somme fixe chaque mois, sans y penser. Vous signez l'autorisation une fois ; chaque prélèvement vous est annoncé cinq jours avant, et jamais au-delà du montant signé.")}
                  </p>
                  <div className={styles.rangee}>
                    <Link className="btn sm" href="/moi/prelevements">
                      {t("Mettre en place un prélèvement")}
                    </Link>
                  </div>
                  <p className={styles.avert}>{t("Vous fixez le montant et le jour, et vous l'arrêtez quand vous voulez.")}</p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* 2 · LA FAIRE TRAVAILLER */}
        <PlacerLaProvision
          disponible={Math.round(poche.idle)}
          fonds={monetaires.map((o) => ({ id: o.id, titre: o.title, gestionnaire: o.fund?.manager ?? o.issuer, droits: o.fund?.entryFeePct }))}
        />

        {/* 3 · LA REPRENDRE */}
        <section className={styles.geste} id="reprendre">
          <div className={styles.gTete}>
            <i className={styles.n}>3</i>
            <div>
              <b>{t("La reprendre")}</b>
              <small>{t("Sous 72 heures ouvrables")}</small>
            </div>
          </div>
          <div className={styles.gCorps}>
            <p>
              {compte
                ? t("Votre disponible vous est versé sur demande, sur {c}, le compte déclaré à l'ouverture et le seul possible.", { c: compte })
                : t("Votre disponible vous est versé sur demande, sur le compte bancaire déclaré à l'ouverture et sur lui seul.")}
            </p>
            <DemanderVersement montant={poche.idle} demande={derniereDemande} />
            <p className={styles.avert}>{t("Il part dans les soixante-douze heures ouvrables qui suivent votre demande, et le desk recalcule au moment du virement : un coupon qui tombe d'ici là s'y ajoute.")}</p>
          </div>
        </section>

        {/* CELUI QUI SE FAIT SANS VOUS : hors du compte des gestes, et dit
            quand même, parce que c'est lui qui explique le « mis de côté ». */}
        <section className={`${styles.geste} ${styles.auto} ${styles.large}`} id="regler">
          <div className={styles.gTete}>
            <i className={styles.n}>✓</i>
            <div>
              <b>{t("Régler un ordre")}</b>
              <small>{t("Sans virement, sans délai")}</small>
            </div>
            <span className={`${styles.etiq} ${styles.etiqOk}`}>{t("Sans vous")}</span>
          </div>
          <div className={styles.gCorps}>
            <p>{t("Quand vous signez un ordre, le montant est mis de côté sur cette provision : vous n'avez rien à virer, et rien à faire ici.")}</p>
            <p>{t("Si l'ordre n'est servi qu'en partie, ou pas du tout, la différence redevient disponible le jour où le résultat est connu.")}</p>
            <div className={styles.gestesDeLEtat}>
              <Link href="/#ordres-en-cours">{t("Vos ordres en cours")} →</Link>
            </div>
          </div>
        </section>
      </div>

      <div className={styles.pied}>
        <span>
          <b>{t("D'où vient ce solde")}</b>
          <small>{t("Chaque mouvement est porté au journal, à sa date de valeur.")}</small>
        </span>
        <Link href="/moi/performance#operations">{t("Le journal de vos mouvements")} →</Link>
      </div>
      <div className={styles.pied}>
        <span>
          <b>{t("Ce que cela coûte")}</b>
          <small>{t("Rien : ni la tenue de la provision, ni le virement de retour.")}</small>
        </span>
        <Link href="/moi/tarifs">{t("L'annexe tarifaire")} →</Link>
      </div>
    </div>
  );
}
