import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import { readSource } from "@/lib/intake/storage";
import { bocUrl, bondQuote, equityQuote, fetchBoc, fundNav, pdfText, validate } from "@/lib/market/boc";
import { parseBoc } from "@/lib/market/boc-parse";
import { classer, codes as codesDe, famille, remarques } from "@/lib/market/remarques";
import { comparer, juger, verdict, type Ecart } from "@/lib/market/comparer";
import { fmtDateTime } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";
import { couvre, jugementVivant } from "@/lib/domain/jugement-bulletin";
import { Juger } from "./Juger";

/**
 * Depuis quand la bourse publie ce que ces familles réclament.
 *
 * TROIS FAMILLES NE SONT PAS DES DÉFAUTS DE LECTURE : elles reprochent au
 * passé de ne pas être le présent. Mesuré le 11 octobre 2026 : 112 séances
 * sur 112 pour l'indice, 59 sur 59 et 58 sur 58 pour la table OPCVM, zéro
 * après la borne. Les proposer d'un coup est le seul moyen de fermer 229
 * remarques sans demander 229 gestes.
 */
const DEPUIS_QUE_LA_BOURSE_PUBLIE: Record<string, string> = { A: "2023-12-11", B: "2023-08-03", C: "2023-08-03" };


/**
 * LE RAPPORT D'UNE SÉANCE, PRODUIT À LA DEMANDE.
 *
 * Rien n'est stocké pour lui : les 808 séances gardent l'adresse de leur PDF,
 * donc la page le reprend, le repasse au lecteur et rend le diagnostic entier,
 * ligne fautive comprise. Stocker un rapport aurait coûté une colonne et une
 * migration pour un document qu'on ouvre une fois par mois.
 *
 * ET C'EST MIEUX QUE DE STOCKER, pour une raison qui n'est pas la place. Un
 * rapport produit aujourd'hui montre ce que le lecteur D'AUJOURD'HUI ferait,
 * non ce qu'un lecteur de 2023 avait fait. Quand les deux diffèrent, la séance
 * a quelque chose à gagner à être relue : le rapport est l'essai à blanc qui
 * dit si la relecture vaut la peine, et il évite de reprendre pour rien les
 * deux cent quatre-vingt-sept séances que la nuit du 6 octobre 2026 a reprises
 * six fois sans leur faire gagner un seul cours.
 *
 * NOTRE COPIE D'ABORD, la bourse ensuite : cent quatre séances sont archivées
 * chez nous, et les relire ne coûte rien à personne. Pour les autres on
 * redescend le document, une fois, à l'ouverture du rapport.
 *
 * LE CORPS DU RAPPORT, partagé par la page et par le tiroir.
 *
 * Les deux chemins rendent exactement la même chose : une copie aurait
 * dérivé au premier changement, et c'est la page qu'on aurait oubliée.
 */
