"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Confidence, IntakeItem, Offer, OfferDraft } from "@/lib/domain/types";
import { OPERATION_LABEL } from "@/lib/domain/status";
import { enabledTypes, kindForEngine, legacyTypeKey, typeByKey } from "@/lib/registry";
import { bondCalc, btaCalc, parseDate, tenorText } from "@/lib/finance";
import { fmt, fmtDateTime, fmtPct } from "@/lib/format";
import { missingFields } from "@/lib/intake/publish";
import { publishAction, rejectAction, requestReviewAction, saveDraftAction, sendBackAction, type IntakeResult } from "./actions";
import styles from "./page.module.css";

type Snap = Record<string, string>;

const SOURCE_LABEL: Record<IntakeItem["source"], string> = { mail: "E-mail", pdf: "PDF", photo: "Photo", texte: "Texte" };
const FIELD_LABEL: Partial<Record<keyof OfferDraft, string>> = {
  kind: "Instrument",
  operation: "Opération",
  country: "Pays",
  countryName: "Émetteur (pays)",
  issuer: "Émetteur",
  isin: "Code émission / ISIN",
  sourceRef: "Référence du communiqué",
  nominal: "Nominal unitaire (FCFA)",
  couponRate: "Coupon annuel (%)",
  maturityOn: "Échéance",
  lastCouponOn: "Dernier coupon versé",
  opensAt: "Ouverture",
  deadlineAt: "Dépôt des offres",
  resultsAt: "Résultats",
  settleOn: "Règlement / valeur",
  sizeLabel: "Volume",
  title: "Titre de la fiche",
  blurb: "Description client",
  pricePerShare: "Prix par action (FCFA)",
  minShares: "Minimum (actions)",
  sharesOffered: "Actions offertes",
  dividendPerShare: "Dividende par action",
};

function Field({ k, draft, type = "text", options, snapShot }: { k: keyof OfferDraft; draft: OfferDraft; type?: string; options?: [string, string][]; snapShot?: Snap }) {
  const conf: Confidence = draft.confidence[k as keyof OfferDraft["confidence"]] ?? (draft[k] == null || draft[k] === "" ? "missing" : "sure");
  const value = snapShot?.[k] ?? (draft[k] == null ? "" : String(draft[k]));
  const cls = conf === "sure" ? "" : conf === "check" ? styles.check : styles.missing;
  return (
    <label className={`${styles.fld} ${cls}`}>
      <span>{FIELD_LABEL[k]}</span>
      {options ? (
        <select name={k} defaultValue={value}>
          <option value="">—</option>
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea name={k} defaultValue={value} rows={2} />
      ) : (
        <input name={k} type={type} defaultValue={value} step={type === "number" ? "any" : undefined} />
      )}
      <i className={`${styles.conf} ${styles[`conf_${conf}`]}`} title={conf === "sure" ? "Lu dans la source" : conf === "check" ? "Déduit ou ambigu — à vérifier" : "Absent de la source"} />
    </label>
  );
}

