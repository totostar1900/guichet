"use client";

import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { Confidence, IntakeItem, Offer, OfferDraft } from "@/lib/domain/types";
import { OPERATION_LABEL } from "@/lib/domain/status";
import { enabledTypes, kindForEngine, legacyTypeKey, typeByKey } from "@/lib/registry";
import { bondCalc, btaCalc, parseDate, tenorText } from "@/lib/finance";
import { fmt, fmtDateTime, fmtPct } from "@/lib/format";
import { missingFields } from "@/lib/intake/publish";
import { publishAction, rejectAction, requestReviewAction, saveDraftAction, sendBackAction, type IntakeResult } from "./actions";
import { SourceViewer } from "./SourceViewer";
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

function Field({ k, draft, type = "text", options, snapShot, onSelect }: { k: keyof OfferDraft; draft: OfferDraft; type?: string; options?: [string, string][]; snapShot?: Snap; onSelect?: (k: string, v: string) => void }) {
  const tr = useT();
  const conf: Confidence = draft.confidence[k as keyof OfferDraft["confidence"]] ?? (draft[k] == null || draft[k] === "" ? "missing" : "sure");
  const value = snapShot?.[k] ?? (draft[k] == null ? "" : String(draft[k]));
  const cls = conf === "sure" ? "" : conf === "check" ? styles.check : styles.missing;
  return (
    <label className={`${styles.fld} ${cls}`}>
      <span>{tr(FIELD_LABEL[k] ?? String(k))}</span>
      {options ? (
        <Select block name={k} value={value} onChange={(v) => onSelect?.(k, v)} options={[{ value: "", label: "—" }, ...options.map(([v, l]) => ({ value: v, label: l }))]} />
      ) : type === "textarea" ? (
        <textarea name={k} defaultValue={value} rows={2} />
      ) : (
        <input name={k} type={type} defaultValue={value} step={type === "number" ? "any" : undefined} />
      )}
      <i className={`${styles.conf} ${styles[`conf_${conf}`]}`} title={tr(conf === "sure" ? "Lu dans la source" : conf === "check" ? "Déduit ou ambigu : à vérifier" : "Absent de la source")} />
    </label>
  );
}

