import Link from "next/link";
import { notFound } from "next/navigation";
import { DeskNav } from "@/components/DeskNav";
import { repo } from "@/lib/data";
import { readSource } from "@/lib/intake/storage";
import { bocUrl, bondQuote, equityQuote, fetchBoc, fundNav, pdfText, validate } from "@/lib/market/boc";
import { parseBoc } from "@/lib/market/boc-parse";
import { classer, codes as codesDe, famille, remarques } from "@/lib/market/remarques";
import { fmtDateTime } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
/* Reprendre le PDF et le repasser au lecteur demande environ quatre secondes.
   C'est une page qu'on ouvre rarement et délibérément. */
export const maxDuration = 60;

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
 */
export default async function RapportPage({ params }: { params: Promise<{ seance: string }> }) {
  const t = await getT();
  const { seance } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(seance)) notFound();

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
  let frais: { actions: number; obligations: number; opcvm: number; indice?: number; anomalies: string[]; notes: ReturnType<typeof parseBoc>["notes"] } | undefined;
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
        indice: parsed.index?.value,
        anomalies: validate(parsed, quotes, navs, precedentes, avant?.counts?.funds ?? 0),
        notes: parsed.notes,
      };
    } catch (e) {
      panne = e instanceof Error ? e.message : t("Lecture impossible.");
    }
  }

  const enBase = remarques(b);
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
      <DeskNav current="/desk/bulletins" />

      <div className={styles.head}>
        <div>
          <h1>
            {t("Séance du {d}", { d: seance })} · {t("bulletin n°")} {b.number || "—"}
          </h1>
          <p className="muted">
            {t("Ce rapport n'est pas enregistré : il est refait à chaque ouverture, en reprenant le PDF et en le repassant au lecteur d'aujourd'hui. Rien n'est écrit en base, et c'est pour cela qu'on peut l'ouvrir sans y penser.")}
          </p>
        </div>
        <Link className="btn sm" href="/desk/bulletins">
          ← {t("Tous les bulletins")}
        </Link>
      </div>

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
        </div>
        {enBase.length === 0 ? (
          <p className={styles.p}>{t("Aucune : la séance est entrée entière.")}</p>
        ) : (
          <div className={styles.remarques}>
            {enBase.map((x, i) => {
              const f = famille(x.code);
              return (
                <div key={i} className={`${styles.rem} ${x.genre === "anomalie" ? styles.remA : styles.remW}`}>
                  <span className={`${styles.code} ${x.genre === "anomalie" ? styles.codeA : styles.codeW}`}>{x.code}</span>
                  <div>
                    <small>
                      {f ? t(f.libelle) : t("famille inconnue")} · {t(x.genre)}
                    </small>
                    <p>{x.texte}</p>
                    {f && <small className={styles.conseil}>{t(f.quoiFaire)}</small>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* CE QUE LA BASE NE PEUT PAS DIRE, et que seule la relecture rend : le
          texte exact sur lequel le lecteur a buté. */}
      {frais && frais.notes.some((n) => n.brut) && (
        <section className="panel">
          <div className="panel-h">
            <h2>{t("Sur quoi le lecteur a buté")}</h2>
            <span className="muted">{t("le texte du PDF, tel qu'il l'a vu, et ce qu'il y cherchait")}</span>
          </div>
          <div className={styles.bruts}>
            {frais.notes
              .filter((n) => n.brut)
              .map((n, i) => (
                <div key={i} className={styles.brut}>
                  <div className={styles.brutTete}>
                    <span className={`${styles.code} ${famille(classer(n.message))?.genre === "anomalie" ? styles.codeA : styles.codeW}`}>{classer(n.message)}</span>
                    <b>{n.message}</b>
                  </div>
                  <code>{n.brut}</code>
                  {n.attendu && <small>{t("attendu")} : {n.attendu}</small>}
                </div>
              ))}
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