export function ValidateForm({ item, offer }: { item: IntakeItem; offer?: Offer }) {
  const d = item.draft;
  const [snap, setSnap] = useState<Snap>({});
  const [saveState, saveAct, saving] = useActionState<IntakeResult | null, FormData>(saveDraftAction, null);
  const [pubState, pubAct, publishing] = useActionState<IntakeResult | null, FormData>(publishAction, null);
  const [revState, revAct, reviewing] = useActionState<IntakeResult | null, FormData>(requestReviewAction, null);
  const [backState, backAct, sendingBack] = useActionState<IntakeResult | null, FormData>(sendBackAction, null);
  const inReview = item.state === "en_revue";

  const v = (k: string, fallback?: unknown) => snap[k] ?? (fallback == null ? "" : String(fallback));
  // The product type (registry) decides the storage kind, the free fields and the checklist.
  const types = enabledTypes().filter((t) => t.segment === "primaire");
  const typeKey = v("typeKey", d.typeKey ?? (d.kind ? legacyTypeKey({ kind: d.kind, instrument: undefined }) : "OTA"));
  const type = typeByKey(typeKey) ?? types[0];
  const kind = (type ? kindForEngine(type.engine, type.segment).kind : d.kind || "OTA") as Offer["kind"];
  const official = snap.official !== undefined ? snap.official === "on" : d.official;
  const checks = Object.values(d.confidence).filter((c) => c === "check").length;
  const missing = missingFields({ ...d, ...Object.fromEntries(Object.entries(snap).filter(([, val]) => val !== "")) } as OfferDraft);
  const published = item.state === "publie";

  // Live preview of what the client will read, from the current field values.
  const price = Number(v("pricePct", offer?.pricePct ?? 95));
  const rate = Number(v("precountRate", offer?.precountRate ?? 5.5));
  const settle = v("settleOn", d.settleOn);
  const maturity = v("maturityOn", d.maturityOn);
  let preview = "";
  if (settle && maturity && parseDate(maturity) > parseDate(settle)) {
    if (kind === "OTA" || kind === "APE") {
      const r = bondCalc({ nominal: Number(v("nominal", d.nominal ?? 10000)) || 10000, couponRate: Number(v("couponRate", d.couponRate ?? 0)), settleOn: settle, maturityOn: maturity, lastCouponOn: v("lastCouponOn", d.lastCouponOn) || null }, 10_000_000, price);
      preview = `${fmtPct(r.irr)} de rendement actuariel brut si servi à ${fmtPct(price, 0)} · coupon ${fmtPct(Number(v("couponRate", d.couponRate ?? 0)), 2)} · ${tenorText(settle, maturity)} · décaissement ${fmt(r.outlay)} pour 10 M de nominal${r.accruedDays ? ` (dont ${fmt(r.accrued)} de coupon couru, ${r.accruedDays} j)` : ""}`;
    } else if (kind === "BTA") {
      const r = btaCalc({ nominal: Number(v("nominal", d.nominal ?? 1_000_000)) || 1_000_000, settleOn: settle, maturityOn: maturity }, 1_000_000, rate);
      preview = `${fmtPct(r.yieldPct)} de rendement actuariel à ${fmtPct(rate, 2)} précompté · prix d'achat ${fmt(r.pricePerBond)} par bon · remboursé le ${maturity}`;
    } else if (kind === "RACHAT") preview = "Rachat au pair (100 % du nominal), coupon couru réglé par l'émetteur.";
  }
  if (kind === "ACTIONS") preview = `${fmt(Number(v("pricePerShare", d.pricePerShare ?? 0)))} FCFA par action · minimum ${v("minShares", d.minShares ?? 1)} actions`;

  const onChange = (e: React.FormEvent<HTMLFormElement>) => {
    const fd = new FormData(e.currentTarget);
    const next: Snap = {};
    fd.forEach((val, k) => {
      if (typeof val === "string") next[k] = val;
    });
    if (!fd.has("official")) next.official = "off";
    setSnap(next);
  };

  return (
    <div className={styles.validate}>
      <div className={styles.vHead}>
        <h2 className="display">{item.title}</h2>
        <span className={`${styles.src} ${styles[`src_${item.source}`]}`}>{SOURCE_LABEL[item.source]}</span>
        {item.extractedIn != null && (
          <span className="muted" style={{ fontSize: ".78rem" }}>
            Extraction automatique en {item.extractedIn} s ·{" "}
            <b style={{ color: checks ? "var(--warn)" : "var(--good)" }}>
              {checks} champ{checks > 1 ? "s" : ""} à vérifier
            </b>
          </span>
        )}
        {!official && <span className={`${styles.st} ${styles.st_blocked}`}>Source non officielle</span>}
        {published && offer && (
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>
            <Link href={`/offres/${offer.id}`} className="btn sm">
              Voir la fiche publiée (v{offer.version})
            </Link>
            <Link href={`/desk/lignes/${offer.id}`} className="btn sm ghost">
              Historique
            </Link>
          </span>
        )}
      </div>

      <form onChange={onChange} className={styles.form}>
        <input type="hidden" name="itemId" value={item.id} />
        {offer && <input type="hidden" name="version" value={offer.version} />}
        <div className={styles.vCols}>
          <div>
            <h3>Source (original conservé)</h3>
            {item.fileName ? (
              item.mimeType === "application/pdf" ? (
                <iframe className={styles.frame} src={`/desk/a-valider/source/${item.id}`} title="Source PDF" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.photo} src={`/desk/a-valider/source/${item.id}`} alt="Source" />
              )
            ) : (
              <pre className={styles.paper}>{item.rawText ?? "—"}</pre>
            )}
            {d.remarks.length > 0 && (
              <ul className={styles.remarks}>
                {d.remarks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3>Champs extraits — corriger si besoin</h3>
            <div className={styles.fields}>
              <label className={`${styles.fld} ${d.kind ? "" : styles.missing}`}>
                <span>Type de produit</span>
                <select name="typeKey" defaultValue={typeKey}>
                  {types.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <i className={`${styles.conf} ${styles[`conf_${d.kind ? "sure" : "missing"}`]}`} title="Type choisi par le desk" />
              </label>
              <input type="hidden" name="kind" value={kind} />
              <Field k="operation" draft={d} options={(Object.keys(OPERATION_LABEL) as Offer["operation"][]).map((k) => [k, OPERATION_LABEL[k]])} />
              <Field k="country" draft={d} options={["RCA", "Congo", "Cameroun", "Gabon", "Tchad", "Guinée éq."].map((c) => [c, c])} />
              <Field k="countryName" draft={d} />
              <Field k="issuer" draft={d} />
              <Field k="isin" draft={d} />
              <Field k="sourceRef" draft={d} />
              <Field k="title" draft={d} />
              <Field k="nominal" draft={d} type="number" />
              {(kind === "OTA" || kind === "APE") && <Field k="couponRate" draft={d} type="number" />}
              {kind === "ACTIONS" ? (
                <>
                  <Field k="pricePerShare" draft={d} type="number" />
                  <Field k="minShares" draft={d} type="number" />
                  <Field k="sharesOffered" draft={d} type="number" />
                  <Field k="dividendPerShare" draft={d} type="number" />
                  <Field k="opensAt" draft={d} type="datetime-local" />
                </>
              ) : (
                <>
                  <Field k="maturityOn" draft={d} type="date" />
                  {(kind === "OTA" || kind === "APE") && <Field k="lastCouponOn" draft={d} type="date" />}
                </>
              )}
              <Field k="deadlineAt" draft={d} type="datetime-local" />
              <Field k="resultsAt" draft={d} type="datetime-local" />
              <Field k="settleOn" draft={d} type="date" />
              <Field k="sizeLabel" draft={d} />
              <Field k="blurb" draft={d} type="textarea" />
              {type?.fields.map((fld) => (
                <label key={fld.key} className={`${styles.fld} ${!d.extra?.[fld.key] && fld.required ? styles.missing : ""}`}>
                  <span>
                    {fld.label}
                    {fld.required ? " *" : ""}
                  </span>
                  <input name={`extra.${fld.key}`} defaultValue={d.extra?.[fld.key] ?? ""} />
                  <i className={`${styles.conf} ${styles[`conf_${d.extra?.[fld.key] ? "sure" : "missing"}`]}`} title={`Champ libre du type ${type.short}`} />
                </label>
              ))}
              <label className={styles.official}>
                <input type="checkbox" name="official" defaultChecked={d.official} /> Source officielle jointe (communiqué, note d&apos;opération)
              </label>
            </div>
          </div>
        </div>

        <div className={styles.decision}>
          <h3>Décision du desk — les seuls champs que nous fixons</h3>
          <div className={styles.decGrid}>
            {kind === "BTA" ? (
              <label className="field">
                Taux précompté indicatif (%)
                <input name="precountRate" type="number" step="0.05" defaultValue={offer?.precountRate ?? 5.5} />
              </label>
            ) : kind === "ACTIONS" || kind === "RACHAT" ? (
              <label className="field">
                Prix
                <input value={kind === "RACHAT" ? "100 % (au pair)" : "prix d'émission"} readOnly />
              </label>
            ) : (
              <label className="field">
                Prix Purpose (% du nominal)
                <input name="pricePct" type="number" step="0.5" defaultValue={offer?.pricePct && !offer.priceNote ? offer.pricePct : 95} />
              </label>
            )}
            <input type="hidden" name="commissionPct" value="0" />
            <label className="field">
              Ticket minimum (titres)
              <input name="minTitles" type="number" defaultValue={offer?.minTitles ?? (kind === "BTA" ? 1 : kind === "ACTIONS" ? 10 : 100)} />
            </label>
            <label className="field">
              Segments
              <select name="segment" defaultValue="Tous les clients">
                <option>Tous les clients</option>
                <option>Institutionnels + entreprises</option>
                <option>Personnes physiques + groupements</option>
                <option>Porteurs de la ligne</option>
              </select>
            </label>
          </div>
          <div className={styles.preview}>
            <span className="eyebrow">Aperçu client</span>
            <div>{preview || "Complétez les dates et le taux pour voir l'aperçu."}</div>
          </div>
          {type && type.checklist.length > 0 && (
            <div className={styles.checklist}>
              <span className="eyebrow">Liste de contrôle · {type.short}</span>
              {type.checklist.map((c) => (
                <label key={c}>
                  <input type="checkbox" name="check" value={c} defaultChecked={Boolean(offer)} /> {c}
                </label>
              ))}
            </div>
          )}
          <div className={styles.channels}>
            {["Guichet web", "WhatsApp", "E-mail"].map((c) => (
              <label key={c}>
                <input type="checkbox" name="channel" value={c} defaultChecked={c !== "E-mail"} /> {c}
              </label>
            ))}
            <span className="muted" style={{ fontSize: ".74rem" }}>
              La diffusion WhatsApp / e-mail est journalisée aujourd&apos;hui, envoyée à l&apos;étape suivante.
            </span>
          </div>
        </div>

        {(saveState && !saveState.ok && <div className={styles.error}>{saveState.error}</div>) || (pubState && !pubState.ok && <div className={styles.error}>{pubState.error}</div>) || (revState && !revState.ok && <div className={styles.error}>{revState.error}</div>) || (backState && !backState.ok && <div className={styles.error}>{backState.error}</div>)}
        {item.notes && (
          <div className={styles.reviewNote}>
            <span className="eyebrow">{inReview ? "En revue" : "Dernière note"}</span> {item.notes}
          </div>
        )}
        {revState?.ok && <div className={styles.okMsg}>Relecture demandée — le brouillon passe « en revue ».</div>}
        {backState?.ok && <div className={styles.okMsg}>Renvoyé en correction.</div>}
        {saveState?.ok && <div className={styles.okMsg}>Brouillon enregistré.</div>}
        {pubState?.ok && pubState.pending && <div className={styles.okMsg}>Proposition transmise à un responsable — {pubState.pending}. La fiche sera publiée à son approbation (desk › Approbations).</div>}
        {pubState?.ok && !pubState.pending && (
          <div className={styles.okMsg}>
            Publié — la fiche est en ligne.{" "}
            <Link href={`/desk/a-valider?item=${item.id}`} style={{ color: "inherit" }}>
              Recharger
            </Link>
          </div>
        )}

        <div className={styles.vFoot}>
          <small>
            {!official
              ? "Publication bloquée tant que la source officielle n'est pas jointe. Enregistrez le brouillon en attendant."
              : missing.length
                ? `Champs manquants pour publier : ${missing.map((m) => FIELD_LABEL[m as keyof OfferDraft] ?? m).join(", ")}.`
                : published
                  ? `Déjà publié le ${item.publishedAt ? fmtDateTime(item.publishedAt) : "—"}. Publier à nouveau crée la version ${(offer?.version ?? 0) + 1} et renotifie les clients.`
                  : "Publier crée la version 1 de l'offre, l'affiche dans le Guichet et déclenche les diffusions cochées."}
          </small>
          <button className="btn ghost sm" type="submit" formAction={rejectAction} formNoValidate>
            Rejeter
          </button>
          {!published && (
            <span className={styles.reviewBox}>
              <input name="reviewNote" placeholder={inReview ? "Ce qui reste à corriger…" : "À vérifier par le relecteur…"} aria-label="Note de revue" maxLength={300} />
              {inReview ? (
                <button className="btn sm" type="submit" formAction={backAct} disabled={sendingBack} formNoValidate>
                  {sendingBack ? "…" : "Renvoyer en correction"}
                </button>
              ) : (
                <button className="btn sm" type="submit" formAction={revAct} disabled={reviewing || !official} formNoValidate>
                  {reviewing ? "…" : "Demander une relecture"}
                </button>
              )}
            </span>
          )}
          <button className="btn" type="submit" formAction={saveAct} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer le brouillon"}
          </button>
          <button className="btn primary" type="submit" formAction={pubAct} disabled={publishing || !official || missing.length > 0}>
            {publishing ? "Publication…" : published ? `Publier la version ${(offer?.version ?? 0) + 1}` : "Publier et diffuser"}
          </button>
        </div>
      </form>
    </div>
  );
}