export function ValidateForm({ item, offer }: { item: IntakeItem; offer?: Offer }) {
  const tr = useT();
  const d = item.draft;
  const [snap, setSnap] = useState<Snap>({});
  const [saveState, saveAct, saving] = useActionState<IntakeResult | null, FormData>(saveDraftAction, null);
  const [pubState, pubAct, publishing] = useActionState<IntakeResult | null, FormData>(publishAction, null);
  const [revState, revAct, reviewing] = useActionState<IntakeResult | null, FormData>(requestReviewAction, null);
  const [backState, backAct, sendingBack] = useActionState<IntakeResult | null, FormData>(sendBackAction, null);
  const inReview = item.state === "en_revue";

  const v = (k: string, fallback?: unknown) => snap[k] ?? (fallback == null ? "" : String(fallback));
  // The product type (registry) decides the storage kind, the free fields and the checklist.
  // Une source déposée par un robot porte l'adresse d'où elle vient dans son texte.
  const sourceUrl = item.rawText?.match(/https?:\/\/\S+/)?.[0];
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
      preview = `${fmtPct(r.irr)} de rendement actuariel annuel brut si servi à ${fmtPct(price, 0)} · coupon ${fmtPct(Number(v("couponRate", d.couponRate ?? 0)), 2)} · ${tenorText(settle, maturity)} · décaissement ${fmt(r.outlay)} pour 10 M de nominal${r.accruedDays ? ` (dont ${fmt(r.accrued)} de coupon couru, ${r.accruedDays} j)` : ""}`;
    } else if (kind === "BTA") {
      const r = btaCalc({ nominal: Number(v("nominal", d.nominal ?? 1_000_000)) || 1_000_000, settleOn: settle, maturityOn: maturity }, 1_000_000, rate);
      preview = `${fmtPct(r.yieldPct)} de rendement actuariel à ${fmtPct(rate, 2)} précompté · prix d'achat ${fmt(r.pricePerBond)} par bon · remboursé le ${maturity}`;
    } else if (kind === "RACHAT") preview = "Rachat au pair (100 % du nominal), coupon couru réglé par l'émetteur.";
  }
  if (kind === "ACTIONS") preview = `${fmt(Number(v("pricePerShare", d.pricePerShare ?? 0)))} FCFA par action · minimum ${v("minShares", d.minShares ?? 1)} actions`;

  // The app's selects do not bubble a native change: they report their value here.
  const onSelect = (k: string, val: string) => setSnap((s) => ({ ...s, [k]: val }));
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
            {tr("Extraction automatique en")} {item.extractedIn} s ·{" "}
            <b style={{ color: checks ? "var(--warn)" : "var(--good)" }}>
              {checks} {tr(checks > 1 ? "champs à vérifier" : "champ à vérifier")}
            </b>
          </span>
        )}
        {!official && <span className={`${styles.st} ${styles.st_blocked}`}>{tr("Source non officielle")}</span>}
        {published && offer && (
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>
            {/* Une seule porte : la ligne au desk porte la lecture et l'historique. */}
            <Link href={`/desk/lignes/${offer.id}`} className="btn sm">
              Voir la ligne publiée (v{offer.version})
            </Link>
          </span>
        )}
      </div>

      <form onChange={onChange} className={styles.form}>
        <input type="hidden" name="itemId" value={item.id} />
        {offer && <input type="hidden" name="version" value={offer.version} />}
        <div className={styles.vCols}>
          <div>
            <h3>{tr("Source (original conservé)")}</h3>
            {/* L'adresse d'où la pièce vient, quand la source en a une.

                Le document est gardé ici octet pour octet, et c'est lui qui fait foi ;
                mais un relecteur veut parfois remonter au site de l'émetteur, pour
                vérifier qu'il n'y a pas eu de rectificatif depuis. Le lien reste donc
                visible même quand le fichier est là, au lieu de disparaître dès qu'on
                a réussi à le rapatrier. */}
            {sourceUrl && (
              <p className={styles.sourceLink}>
                <a href={sourceUrl} target="_blank" rel="noreferrer">
                  {tr("Ouvrir le document chez l'émetteur")} ↗
                </a>
              </p>
            )}
            {item.fileName ? (
              item.mimeType === "application/pdf" ? (
                <SourceViewer src={`/desk/a-valider/source/${item.id}`} title={tr("Source PDF")} />
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
                  <li key={i}>{tr(r)}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3>{tr("Champs extraits : corriger si besoin")}</h3>
            <div className={styles.fields}>
              <label className={`${styles.fld} ${d.kind ? "" : styles.missing}`}>
                <span>{tr("Type de produit")}</span>
                <Select block name="typeKey" value={typeKey} onChange={(v) => onSelect("typeKey", v)} options={types.map((t) => ({ value: t.key, label: tr(t.label) }))} />
                <i className={`${styles.conf} ${styles[`conf_${d.kind ? "sure" : "missing"}`]}`} title={tr("Type choisi par le desk")} />
              </label>
              <input type="hidden" name="kind" value={kind} />
              <Field k="operation" draft={d} snapShot={snap} onSelect={onSelect} options={(Object.keys(OPERATION_LABEL) as Offer["operation"][]).map((k) => [k, OPERATION_LABEL[k]])} />
              <Field k="country" draft={d} snapShot={snap} onSelect={onSelect} options={["RCA", "Congo", "Cameroun", "Gabon", "Tchad", "Guinée éq."].map((c) => [c, c])} />
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
                <input type="checkbox" name="official" defaultChecked={d.official} /> {tr("Source officielle jointe (communiqué, note d'opération)")}
              </label>
            </div>
          </div>
        </div>

        <div className={styles.decision}>
          <h3>{tr("Décision du desk : les seuls champs que nous fixons")}</h3>
          <div className={styles.decGrid}>
            {kind === "BTA" ? (
              <label className="field">
                {tr("Taux précompté indicatif (%)")}
                <input name="precountRate" type="number" step="0.05" defaultValue={offer?.precountRate ?? 5.5} />
              </label>
            ) : kind === "ACTIONS" || kind === "RACHAT" ? (
              <label className="field">
                {tr("Prix")}
                <input value={kind === "RACHAT" ? "100 % (au pair)" : "prix d'émission"} readOnly />
              </label>
            ) : kind === "FONDS" ? (
              // Un FCP n'a pas de prix que le desk fixe : il a une valeur liquidative,
              // calculée et publiée par la société de gestion, et l'on souscrit à la
              // prochaine, inconnue à l'instant de l'ordre. Le champ ne se saisit pas
              // et n'envoie rien.
              <label className="field">
                {tr("Valeur liquidative")}
                <input value={offer?.fund ? `${fmt(offer.fund.nav)} FCFA · ${offer.fund.navDate}` : tr("publiée par la société de gestion")} readOnly />
              </label>
            ) : (
              <label className="field">
                {tr("Prix Purpose (% du nominal)")}
                <input name="pricePct" type="number" step="0.5" defaultValue={offer?.pricePct && !offer.priceNote ? offer.pricePct : 95} />
              </label>
            )}
            <input type="hidden" name="commissionPct" value="0" />
            {kind === "FONDS" ? (
              // La souscription minimale d’un fonds est une somme, pas un nombre de parts :
              // on ne sait pas combien de parts elle fera, la VL n’étant celle de demain.
              <label className="field">
                {tr("Souscription minimale (FCFA)")}
                <input name="minAmount" type="number" step="1000" defaultValue={offer?.fund?.minAmount ?? 1000000} />
              </label>
            ) : (
              // Ce champ portait une valeur par défaut : 100 titres, soit un million
              // de francs au nominal d'une OTA. Personne ne l'a jamais changée, et les
              // cinq lignes du référentiel la portent toutes. Nous prêtions donc au
              // marché un plancher qui venait de ce formulaire : ni la BEAC, ni un
              // communiqué d'adjudication ne l'imposent. Le champ part vide ; le
              // ticket se lit sur le communiqué, ou il n'y en a pas.
              <label className="field">
                {tr("Ticket minimum (titres)")}
                <input name="minTitles" type="number" min={1} defaultValue={offer?.minTitles ?? ""} placeholder={tr("d'après le communiqué")} />
                <small className="muted">{tr("Laissé vide : un titre. À ne renseigner que si le communiqué fixe un minimum.")}</small>
              </label>
            )}
            <label className="field">
              {tr("Segments")}
              <Select block name="segment" value="Tous les clients" options={["Tous les clients", "Institutionnels + entreprises", "Personnes physiques + groupements", "Porteurs de la ligne"].map((v) => ({ value: v, label: tr(v) }))} />
            </label>
          </div>
          <div className={styles.preview}>
            <span className="eyebrow">{tr("Aperçu client")}</span>
            <div>{preview ? tr(preview) : tr("Complétez les dates et le taux pour voir l'aperçu.")}</div>
          </div>
          {type && type.checklist.length > 0 && (
            <div className={styles.checklist}>
              <span className="eyebrow">{tr(`Liste de contrôle · ${type.short}`)}</span>
              {type.checklist.map((c) => (
                <label key={c}>
                  <input type="checkbox" name="check" value={c} defaultChecked={Boolean(offer)} /> {tr(c)}
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
              {tr("La diffusion WhatsApp / e-mail est journalisée aujourd'hui, envoyée à l'étape suivante.")}
            </span>
          </div>
        </div>

        {(saveState && !saveState.ok && <div className={styles.error}>{saveState.error}</div>) || (pubState && !pubState.ok && <div className={styles.error}>{pubState.error}</div>) || (revState && !revState.ok && <div className={styles.error}>{revState.error}</div>) || (backState && !backState.ok && <div className={styles.error}>{backState.error}</div>)}
        {item.notes && (
          <div className={styles.reviewNote}>
            <span className="eyebrow">{tr(inReview ? "En revue" : "Dernière note")}</span> {item.notes}
          </div>
        )}
        {revState?.ok && <div className={styles.okMsg}>{tr("Relecture demandée : le brouillon passe « en revue ».")}</div>}
        {backState?.ok && <div className={styles.okMsg}>{tr("Renvoyé en correction.")}</div>}
        {saveState?.ok && <div className={styles.okMsg}>{tr("Brouillon enregistré.")}</div>}
        {pubState?.ok && pubState.pending && <div className={styles.okMsg}>{tr(`Proposition transmise à un responsable : ${pubState.pending}. La fiche sera publiée à son approbation (desk › Approbations).`)}</div>}
        {pubState?.ok && !pubState.pending && (
          <div className={styles.okMsg}>
            Publié : la fiche est en ligne.{" "}
            <Link href={`/desk/a-valider?item=${item.id}`} style={{ color: "inherit" }}>
              {tr("Recharger")}
            </Link>
          </div>
        )}

        <div className={styles.vFoot}>
          <small>
            {!official
              ? "Publication bloquée tant que la source officielle n'est pas jointe. Enregistrez le brouillon en attendant."
              : missing.length
                ? `${tr("Champs manquants pour publier")} : ${missing.map((m) => tr(FIELD_LABEL[m as keyof OfferDraft] ?? m)).join(", ")}.`
                : published
                  ? tr("Déjà publié le {d}. Publier à nouveau crée la version {v} et renotifie les clients.", { d: item.publishedAt ? fmtDateTime(item.publishedAt) : "—", v: (offer?.version ?? 0) + 1 })
                  : tr("Publier crée la version 1 de l'offre, l'affiche dans le Guichet et déclenche les diffusions cochées.")}
          </small>
          <button className="btn ghost sm" type="submit" formAction={rejectAction} formNoValidate>
            {tr("Rejeter")}
          </button>
          {!published && (
            <span className={styles.reviewBox}>
              <input name="reviewNote" placeholder={tr(inReview ? "Ce qui reste à corriger…" : "À vérifier par le relecteur…")} aria-label={tr("Note de revue")} maxLength={300} />
              {inReview ? (
                <button className="btn sm" type="submit" formAction={backAct} disabled={sendingBack} formNoValidate>
                  {tr(sendingBack ? "…" : "Renvoyer en correction")}
                </button>
              ) : (
                <button className="btn sm" type="submit" formAction={revAct} disabled={reviewing || !official} formNoValidate>
                  {tr(reviewing ? "…" : "Demander une relecture")}
                </button>
              )}
            </span>
          )}
          <button className="btn" type="submit" formAction={saveAct} disabled={saving}>
            {tr(saving ? "Enregistrement…" : "Enregistrer le brouillon")}
          </button>
          <button className="btn primary" type="submit" formAction={pubAct} disabled={publishing || !official || missing.length > 0}>
            {publishing ? "Publication…" : published ? `Publier la version ${(offer?.version ?? 0) + 1}` : "Publier et diffuser"}
          </button>
        </div>
      </form>
    </div>
  );
}
