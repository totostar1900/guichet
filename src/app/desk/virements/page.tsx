import { DeskNav } from "@/components/DeskNav";
import { getT } from "@/i18n/server";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { referenceDeProvision } from "@/lib/domain/cash";
import { anciennete, JOURS_AVANT_ALERTE, resoudreLeMotif } from "@/lib/domain/virement";
import { fmt, fmtDate, fmtDateTime } from "@/lib/format";
import { EnAttente, type AttenteVu } from "./EnAttente";
import { LireLeReleve, type ClientVu } from "./LireLeReleve";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Virements reçus" };

/**
 * LE DOMICILE DES VIREMENTS BANCAIRES ENTRANTS.
 *
 * La banque a répondu non le 9 octobre 2026 : il n'y aura pas de numéro de
 * compte par client. Tous les virements arrivent donc sur un seul compte de
 * règlement, et la seule chose qui rattache un crédit à quelqu'un est le motif
 * que le client a recopié à la main dans le formulaire de sa banque.
 *
 * POURQUOI UNE PAGE À PART, ET NON UN PANNEAU DANS « ENCAISSEMENTS ».
 * Encaissements est la file de ce que les ÉMETTEURS doivent : un coupon a une
 * échéance annoncée, un montant attendu, et son défaut est le retard. Ici rien
 * n'est annoncé : un virement arrive quand le client le décide, pour le montant
 * qu'il veut, et son défaut n'est pas le retard mais l'anonymat. Deux files,
 * deux gestes, deux alertes : les mêler aurait donné une page où la colonne qui
 * décide ne décide qu'une moitié des lignes. Les deux onglets sont voisins,
 * parce que c'est bien le même client qui reçoit.
 *
 * L'APPLICATION NE CONNAÎT QU'UN CÔTÉ, et la page le dit plutôt que de le
 * cacher : aucun lien avec la banque n'existe. Le relevé se colle à la main,
 * et c'est cette moitié qui disparaîtra le jour où GIMACPAY nous parlera. Le
 * contrôle, lui, restera.
 */
