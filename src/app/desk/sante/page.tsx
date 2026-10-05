import Link from "next/link";
import { cadence, etatDesRobots, prochainTour, robotsAVoir } from "@/lib/domain/robots";
import { DeskNav } from "@/components/DeskNav";
import { ARRIERE_PAR_TOUR, bulletinsToReread, healthChecks, lineIssues, REREAD_BATCH } from "@/lib/health";
import { HEALTH_HOW } from "@/lib/health-how";
import { repo } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";
import { backfillLastTradedAction, lancerArriereAction, rereadAction, withdrawLineAction } from "./actions";
import { Reread } from "./Reread";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Santé du système" };

/** The target page's address with « depuis=sante&point=… » before any #anchor. */
function fromSante(href: string, key: string): string {
  const [path, hash] = href.split("#");
  return `${path}${path.includes("?") ? "&" : "?"}depuis=sante&point=${key}${hash ? `#${hash}` : ""}`;
}

const LEVEL: Record<string, string> = { ok: "OK", warn: "À surveiller", crit: "Action requise" };
const KIND_LABEL: Record<string, string> = { sortie: "Sortie de cote", absente: "Non publiée", prix: "Cours", date: "Date", instrument: "Instrument", doublon: "Doublon" };

export default async function SantePage() {
  const t = await getT();
  const [checks, bulletins, notifications, arriere, ecarts, offers, tours] = await Promise.all([
    healthChecks(),
    repo().listBulletins(12),
    repo().listNotifications(40),
    bulletinsToReread(),
    lineIssues(),
    repo().listOffers(),
    repo().listTours(200).catch(() => []),
  ]);
  /* Un robot muet ressemble à un robot sans travail : c'est l'absence de tour
     qui se voit ici, jamais sa présence. */
  const robots = etatDesRobots(tours);
  const aVoir = robotsAVoir(robots);
  /* Une seule heure pour tout le tableau : deux appels a new Date() dans la
     meme page feraient deux « prochain tour » a la seconde pres differents. */
  const maintenant = new Date();
  /* LE MOT « UTC » NE PARAIT QUE QUAND IL MANQUE. La frequence vient de
     l'expression cron et reste en UTC ; les deux colonnes voisines passent par
     fmtDateTime, qui lit l'horloge du serveur. Sur Vercel c'est UTC et les
     trois s'accordent, donc rien a ajouter. Sur une machine de developpement
     (UTC+3 ici, mesure le 6 octobre 2026) l'ecart saute aux yeux et se lit
     comme une panne : le mot le reduit a ce qu'il est. */
  const serveurEnUTC = maintenant.getTimezoneOffset() === 0;
  const JOURS = [t("dimanche"), t("lundi"), t("mardi"), t("mercredi"), t("jeudi"), t("vendredi"), t("samedi")];
  /**
   * La phrase de la cadence, composee ici et nulle part ailleurs.
   *
   * Les clefs sont ecrites en clair : le script qui cherche les traductions
   * manquantes ne voit pas un t(variable), et c'est l'angle mort qui a deja
   * coute deux passages.
   */
  const phraseCadence = (cron: string): string => {
    let c;
    try {
      c = cadence(cron);
    } catch {
      // Plutot l'expression nue qu'une page de desk blanche.
      return cron;
    }
    const h = c.heure;
    switch (c.quand) {
      case "quotidien":
        return t("chaque jour à {h}", { h });
      case "ouvre":
        return t("chaque jour ouvré à {h}", { h });
      case "hebdo":
        return t("chaque {jour} à {h}", { jour: JOURS[c.jour], h });
      case "mensuel":
        return t("le {j} de chaque mois à {h}", { j: String(c.jourDuMois), h });
      case "trimestriel":
        return t("le {j} du premier mois de chaque trimestre à {h}", { j: String(c.jourDuMois), h });
      default:
        return cron;
    }
  };
  /**
   * Le prochain depart, et dans combien de temps : la date seule se compte mal.
   *
   * LE PIEGE DU FUSEAU, mesure le 6 octobre 2026. `fmtDateTime` lit l'heure
   * locale du serveur : UTC sur Vercel, East Africa Time sur la machine de
   * developpement. En production les trois colonnes s'accordent donc, et la
   * phrase en tete du tableau dit vrai. En local la colonne « Frequence »,
   * qui vient de l'expression cron et reste en UTC, decale de trois heures des
   * deux autres. Ce n'est pas une panne : c'est la page de demonstration qui
   * tourne sur une horloge que Vercel n'a pas.
   *
   * Le delai relatif, lui, ne depend d'aucun fuseau : c'est une difference.
   */
  const prochain = (cron: string): { quand: string; dans: string } | undefined => {
    try {
      const d = prochainTour(cron, maintenant);
      const heures = (d.getTime() - maintenant.getTime()) / 3_600_000;
      const dans = heures < 1 ? t("dans moins d'une heure") : heures < 24 ? t("dans {n} heures", { n: Math.round(heures) }) : t("dans {n} jours", { n: Math.round(heures / 24) });
      return { quand: fmtDateTime(d.toISOString()), dans };
    } catch {
      return undefined;
    }
  };
  // Le dernier échange d'une ligne n'est retenu que depuis peu : celles qui
  // n'ont pas traité depuis le sont muettes tant que les cotes déjà lues n'ont
  // pas été reprises. Le bouton ne paraît que tant qu'il reste du travail.
  const sansEchange = offers.filter((o) => o.kind === "MARCHE" && o.isin && !o.hidden && !o.lastTradedOn);
  const worst = checks.some((c) => c.level === "crit") ? "crit" : checks.some((c) => c.level === "warn") ? "warn" : "ok";
  return (
    <>
      <DeskNav current="/desk/sante" />

      <div className={styles.head}>
        <div>
          <h1>{t("Santé du système")}</h1>
          <p className="muted">{t("Ce que la machine fait toute seule : et ce qui attend le desk. Vérifié à chaque passage du cron du soir ; un e-mail part au desk quand un point passe en rouge.")}</p>
        </div>
        <span className={`${styles.badge} ${styles[worst]}`}>{LEVEL[worst]}</span>
      </div>

      <div className={styles.grid}>
        {checks.map((c) => {
          const how = HEALTH_HOW[c.key];
          const act = c.level !== "ok" && how;
          const inner = (
            <>
              <span className={styles.label}>{t(c.label)}</span>
              <b>{t(c.value)}</b>
              {c.detail && <small>{t(c.detail)}</small>}
              {act && <span className={styles.go}>{t("Traiter")} →</span>}
            </>
          );
          return act ? (
            <Link key={c.key} className={`${styles.check} ${styles[c.level]} ${styles.act}`} href={fromSante(how.href, c.key)} title={t(how.how)}>
              {inner}
            </Link>
          ) : (
            <div key={c.key} className={`${styles.check} ${styles[c.level]}`}>
              {inner}
            </div>
          );
        })}
      </div>

      <section className="panel" id="robots">
        <div className="panel-h">
          <h2>{t("Les robots")}</h2>
          <span className="muted">
            {aVoir.length
              ? t("{n} robot(s) à regarder : muet depuis plus que sa cadence, ou en échec.", { n: aVoir.length })
              : t("Tous ont tourné dans leur cadence. Un tour laisse sa ligne même quand il n'a rien fait : c'est l'absence qui se voit.")}
          </span>
        </div>
        {/* LE FUSEAU SE DIT UNE FOIS, ET NON DANS CHAQUE CELLULE. L'ordonnanceur
            de Vercel travaille en UTC et la colonne « Dernier tour » l'est deja :
            melanger deux fuseaux dans une meme ligne couterait plus cher qu'une
            phrase a lire une fois. */}
        <p className={styles.p}>
          {t("Les heures sont en UTC, comme l'ordonnanceur : Yaoundé est à UTC+1, donc une heure de plus que ce qui est écrit ici. Un robot qui se tait au-delà de sa tolérance passe en « muet » : la tolérance vaut environ deux passages, pour qu'un ordonnanceur en retard de cinq minutes ne crie pas tous les matins.")}
        </p>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Robot")}</th>
                <th>{t("Ce qu'il fait")}</th>
                <th>{t("Fréquence")}</th>
                <th>{t("Prochain tour")}</th>
                <th>{t("Dernier tour")}</th>
                <th>{t("État")}</th>
              </tr>
            </thead>
            <tbody>
              {robots.map((r) => (
                <tr key={r.cle}>
                  <td className="mono">{r.cle}</td>
                  <td className="muted">{t(r.quoi)}</td>
                  {/* L'expression nue reste sous le curseur : c'est elle que
                      l'ordonnanceur execute, la phrase n'en est que la lecture. */}
                  <td title={r.cron}>
                    {phraseCadence(r.cron)}
                    {serveurEnUTC ? null : <small className="muted"> UTC</small>}
                  </td>
                  <td>
                    {(() => {
                      const n = prochain(r.cron);
                      if (!n) return <span className="muted">—</span>;
                      return (
                        <>
                          {n.quand}
                          <small className={styles.sous}>{n.dans}</small>
                        </>
                      );
                    })()}
                  </td>
                  <td>
                    {r.dernier ? fmtDateTime(r.dernier.startedAt) : <span className="muted">{t("jamais")}</span>}
                    {/* Un tour à la main se montre et ne prouve rien : il ne dit
                        pas que l'ordonnanceur vit. */}
                    {r.dernier?.par === "main" && <small className="muted"> {t("à la main")}</small>}
                  </td>
                  <td>
                    {/* Muet et échoué ne se réparent pas pareil : l'un demande de
                        regarder l'ordonnanceur, l'autre le code. */}
                    {r.etat === "muet" ? (
                      <span className="st annulee">{t("muet depuis plus de {n} heures", { n: r.heures })}</span>
                    ) : r.etat === "echoue" ? (
                      <span className="st annulee">{r.dernier?.error ?? t("échec")}</span>
                    ) : (
                      <span className="st reglee">{t("tourne dans sa cadence")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {ecarts.length > 0 && (
        <section className="panel" id="lignes">
          <div className="panel-h">
            <h2>{t("Lignes et bulletin")}</h2>
            <span className="muted">{t("{n} écart entre ce que le Guichet publie et ce que le bulletin cote.", { n: ecarts.length })}</span>
          </div>
          <p className={styles.p}>
            {t("Une ligne sortie de la cote dont l'échéance est passée se clôture seule à la lecture du bulletin : elle cesse d'être commandable, sa page reste consultable, et rien n'est dit au client sur la raison. Celles dont l'échéance est inconnue ou estimée attendent une décision. Le bulletin dit ce qui se cote, pas ce qui a été payé : quand des clients détiennent encore la ligne, le remboursement se vérifie auprès du dépositaire avant tout, et l'avis de remboursement est ce qui l'atteste. Un cours ou un instrument qui diffère du bulletin est un défaut de lecture, pas une décision : relancer la lecture de la séance.")}
          </p>
          <div className="scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Écart")}</th>
                  <th>ISIN</th>
                  <th>{t("Ligne")}</th>
                  <th>{t("Ce que dit le bulletin")}</th>
                  <th className="r">{t("Porteurs")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ecarts.map((e, i) => (
                  <tr key={`${e.kind}-${e.isin}-${i}`}>
                    <td>
                      <span className={`st ${e.kind === "sortie" ? "recue" : "annulee"}`}>{t(KIND_LABEL[e.kind])}</span>
                    </td>
                    <td className="mono">{e.isin}</td>
                    <td>{e.title}</td>
                    <td className="muted">{t(e.detail)}</td>
                    <td className="r num">
                      {e.holders ? (
                        <b title={t("Des clients détiennent encore cette ligne : le remboursement se vérifie auprès du dépositaire avant toute chose.")}>{e.holders}</b>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="r">
                      {e.kind === "sortie" && e.offerId ? <Reread action={withdrawLineAction} label={t("Clôturer")} date={undefined} offerId={e.offerId} /> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {sansEchange.length > 0 && (
        <section className="panel" id="echanges">
          <div className="panel-h">
            <h2>{t("Dernier échange à retrouver")}</h2>
            <span className="muted">{t("{n} lignes cotées sans date de dernier échange.", { n: String(sansEchange.length) })}</span>
          </div>
          <p className={styles.p}>
            {t("Le bulletin cote chaque ligne à chaque séance, qu'elle ait traité ou non : la date du dernier échange est ce qui dit à un client si son ordre a une chance d'être servi. Elle se retrouve dans les cotes déjà en base, il n'y a rien à retélécharger.")}
          </p>
          <div className={styles.actions}>
            <Reread action={backfillLastTradedAction} label={t("Retrouver dans les cotes")} primary />
            <Link className="btn sm ghost" href="/desk/marche">
              {t("Marché")} →
            </Link>
          </div>
        </section>
      )}

      {arriere.length > 0 && (
        <section className="panel" id="relire">
          <div className="panel-h">
            {/* LE TITRE NOMME SA SOURCE. « Bulletins » tout court laissait
                trois lectures possibles sur cette page : le bulletin de la cote,
                les avis d'emission de la BEAC, les rapports hebdomadaires. */}
            <h2>{t("Bulletins de la BVMAC à relire")}</h2>
            <span className="muted">
              {t("{n} séances du bulletin officiel de la cote (BOC) lues à moitié : le lecteur les a marquées au moment même, elles attendent une relecture.", { n: arriere.length })}
            </span>
          </div>
          <p className={styles.p}>
            {t("« Relire » reprend le PDF de la séance à l'adresse gardée avec elle et le repasse au lecteur d'aujourd'hui. Chaque cotation retrouvée écrase celle de la même ligne pour la même séance ; celles qu'il ne retrouve pas restent en place, donc une relecture ajoute ou corrige et ne retire jamais. Le geste se répète sans risque : une séance ne gagne des cours que le jour où le lecteur progresse. Une séance sans cours d'action fausse la lecture de l'indice, c'est elle qu'il faut reprendre en premier.")}
          </p>
          {/* POURQUOI SIX, ET NON TOUT. La question se pose devant le bouton, donc
              la reponse vit a cote de lui. Quatre secondes par bulletin, mesurees :
              une action de page doit repondre dans le delai de la fonction, et la
              serie entiere se compte en dizaines de minutes. */}
          <p className={styles.p}>
            {t("Une passe reprend {n} séances, les moins récemment reprises de la liste : la file tourne, et une séance qui ne s'améliore pas ne bloque plus les autres. {n} et non toutes, parce qu'un bulletin demande environ quatre secondes et qu'un bouton de page doit répondre avant le délai de la fonction.", { n: String(REREAD_BATCH) })}
          </p>
          {/* DEUX GESTES, ET ILS NE SE RESSEMBLENT PAS. Le premier travaille
              devant vous et dit ce qu'il a changé ; le second part et ne revient
              pas, c'est le compte en attente qui répondra. */}
          <p className={styles.p}>
            {t("« Confier au robot » ne fait pas le travail ici : il envoie la liste au robot de lecture, qui dispose de trois cents secondes par tour là où un bouton de page n'en a que quelques-unes. Il part avec {k} séances et rend la main aussitôt, sans rien afficher de plus. Revenez sur cette page dans quelques minutes : c'est le nombre de séances en attente, en tête de ce cadre, qui dira où il en est. Le tour s'inscrit au registre des robots comme un tour lancé à la main, donc il n'éteint aucune alarme.", { k: String(ARRIERE_PAR_TOUR) })}
          </p>
          {/* DEUX MOTS QUI NE SE DEVINENT PAS. Ils sortent du lecteur et
              designent deux pannes qui ne se reparent pas pareil : l'une laisse
              la seance a moitie en base, l'autre n'y laisse rien. */}
          <p className={styles.p}>
            {t("« partiel » : le bulletin a été lu, et le contrôle a relevé quelque chose. Une section plus courte que la veille, un cours hors de ses seuils, une ligne présente hier et absente aujourd'hui. Ce qui a été lu est en base, le reste manque.")}
            <br />
            {t("« échec » : l'en-tête du PDF n'a pas été reconnu, donc le numéro du bulletin non plus. Aucun cours de cette séance n'est entré : elle est entièrement à reprendre.")}
          </p>
          {/* CE QUE DEVIENT LA LIGNE. On regarde un tableau d'attente sans
              savoir ce qui fait sortir d'une file : la reponse tient en deux
              phrases, et sans elles on reclique sur la meme seance. */}
          <p className={styles.p}>
            {t("Après la passe, une séance qui repasse en « ok » quitte ce tableau : elle rejoint les bulletins ordinaires, ses cours alimentent l'indice et les fiches comme les autres. Une séance qui n'a rien gagné reste ici, et passe en queue de file : la liste tourne, et les suivantes sont servies avant qu'on ne revienne sur elle.")}
          </p>
          <div className={styles.actions}>
            <Reread action={rereadAction} label={t("Relire {n} séances", { n: String(REREAD_BATCH) })} primary />
            <Reread action={lancerArriereAction} label={t("Confier {k} séances au robot", { k: String(Math.min(ARRIERE_PAR_TOUR, arriere.length)) })} />
            <Link className="btn sm ghost" href="/desk/marche">
              {t("Marché")} →
            </Link>
          </div>
          <div className="scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Séance")}</th>
                  <th>N°</th>
                  <th>{t("État")}</th>
                  <th className="r">{t("Actions")}</th>
                  <th>{t("Ce que le lecteur a dit")}</th>
                  <th>{t("Source")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {arriere.slice(0, 30).map((b) => (
                  <tr key={b.id}>
                    <td className="mono">{b.sessionDate}</td>
                    <td className="mono">{b.number}</td>
                    <td>
                      <span className={`st ${b.status === "partiel" ? "recue" : "annulee"}`}>{t(b.status)}</span>
                    </td>
                    <td className="r num">{b.counts?.equities ?? 0}</td>
                    <td className="muted">{(b.anomalies[0] ?? b.warnings[0] ?? "—").slice(0, 90)}</td>
                    {/* Le document que le lecteur a lu : sans lui, verifier une
                        anomalie voulait dire retrouver la seance a la main sur
                        le site de la bourse. */}
                    <td>
                      {b.sourceUrl?.startsWith("http") ? (
                        <a href={b.sourceUrl} target="_blank" rel="noreferrer">
                          {t("PDF")}
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="r">
                      <Reread action={rereadAction} label={t("Relire")} date={b.sessionDate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {arriere.length > 30 && (
            <p className="muted">{t("… et {n} autres, reprises {k} par {k}.", { n: arriere.length - 30, k: String(REREAD_BATCH) })}</p>
          )}
        </section>
      )}

      <div className={styles.cols}>
        <div className="panel">
          <div className="panel-h">
            <h2>{t("Derniers bulletins")}</h2>
            <Link className="btn sm" href="/desk/marche">
              {t("Marché")}
            </Link>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Séance")}</th>
                <th>N°</th>
                <th>{t("État")}</th>
                <th className="r">{t("Actions")}</th>
                <th className="r">{t("Oblig.")}</th>
                <th className="r">{t("OPCVM")}</th>
                <th>{t("Ingéré")}</th>
                <th>{t("Source")}</th>
              </tr>
            </thead>
            <tbody>
              {bulletins.map((b) => (
                <tr key={b.id}>
                  <td className="mono">{b.sessionDate}</td>
                  <td className="mono">{b.number}</td>
                  <td>
                    <span className={`st ${b.status === "ok" ? "confirmee" : b.status === "partiel" ? "recue" : "annulee"}`}>{t(b.status)}</span>
                  </td>
                  <td className="r num">{b.counts.equities}</td>
                  <td className="r num">{b.counts.bonds}</td>
                  <td className="r num">{b.counts.funds}</td>
                  <td className="muted">
                    {fmtDateTime(b.ingestedAt)} · {b.ingestedBy}
                  </td>
                  <td>
                    {b.sourceUrl?.startsWith("http") ? (
                      <a href={b.sourceUrl} target="_blank" rel="noreferrer">
                        {t("PDF")}
                      </a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="panel-h">
            <h2>{t("Derniers messages")}</h2>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Quand")}</th>
                <th>{t("Canal")}</th>
                <th>À</th>
                <th>{t("Objet")}</th>
                <th>{t("État")}</th>
              </tr>
            </thead>
            <tbody>
              {notifications.slice(0, 15).map((n) => (
                <tr key={n.id}>
                  <td className="muted">{fmtDateTime(n.createdAt)}</td>
                  <td>{n.channel}</td>
                  <td>{n.contactName ?? n.to}</td>
                  <td className="muted">{n.subject ?? n.kind}</td>
                  <td>
                    <span className={`st ${n.status === "sent" ? "confirmee" : n.status === "failed" ? "annulee" : "recue"}`}>{n.status}</span>
                    {n.error && <small className="muted"> {n.error}</small>}
                  </td>
                </tr>
              ))}
              {notifications.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    {t("Aucun message préparé pour l'instant.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