export async function Rapport({ seance }: { seance: string }) {
  const t = await getT();

  const r = repo();
  const bulletins = await r.listBulletins(2000);
  const b = bulletins.find((x) => x.sessionDate === seance);
  if (!b) notFound();

  /* Le PDF : notre copie si nous l'avons, sinon la bourse. Un échec ici n'est
     pas une panne de la page : c'est un fait du rapport, et il se dit. */
  let bytes: Uint8Array | undefined;
  let provenance: "copie" | "bourse" | undefined;
  let panne: string | undefined;
  try {
    if (b.fileKey) {
      bytes = await readSource(b.fileKey);
      provenance = "copie";
    }
  } catch {
    bytes = undefined;
  }
  if (!bytes) {
    try {
      const got = await fetchBoc(seance);
      if (got) {
        bytes = got.bytes;
        provenance = "bourse";
      } else panne = t("La bourse ne sert plus ce document : elle répond « introuvable ».");
    } catch (e) {
      panne = e instanceof Error ? e.message : t("Document injoignable.");
    }
  }

  /* La relecture à blanc. Elle n'écrit rien : ni cotation, ni statut, ni date
     de lecture. Le bulletin en base n'est pas touché par l'ouverture d'un
     rapport, et c'est ce qui permet de l'ouvrir sans y penser. */
  let frais: { actions: number; obligations: number; opcvm: number; lignesOpcvm: number; indice?: number; anomalies: string[]; notes: ReturnType<typeof parseBoc>["notes"] } | undefined;
  if (bytes) {
    try {
      const parsed = parseBoc(await pdfText(bytes));
      const quotes = [...parsed.equities.map((e) => equityQuote(e, parsed)), ...parsed.bonds.map((o) => bondQuote(o, parsed))];
      const navs = parsed.funds.map((f) => fundNav(f, parsed));
      const avant = bulletins.filter((x) => x.sessionDate < seance).sort((x, y) => y.sessionDate.localeCompare(x.sessionDate))[0];
      const precedentes = avant ? await r.quotesOn(avant.sessionDate).catch(() => []) : [];
      frais = {
        actions: parsed.equities.length,
        obligations: parsed.bonds.length,
        opcvm: parsed.funds.length,
        /* LE BULLETIN IMPRIME PLUS DE LIGNES QU'IL N'Y A DE FONDS, et le
           compter sans le dire a coûté une enquête : le 11 décembre 2023 il
           porte 51 lignes pour 31 fonds. La table des OPCVM est publiée
           quatre fois, par période de variation, et un fonds hebdomadaire
           reparaît au mensuel puis au trimestriel avec la même valeur
           liquidative et une comparaison plus lointaine. Le lecteur ne le
           compte qu'une fois et range les deux variations sur lui, donc rien
           n'est perdu, mais un nombre qui ne dit pas ce qu'il compte invite
           à croire à une perte. */
        lignesOpcvm: parsed.funds.length + parsed.funds.filter((f) => f.variationMonthlyPct !== undefined).length + parsed.funds.filter((f) => f.variationQuarterlyPct !== undefined).length,
        indice: parsed.index?.value,
        anomalies: validate(parsed, quotes, navs, precedentes, avant?.counts?.funds ?? 0),
        notes: parsed.notes,
      };
    } catch (e) {
      panne = e instanceof Error ? e.message : t("Lecture impossible.");
    }
  }

  /* LA COMPARAISON AVEC LA VEILLE.

     Le desk ouvre un rapport parce que la séance a quelque chose, et le
     tableau lui dit « 17 obligations au lieu de 29 » sans dire LESQUELLES.
     Surtout, il ne dit pas si elles sont sorties de la cote ou si le lecteur
     les a ratées : seule la suite de la série tranche, et c'est une requête
     par ligne partie, soit une à trois par couple. */
  const avant = bulletins.filter((x) => x.sessionDate < seance).sort((x, y) => y.sessionDate.localeCompare(x.sessionDate))[0];
  let ecart: Ecart | undefined;
  if (avant) {
    const [ca, cb] = await Promise.all([r.quotesOn(avant.sessionDate).catch(() => []), r.quotesOn(seance).catch(() => [])]);
    if (ca.length || cb.length) {
      ecart = comparer(ca, cb);
      /* Le jugement vit dans le module, parce que le comparateur de la page
         des bulletins le demande mot pour mot : une règle écrite deux fois
         finit par diverger. */
      await juger(ecart, seance, (isin) => r.listQuotes(isin, 2000).catch(() => []));
    }
  }
  const dit = ecart ? verdict(ecart) : undefined;
  const passageres = ecart?.partis.filter((x) => x.retour) ?? [];
  const durables = ecart?.partis.filter((x) => !x.retour) ?? [];

  const enBase = remarques(b);
  /* LES NOTES DE LA LECTURE ENREGISTRÉE D'ABORD, celles de l'essai à blanc
     ensuite. Les premières sont ce que la base garde depuis le 11 octobre
     2026 ; les secondes n'existent que le temps d'une ouverture de page, et
     une séance lue avant cette date n'a que celles-là. */
  const notes = b.notes?.length ? b.notes : (frais?.notes ?? []);
  const jugements = await r.listJugementsBulletin().catch(() => []);
  /* CE QUE LE LECTEUR D'AUJOURD'HUI DIT ENCORE, et ce qu'il ne dit plus.
     Les remarques affichées venaient de la base, donc de la PREMIÈRE lecture
     de la séance. Sur le bulletin du 22 décembre 2023, cinq des six
     avertissements n'étaient plus vrais depuis des mois : le desk était invité
     à répondre à six questions dont une seule tenait encore. Une question
     périmée coûte deux fois, en travail et en confiance. */
  const fraiches = frais ? new Set([...frais.anomalies, ...frais.notes.map((n) => n.message)]) : undefined;
  const perimee = (texte: string) => fraiches != null && !fraiches.has(texte);
  const combienPerimees = [...(b.anomalies ?? []), ...(b.warnings ?? [])].filter(perimee).length;
  const statutFrais = frais ? (frais.anomalies.length || frais.notes.length ? "partiel" : "ok") : undefined;
  /* Le seul chiffre qui décide : le lecteur d'aujourd'hui ferait-il mieux ? */
  const gagnerait = frais ? frais.actions > (b.counts?.equities ?? 0) || frais.obligations > (b.counts?.bonds ?? 0) || frais.opcvm > (b.counts?.funds ?? 0) : false;

  const ligne = (nom: string, base: number, neuf?: number) => (
    <div className={styles.chiffre}>
      <span>{nom}</span>
      <b>{base}</b>
      {neuf != null && neuf !== base ? <em className={neuf > base ? styles.mieux : styles.moins}>{neuf > base ? `+${neuf - base}` : `${neuf - base}`}</em> : null}
    </div>
  );

  return (
    <>
      {panne && (
        <section className="panel">
          <div className="panel-h">
            <h2>{t("Le document n'a pas pu être repris")}</h2>
          </div>
          <p className={styles.p}>{panne}</p>
          <p className={styles.p}>
            {t("Ce qui suit vient donc de la base, telle que la dernière lecture l'a laissée.")}{" "}
            <a href={b.sourceUrl?.startsWith("http") ? b.sourceUrl : bocUrl(seance)} target="_blank" rel="noreferrer">
              {t("Essayer le document chez la bourse")}
            </a>
          </p>
        </section>
      )}

      <section className="panel">
        <div className="panel-h">
          <h2>{t("Ce qui est en base")}</h2>
          <span className="muted">
            {t("lu le {d} par {q}", { d: fmtDateTime(b.ingestedAt), q: b.ingestedBy })}
            {frais ? ` · ${t("relu à blanc à l'instant, depuis {o}", { o: provenance === "copie" ? t("notre copie") : t("la bourse") })}` : ""}
          </span>
        </div>
        <div className={styles.chiffres}>
          {ligne(t("Actions"), b.counts?.equities ?? 0, frais?.actions)}
          {ligne(t("Obligations"), b.counts?.bonds ?? 0, frais?.obligations)}
          {ligne(t("OPCVM"), b.counts?.funds ?? 0, frais?.opcvm)}
          {/* Le nombre dit ce qu'il compte : des fonds, pas des lignes. */}
          {frais && frais.lignesOpcvm > frais.opcvm ? (
            <div className={styles.chiffre}>
              <span>{t("dont lignes imprimées")}</span>
              <b>{frais.lignesOpcvm}</b>
              <em className={styles.muetNote}>{t("{n} répétées aux tables mensuelle et trimestrielle", { n: frais.lignesOpcvm - frais.opcvm })}</em>
            </div>
          ) : null}
          <div className={styles.chiffre}>
            <span>{t("État")}</span>
            <b className={`st ${b.status === "ok" ? "confirmee" : b.status === "partiel" ? "recue" : "annulee"}`}>{t(b.status)}</b>
            {statutFrais && statutFrais !== b.status ? <em className={statutFrais === "ok" ? styles.mieux : styles.moins}>→ {t(statutFrais)}</em> : null}
          </div>
        </div>

        {/* LE VERDICT DE L'ESSAI À BLANC. C'est la seule phrase que le desk
            vient vraiment chercher : faut-il relire cette séance ? */}
        {frais && (
          <p className={gagnerait ? styles.verdictOui : styles.verdictNon}>
            {gagnerait
              ? t("Le lecteur d'aujourd'hui lit plus de lignes que la base n'en garde : relire cette séance lui ferait gagner quelque chose.")
              : t("Le lecteur d'aujourd'hui ne lit pas une ligne de plus que la base. La relire ne changerait rien : seule une correction du lecteur le pourrait.")}
          </p>
        )}
      </section>

      <section className="panel">
        <div className="panel-h">
          <h2>{t("{n} remarques, telles que la base les garde", { n: enBase.length })}</h2>
          {combienPerimees > 0 && <span className="muted">{t("{n} que le lecteur d'aujourd'hui ne dit plus", { n: combienPerimees })}</span>}
        </div>
        {enBase.length === 0 ? (
          <p className={styles.p}>{t("Aucune : la séance est entrée entière.")}</p>
        ) : (
          <div className={styles.remarques}>
            {enBase.map((x, i) => {
              const f = famille(x.code);
              /* La note porte la page : « il est en page 3 » ne se dit pas
                 sans elle, et c'est elle qui fait d'une plainte une question. */
              const note = notes.find((n) => n.message === x.texte);
              /* Un jugement qui ferme couvre la remarque ; une indication au
                 lecteur ne la couvre pas, et c'est voulu. On cherche donc le
                 geste par la cible, pas par la couverture. */
              const vu = jugements.find((j) => jugementVivant(j) && j.portee === "seance" && j.seance === seance && j.cible === x.texte) ?? jugements.find((j) => couvre(j, seance, x.texte, classer));
              const vieille = perimee(x.texte);
              return (
                <div key={i} className={`${styles.rem} ${x.genre === "anomalie" ? styles.remA : styles.remW} ${vu || vieille ? styles.remVu : ""}`}>
                  <span className={`${styles.code} ${x.genre === "anomalie" ? styles.codeA : styles.codeW}`}>{x.code}</span>
                  <div>
                    <small>
                      {f ? t(f.libelle) : t("famille inconnue")} · {t(x.genre)}
                      {note?.page != null ? ` · ${t("page {n} du document", { n: note.page })}` : ""}
                    </small>
                    <p className={vieille ? styles.perimee : undefined}>{x.texte}</p>
                    {f && <small className={styles.conseil}>{t(f.quoiFaire)}</small>}
                    {/* ON NE DEMANDE RIEN SUR UNE REMARQUE PÉRIMÉE : le lecteur
                        ne la porte plus, elle ne quittera la base qu'à la
                        prochaine écriture réussie, et y répondre serait
                        répondre à un fantôme. */}
                    {vieille ? (
                      <small className={styles.conseil}>{t("Le lecteur d'aujourd'hui ne dit plus cela : la base garde la phrase de sa première lecture.")}</small>
                    ) : (
                      <Juger seance={seance} code={x.code} texte={x.texte} jugement={vu && !vu.retireLe ? { id: vu.id, motif: vu.motif, portee: vu.portee, page: vu.page, note: vu.note, at: vu.at } : undefined} bornes={DEPUIS_QUE_LA_BOURSE_PUBLIE[x.code] ? { jusquau: DEPUIS_QUE_LA_BOURSE_PUBLIE[x.code] } : undefined} pageProposee={note?.page} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* CE QUE LA BASE NE PEUT PAS DIRE, et que seule la relecture rend : le
          texte exact sur lequel le lecteur a buté. */}
      {notes.some((n) => n.brut || n.attendu) && (
        <section className="panel">
          <div className="panel-h">
            <h2>{t("Sur quoi le lecteur a buté")}</h2>
            <span className="muted">
              {b.notes?.length
                ? t("le texte du PDF tel qu'il l'a vu, ce qu'il y cherchait, et la page : gardé à la lecture")
                : t("le texte du PDF tel qu'il l'a vu, et ce qu'il y cherchait : retrouvé à l'instant, la lecture d'origine ne le gardait pas")}
            </span>
          </div>
          <div className={styles.bruts}>
            {notes
              .filter((n) => n.brut || n.attendu)
              .map((n, i) => (
                <div key={i} className={styles.brut}>
                  <div className={styles.brutTete}>
                    <span className={`${styles.code} ${famille(classer(n.message))?.genre === "anomalie" ? styles.codeA : styles.codeW}`}>{classer(n.message)}</span>
                    <b>{n.message}</b>
                    {n.page != null && <span className={styles.page}>{t("page {n}", { n: n.page })}</span>}
                  </div>
                  {n.brut && <code>{n.brut}</code>}
                  {n.attendu && <small>{t("attendu")} : {n.attendu}</small>}
                </div>
              ))}
          </div>
        </section>
      )}

      {ecart && avant && (
        <section className="panel">
          <div className="panel-h">
            <h2>{t("Ce qui a changé depuis le {d}", { d: avant.sessionDate })}</h2>
            <span className="muted">{t("{n} lignes cotées des deux côtés", { n: ecart.communes })}</span>
          </div>

          {/* LE VERDICT D'ABORD. Une ligne qui revient n'est jamais sortie de la
              cote : sur les 805 couples de la série, 398 disparitions sur 406
              sont des défauts de lecture, et les nommer « sortie de cote »
              enverrait le desk vérifier un remboursement qui n'a pas eu lieu. */}
          <p className={dit === "rien" ? styles.verdictNon : passageres.length ? styles.verdictOui : styles.verdictNon}>
            {dit === "rien"
              ? t("Aucune rupture : les deux séances cotent exactement les mêmes lignes.")
              : [
                  durables.length ? t("{n} ligne(s) quittent la cote pour de bon.", { n: durables.length }) : "",
                  passageres.length ? t("{n} ligne(s) manquent ici et reviennent plus tard : ce n'est pas une sortie de cote, c'est une lecture incomplète.", { n: passageres.length }) : "",
                  ecart.arrivees.length ? t("{n} ligne(s) apparaissent.", { n: ecart.arrivees.length }) : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
          </p>

          <div className={styles.colonnes}>
            <div>
              <h3>{t("Parties")}</h3>
              {ecart.partis.length === 0 ? (
                <p className="muted">{t("Aucune.")}</p>
              ) : (
                ecart.partis.map((x) => (
                  <div key={x.isin} className={styles.diff}>
                    <b className="mono">{x.mnemo}</b>
                    <span className={x.retour ? styles.passagere : styles.durable}>{x.retour ? t("passagère") : t("définitive")}</span>
                    <small>{x.retour ? t("revient le {d}", { d: x.retour }) : t("ne revient jamais : sortie de cote")}</small>
                  </div>
                ))
              )}
            </div>
            <div>
              <h3>{t("Apparues")}</h3>
              {ecart.arrivees.length === 0 ? (
                <p className="muted">{t("Aucune.")}</p>
              ) : (
                ecart.arrivees.map((x) => (
                  <div key={x.isin} className={styles.diff}>
                    <b className="mono">{x.mnemo}</b>
                    <span className={x.premiere ? styles.neuve : styles.passagere}>{x.premiere ? t("première cotation") : t("retour")}</span>
                    <small>{x.premiere ? t("jamais cotée avant") : t("déjà vue auparavant")}</small>
                  </div>
                ))
              )}
            </div>
            <div>
              <h3>{t("Cours qui bougent ({n})", { n: ecart.bouges.length })}</h3>
              {ecart.bouges.length === 0 ? (
                <p className="muted">{t("Aucun.")}</p>
              ) : (
                ecart.bouges.slice(0, 20).map((x) => (
                  <div key={x.isin} className={styles.diff}>
                    <b className="mono">{x.mnemo}</b>
                    <small>
                      {x.avant.toLocaleString("fr-FR")} → {x.apres.toLocaleString("fr-FR")}
                      {x.variation == null ? "" : ` · ${x.variation > 0 ? "+" : ""}${x.variation.toFixed(2).replace(".", ",")} %`}
                    </small>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-h">
          <h2>{t("Le document")}</h2>
        </div>
        <p className={styles.p}>
          {b.fileKey ? (
            <>
              <a href={`/desk/bulletins/pdf/${seance}`} target="_blank" rel="noreferrer">
                {t("Notre copie du PDF")}
              </a>
              {" · "}
            </>
          ) : (
            <>{t("Pas de copie archivée chez nous.")} </>
          )}
          <a href={b.sourceUrl?.startsWith("http") ? b.sourceUrl : bocUrl(seance)} target="_blank" rel="noreferrer">
            {t("Le document chez la BVMAC")}
          </a>
          {" · "}
          <Link href={`/desk/bulletins?code=${codesDe(b).join(",")}`}>{t("Les séances qui portent les mêmes codes")}</Link>
        </p>
      </section>
    </>
  );
}