export default async function VirementsPage() {
  await requireDesk("/desk/virements");
  const t = await getT();
  const r = repo();
  const [fiches, virements] = await Promise.all([r.listClientFiles(), r.listVirements()]);

  /* La table des références : elle se CALCULE, elle ne se range pas. Une
     référence dérivée de l'identifiant ne peut pas se perdre, et deux écrans
     qui ne se parlent pas la trouvent pareille. */
  const clients: ClientVu[] = fiches
    .map((f) => ({
      userId: f.userId,
      ref: referenceDeProvision(f.userId),
      nom: f.identity.name,
      holder: f.funds.bankHolder ?? f.identity.name,
      banque: f.funds.bankName,
      compte: f.funds.bankAccount,
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const refs = new Map(clients.map((c) => [c.ref, c.userId]));
  const parUser = new Map(clients.map((c) => [c.userId, c]));

  const attente = virements.filter((v) => v.state === "recu");
  const rattaches = virements.filter((v) => v.state === "rattache");
  const restitues = virements.filter((v) => v.state === "restitue");

  /* La file se range par ancienneté, et porte la proposition de la machine :
     « PR-OTLA9M » n'existe pas, nos références n'emploient ni O ni 0, et un
     seul caractère la sépare de PR-NTLA9M. La machine le propose, l'opérateur
     le décide. */
  const file: AttenteVu[] = attente
    .map((v) => {
      const r2 = resoudreLeMotif(v.motif, refs);
      const un = r2.kind === "proche" && r2.candidats.length === 1 ? parUser.get(r2.candidats[0].userId) : undefined;
      return { id: v.id, at: v.at, amount: v.amount, payer: v.payer, motif: v.motif, age: anciennete(v), propose: un ? { userId: un.userId, nom: un.nom, ref: un.ref } : undefined };
    })
    .sort((a, b) => b.age - a.age || b.amount - a.amount);

  const mois = new Date().toISOString().slice(0, 7);
  const duMois = rattaches.filter((v) => v.at.startsWith(mois));
  const vieux = file.filter((v) => v.age > JOURS_AVANT_ALERTE).length;

  return (
    <>
      <DeskNav current="/desk/virements" badges={{ "/desk/virements": attente.length }} />
      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <h1>{t("Virements reçus")}</h1>
            <p className="muted">
              {t(
                "Sans numéro de compte par client, un virement entrant n'est rattachable que par le motif que le client y a écrit. Cette page lit le relevé, propose un client pour chaque crédit, et attend une confirmation. Elle est aussi le registre de ce qui est arrivé sans nom.",
              )}
            </p>
          </div>
        </header>

        <div className={styles.band}>
          <div>
            <span>{t("Rattachés ce mois")}</span>
            <b>{fmt(duMois.reduce((s, v) => s + v.amount, 0))}</b>
          </div>
          <div>
            <span>{t("Nombre de virements")}</span>
            <b>{duMois.length}</b>
          </div>
          <div>
            <span>{t("En attente d'un nom")}</span>
            <b className={attente.length ? styles.warn : undefined}>{attente.length}</b>
          </div>
          <div>
            <span>{t("Au-delà de {n} jours", { n: String(JOURS_AVANT_ALERTE) })}</span>
            <b className={vieux ? styles.crit : undefined}>{vieux}</b>
          </div>
          <div>
            <span>{t("Restitués")}</span>
            <b>{restitues.length}</b>
          </div>
        </div>

        <LireLeReleve clients={clients} dejaLues={virements.map((v) => v.fingerprint)} />

        <section className="panel">
          <div className="panel-h">
            <h2>{t("En attente, sans nom")}</h2>
            <span className="muted">{t("Rangés par ancienneté : c'est l'âge qui appelle quelqu'un, pas le montant.")}</span>
          </div>
          <div className={styles.pb}>
            <EnAttente file={file} clients={clients} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Rattachés récemment")}</h2>
            <span className="muted">{t("Un rattachement ne se défait pas : une erreur se répare par un mouvement inverse au journal du client.")}</span>
          </div>
          <div className={styles.pb}>
            {rattaches.length === 0 ? (
              <p className={styles.vide}>{t("Aucun virement rattaché pour l'instant.")}</p>
            ) : (
              <ul className={styles.histo}>
                {rattaches.slice(0, 20).map((v) => (
                  <li key={v.id}>
                    <span className={styles.hQuand}>{v.closedAt ? fmtDateTime(v.closedAt) : fmtDate(v.at)}</span>
                    <span className={styles.hQui}>{parUser.get(v.userId ?? "")?.nom ?? v.userId}</span>
                    <span className={styles.hMontant}>{fmt(v.amount)}</span>
                    <span className={styles.hMotif}>{v.motif ?? "—"}</span>
                    <span className={styles.hPar}>{v.closedBy ?? v.readBy ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {restitues.length > 0 && (
          <section className="panel">
            <div className="panel-h">
              <h2>{t("Restitués")}</h2>
              <span className="muted">{t("Le virement de retour se fait en banque ; la ligne garde son motif.")}</span>
            </div>
            <div className={styles.pb}>
              <ul className={styles.histo}>
                {restitues.slice(0, 20).map((v) => (
                  <li key={v.id}>
                    <span className={styles.hQuand}>{v.closedAt ? fmtDateTime(v.closedAt) : fmtDate(v.at)}</span>
                    <span className={styles.hQui}>{v.payer}</span>
                    <span className={styles.hMontant}>{fmt(v.amount)}</span>
                    <span className={styles.hMotif}>{v.closedReason}</span>
                    <span className={styles.hPar}>{v.closedBy ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className={styles.regles}>
          <h2>{t("Les quatre règles que cette page tient")}</h2>
          <ol>
            <li>{t("Un crédit est un fait, un rattachement est une décision. La ligne du relevé existe dès sa lecture, même sans nom : sans cela, l'argent arrivé sans nom n'existerait nulle part et personne ne saurait qu'il attend.")}</li>
            <li>{t("La machine lit, une personne confirme. Une référence exacte avec un intitulé concordant se rattache d'un geste ; tout le reste se montre et attend.")}</li>
            <li>{t("Les fonds d'un tiers se refusent et se restituent, c'est l'article 3 de la convention. La page compare donc toujours le donneur d'ordre à l'intitulé déclaré, et c'est le seul contrôle qu'elle fasse d'office.")}</li>
            <li>{t("Une ligne de relevé ne s'inscrit qu'une fois. L'empreinte est unique en base : un relevé relu ne crée pas un double crédit, et c'est l'erreur que personne ne verrait passer.")}</li>
          </ol>
        </section>
      </div>
    </>
  );
}
