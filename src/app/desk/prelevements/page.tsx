import { DeskNav } from "@/components/DeskNav";
import { getT } from "@/i18n/server";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { ageDeLaRemise, echeanceDuJour, JOURS_SANS_NOUVELLE, MOTIFS, PREAVIS_JOURS, pourquoiPasRemettre, refDeLaRemise, sansNouvelle, type MotifDeRejet } from "@/lib/domain/prelevement";
import { fmt, fmtDate } from "@/lib/format";
import { Echeance, type LigneDEcheance, type LigneEcartee } from "./Echeance";
import { Sorts, type SuspenduVu, type TirageVu } from "./Sorts";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prélèvements" };

const jourPlus = (iso: string, n: number) => new Date(new Date(`${iso}T12:00:00.000Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

/**
 * LE DOMICILE DE L'EXÉCUTION DES MANDATS.
 *
 * Le mandat se signe chez le client, sur /moi/prelevements ; il s'exécute ici.
 * Deux pages pour un sujet, et ce n'est pas un doublon : l'une est une
 * autorisation qu'on donne, l'autre est un travail qu'on fait, et les deux
 * n'ont ni le même lecteur ni le même geste.
 *
 * TOUT CE QUI SUIT TIENT À UNE PHRASE : un virement qui n'arrive pas est un
 * non-événement, un prélèvement qui échoue est un rejet. Il coûte au client,
 * il s'inscrit chez sa banque, et répété il fait casser le mandat. D'où le
 * préavis qui conditionne la remise, le plafond qui écarte au lieu de rogner,
 * et la cause du rejet qui décide de la suite.
 *
 * L'APPLICATION NE CONNAÎT QU'UN CÔTÉ, ici aussi : le fichier se télécharge et
 * se dépose à la main, et le sort de chaque ligne se saisit. C'est la même
 * moitié manquante que sur /desk/virements, et elle disparaîtra le même jour.
 */
export default async function PrelevementsDeskPage({ searchParams }: { searchParams: Promise<{ jour?: string }> }) {
  await requireDesk("/desk/prelevements");
  const t = await getT();
  const { jour } = await searchParams;
  const r = repo();
  const [mandats, standings, remises, tirages, fiches] = await Promise.all([
    r.listMandats(),
    r.listStandingOrders().catch(() => []),
    r.listRemises(120),
    r.listTirages(),
    r.listClientFiles().catch(() => []),
  ]);
  const nomDe = new Map(fiches.map((f) => [f.userId, f.identity.name]));
  const parStanding = new Map(standings.map((s) => [s.id, s]));
  const aujourdHui = new Date().toISOString().slice(0, 10);

  /* L'ÉCHÉANCE MONTRÉE PAR DÉFAUT est la première qui reste à faire, et on
     regarde dix jours en arrière : une échéance oubliée la semaine dernière
     doit se voir en arrivant, pas se chercher. */
  const prochaine = (): string => {
    for (let i = -10; i <= 40; i += 1) {
      const d = jourPlus(aujourdHui, i);
      /* Une seconde présentation tombe un jour qui n'est celui d'aucun
         mandat : sans elle ici, la page sautait par-dessus et le tirage
         préparé n'était jamais remis. */
      const attend = tirages.some((x) => x.dueOn === d && x.state === "prepare");
      if (!attend && !echeanceDuJour(mandats, standings, d).aTirer.length) continue;
      if (remises.some((x) => x.dueOn === d && x.state === "remise")) continue;
      return d;
    }
    return aujourdHui;
  };
  const dueOn = jour && /^\d{4}-\d{2}-\d{2}$/.test(jour) ? jour : prochaine();

  const { aTirer, ecartes } = echeanceDuJour(mandats, standings, dueOn);
  const duJour = tirages.filter((x) => x.dueOn === dueOn);
  const parMandat = new Map(duJour.map((x) => [x.mandatId, x]));

  const lignes: LigneDEcheance[] = aTirer.map(({ mandat, amount }) => {
    const t2 = parMandat.get(mandat.id);
    const s = mandat.standingId ? parStanding.get(mandat.standingId) : undefined;
    return {
      mandatRef: mandat.ref,
      client: nomDe.get(mandat.userId) ?? mandat.accountHolder,
      objet: mandat.objet,
      detail: s ? `${s.ref}` : undefined,
      amount,
      plafond: mandat.maxAmount,
      banque: mandat.bankName,
      compte: mandat.bankAccount,
      preavis: t2?.announcedAt ? { parti: t2.noticeSent, le: t2.announcedAt, erreur: t2.noticeError } : undefined,
    };
  });
  /* UNE SECONDE PRÉSENTATION N'EST PAS UNE ÉCHÉANCE DU CALENDRIER.
     Elle naît d'un rejet, quinze jours plus tard, un jour qui n'est celui
     d'aucun mandat. La liste, bâtie des seuls mandats du jour, ne la montrait
     pas : « Remettre à la banque » comptait zéro, le tirage restait
     « préparé » pour toujours, et la promesse faite au client (« nous le
     représenterons une fois ») ne pouvait pas être tenue. Mesuré à l'écran le
     10 octobre 2026, en traversant la page pour la première fois. */
  const repasses = duJour.filter((x) => x.state === "prepare" && !aTirer.some((a) => a.mandat.id === x.mandatId));
  for (const x of repasses) {
    const m = mandats.find((y) => y.id === x.mandatId);
    if (!m) continue;
    lignes.push({
      mandatRef: m.ref,
      client: nomDe.get(m.userId) ?? m.accountHolder,
      objet: m.objet,
      repasse: x.retryOf ? "rejet" : "prepare",
      amount: x.amount,
      plafond: m.maxAmount,
      banque: m.bankName,
      compte: m.bankAccount,
      preavis: x.announcedAt ? { parti: x.noticeSent, le: x.announcedAt, erreur: x.noticeError } : undefined,
    });
  }

  const ecartesVus: LigneEcartee[] = ecartes.map((e) => ({ mandatRef: e.mandat.ref, client: nomDe.get(e.mandat.userId) ?? e.mandat.accountHolder, raison: e.raison, montant: e.montant }));

  /* ARRIVÉS APRÈS LE DÉPART DE LA REMISE.
     Un mandat signé à 10 h 26 pour une échéance dont le fichier est parti à
     10 h 20 produit un tirage prêt que plus rien ne peut emporter : la règle
     interdit un second fichier le même jour, à juste titre, et celui-là n'a
     jamais été dedans. L'écran comptait pourtant « Remettre à la banque (1) »
     sur un bouton désactivé, sans un mot : le desk clique, et rien. Mesuré à
     l'écran le 10 octobre 2026. Ils sortent donc du compte, et se disent. */
  const partie = remises.find((x) => x.dueOn === dueOn && x.state === "remise");
  const prets = duJour.filter((x) => pourquoiPasRemettre(x, aujourdHui) === null);
  const arrivesApres = partie ? prets.filter((x) => x.remiseId !== partie.id) : [];
  const remettable = prets.length - arrivesApres.length;
  const enAttenteDePreavis = duJour.filter((x) => pourquoiPasRemettre(x, aujourdHui) === "pas_parti").length;
  const remise = remises.find((x) => x.dueOn === dueOn);

  const enAttenteDeSort: TirageVu[] = tirages
    .filter((x) => x.state === "remis")
    .map((x) => ({
      id: x.id,
      ref: x.ref,
      mandatRef: mandats.find((m) => m.id === x.mandatId)?.ref ?? x.mandatId,
      client: nomDe.get(x.userId) ?? x.userId,
      amount: x.amount,
      dueOn: fmtDate(x.dueOn),
      age: ageDeLaRemise(x),
      sansNouvelle: sansNouvelle(x),
    }))
    .sort((a, b) => b.age - a.age || b.amount - a.amount);

  const suspendus: SuspenduVu[] = mandats
    .filter((m) => m.state === "suspendu")
    .map((m) => ({ id: m.id, ref: m.ref, client: nomDe.get(m.userId) ?? m.accountHolder, rejets: m.rejects ?? 0 }));

  const mois = aujourdHui.slice(0, 7);
  const rejetsDuMois = tirages.filter((x) => x.state === "rejete" && x.dueOn.startsWith(mois)).length;
  const muets = enAttenteDeSort.filter((x) => x.sansNouvelle).length;

  return (
    <>
      <DeskNav current="/desk/prelevements" badges={{ "/desk/prelevements": muets + remettable }} />
      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <h1>{t("Prélèvements")}</h1>
            <p className="muted">
              {t(
                "Ici la maison tire, au lieu que le client pousse. Une échéance se prépare, s'annonce, se remet à la banque en un fichier, et revient avec trois issues possibles par ligne. La troisième, « sans nouvelle », est la pire : rien ne s'est passé, et rien ne le dit.",
              )}
            </p>
          </div>
        </header>

        <div className={styles.band}>
          <div>
            <span>{t("Échéance en cours")}</span>
            <b>{fmtDate(dueOn)}</b>
          </div>
          <div>
            <span>{t("À prélever")}</span>
            <b>{fmt(lignes.reduce((s, l) => s + l.amount, 0))}</b>
          </div>
          <div>
            <span>{t("Prêts à remettre")}</span>
            <b>
              {remettable} / {lignes.length}
            </b>
          </div>
          <div>
            <span>{t("Sans nouvelle")}</span>
            <b className={muets ? styles.crit : undefined}>{muets}</b>
          </div>
          <div>
            <span>{t("Rejets ce mois")}</span>
            <b className={rejetsDuMois ? styles.warn : undefined}>{rejetsDuMois}</b>
          </div>
          <div>
            <span>{t("Mandats suspendus")}</span>
            <b className={suspendus.length ? styles.warn : undefined}>{suspendus.length}</b>
          </div>
        </div>

        <Echeance
          dueOn={dueOn}
          dueOnLabel={fmtDate(dueOn)}
          lignes={lignes}
          ecartes={ecartesVus}
          remise={remise ? { ref: remise.ref, remiseLe: remise.handedAt ? fmtDate(remise.handedAt) : undefined } : undefined}
          remettable={remettable}
          enAttenteDePreavis={enAttenteDePreavis}
          arrivesApres={arrivesApres.length}
        />

        {remise?.handedAt && (
          <section className="panel">
            <div className="panel-h">
              <h2>{t("Remise {r} · {n} tirages · {m} FCFA", { r: remise.ref, n: String(duJour.filter((x) => x.state !== "prepare" && x.state !== "abandonne").length), m: fmt(duJour.filter((x) => x.state !== "prepare" && x.state !== "abandonne").reduce((s, x) => s + x.amount, 0)) })}</h2>
              <span className="muted">{t("Remise le {d}", { d: fmtDate(remise.handedAt) })}</span>
            </div>
            <div className={styles.pb}>
              <a className="btn" href={`/api/prelevements/${dueOn}`} download>
                {t("Le fichier de la remise (CSV)")}
              </a>
              {/* LE FORMAT N'EST PAS ARRÊTÉ, et le dire vaut mieux que de
                  laisser croire qu'il l'est : aucune banque de la zone ne lit
                  un pain.008, et ce sont les colonnes d'un relevé de remise
                  qu'un guichet sait lire. */}
              <p className={styles.note}>{t("Le format exact reste à convenir avec la banque : ce sont les colonnes qui bougeront, pas les lignes. La lettre d'accompagnement suivra quand la banque aura dit ce qu'elle veut y lire.")}</p>
            </div>
          </section>
        )}

        <Sorts file={enAttenteDeSort} suspendus={suspendus} />

        <section className="panel">
          <div className="panel-h">
            <h2>{t("La cause d'un rejet décide de la suite")}</h2>
            <span className="muted">{t("Et ce n'est pas le nombre de rejets qui décide, sauf pour une seule cause.")}</span>
          </div>
          <div className={styles.pb}>
            <ul className={styles.causes}>
              {(Object.keys(MOTIFS) as MotifDeRejet[]).map((k) => (
                <li key={k}>
                  <b>{t(MOTIFS[k].libelle)}</b>
                  <span>{MOTIFS[k].rejouable ? t("Une seconde présentation, quinze jours plus tard, annoncée comme la première. Au second rejet de cette cause, le mandat se suspend.") : t("Suspension immédiate. Représenter n'aboutirait pas, et insister fait casser le mandat par la banque du client.")}</span>
                  <em>{t(MOTIFS[k].auClient)}</em>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.regles}>
          <h2>{t("Les quatre règles que cette page tient")}</h2>
          <ol>
            <li>{t("Rien ne part sans préavis parti. C'est déjà la loi des instructions permanentes, et elle vaut davantage ici : un versement qu'on n'a pas annoncé ne fait que ne pas avoir lieu, un prélèvement qu'on n'a pas annoncé est un débit que le client découvre sur son relevé.")}</li>
            <li>{t("Jamais au-delà du plafond signé. Une échéance qui dépasse n'est pas rognée en silence : elle est écartée, et quelqu'un appelle. Rogner reviendrait à décider du montant à la place du client.")}</li>
            <li>{t("Un tirage remis a trois issues, et la troisième est l'absence des deux autres. « Sans nouvelle » se calcule et ne se range pas : au-delà de {n} jours, la page le dit et Santé le signale.", { n: String(JOURS_SANS_NOUVELLE) })}</li>
            <li>{t("La cause d'un rejet décide de la suite, pas le compte. Une provision insuffisante se représente une fois ; un compte clos ne se représente jamais. Compter sans lire la cause ferait harceler la banque d'un client dont le compte n'existe plus.")}</li>
          </ol>
          <p className={styles.note}>
            {t("Le préavis part {n} jours avant l'échéance : un versement programmé se refuse en un jour, un prélèvement demande d'avoir les fonds sur son compte, et cela ne se fait pas en une nuit.", { n: String(PREAVIS_JOURS) })}
          </p>
        </section>

        {remises.filter((x) => x.state === "remise").length > 0 && (
          <section className="panel">
            <div className="panel-h">
              <h2>{t("Remises passées")}</h2>
              <span className="muted">{t("Une remise ne se refait pas : un second fichier pour le même jour serait un double prélèvement.")}</span>
            </div>
            <div className={styles.pb}>
              <ul className={styles.histo}>
                {remises
                  .filter((x) => x.state === "remise")
                  .slice(0, 12)
                  .map((x) => {
                    const siens = tirages.filter((y) => y.remiseId === x.id);
                    return (
                      <li key={x.id}>
                        <a className="mono" href={`/api/prelevements/${x.dueOn}`} download>
                          {x.ref}
                        </a>
                        <span>{fmtDate(x.dueOn)}</span>
                        <span>{t("{n} tirages", { n: String(siens.length) })}</span>
                        <span>{fmt(siens.reduce((s, y) => s + y.amount, 0))}</span>
                        <span>
                          {siens.filter((y) => y.state === "encaisse").length} {t("encaissés")} · {siens.filter((y) => y.state === "rejete").length} {t("rejetés")}
                        </span>
                        <span>{x.handedBy ?? "—"}</span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </section>
        )}
        <p className={styles.note}>{t("Référence de l'échéance affichée : {r}", { r: refDeLaRemise(dueOn) })}</p>
      </div>
    </>
  );
}
