import Link from "next/link";
import { Fragment } from "react";
import { DeskNav } from "@/components/DeskNav";
import { repo } from "@/lib/data";
import type { ClientFile } from "@/lib/domain/kyc";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { tenueDe } from "@/lib/desk/tenue-data";
import { CRAN_LABEL } from "@/lib/domain/tenue";
import { activiteDe } from "@/lib/desk/activite-data";
import { INGREDIENT_LABEL } from "@/lib/domain/activite";
import { autoChecks, DOC_LABEL, KIND_LABEL, requiredDocs, RISK_LABEL, STATUS_LABEL, suggestedRisk } from "@/lib/kyc/checklist";
import { ReviewForm } from "./ReviewForm";
import { RegistreBand } from "@/components/desk/RegistreBand";
import { correspondancesDuDossier } from "@/lib/desk/registre-data";
import { MANUAL_LISTS, namesToScreen, screeningConfigured } from "@/lib/kyc/screening";
import { ClientActs, type ActOperation, type ActPosition } from "./ClientActs";
import { MesureForm } from "./MesureForm";
import { clientDirectory, waiting } from "@/lib/kyc/queue";
import { positionsFrom } from "@/lib/positions";
import { INTENT_LABEL } from "@/lib/domain/intent";
import styles from "./page.module.css";
import { getLang, getT } from "@/i18n/server";
import { ProfileCard } from "@/components/desk/ProfileCard";
import { ReachLine } from "@/components/desk/ReachLine";
import { removeClientDeviceAction, setAdvisorAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dossiers" };

const ROLE = { representant: "Représentant", cotitulaire: "Cotitulaire", beneficiaire_effectif: "Bénéficiaire effectif" };
const ORDER: Record<ClientFile["status"], number> = { soumis: 0, en_revue: 1, complements: 2, brouillon: 3, approuve: 4, en_cloture: 5, refuse: 6, clos: 7 };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ file?: string; q?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const r = repo();
  const files = (await r.listClientFiles()).sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.updatedAt.localeCompare(a.updatedAt));
  const docs = await r.listDocuments();
  const todo = files.filter((f) => f.status === "soumis" || f.status === "en_revue").length;
  const selected = files.find((f) => f.id === sp.file) ?? files.find((f) => f.status === "soumis" || f.status === "en_revue") ?? files[0];

  // La colonne porte tout le monde : c'est « ouvre-moi untel » qu'on lui
  // demande le plus souvent, pas « qu'est-ce qui attend ». Une rangée tient en
  // une ligne et demie, un nom et de quoi le joindre, et trois cents rangées de
  // ce format tiennent dans une colonne qui défile. Ce qui attend garde sa
  // marque et l'ordre de la page le met en tête : la file est devenue le haut
  // de l'annuaire.
  const q = (sp.q ?? "").trim();
  const queue = clientDirectory(files, q);
  const attente = files.filter(waiting).length;
  const [lang, fin, prefs, channels, devices, equipe, conseiller, compte, maTenue, monActivite] = await Promise.all([
    getLang(),
    selected ? r.getFinancialProfile(selected.userId).catch(() => undefined) : undefined,
    selected ? r.getPrefs(selected.userId).catch(() => undefined) : undefined,
    selected ? r.getChannelStatus(selected.userId).catch(() => undefined) : undefined,
    selected ? r.listDevices(selected.userId).catch(() => []) : [],
    r.listStaff().catch(() => []),
    selected ? r.findAdvisor(selected.userId).catch(() => undefined) : undefined,
    selected ? r.getContact(selected.userId).catch(() => undefined) : undefined,
    selected ? tenueDe(selected.userId).catch(() => ({ cran: "impeccable" as const, manquements: [] })) : { cran: "impeccable" as const, manquements: [] },
    selected ? activiteDe(selected.userId).catch(() => undefined) : undefined,
  ]);
  const kycDocs = selected ? docs.filter((d) => d.clientFileId === selected.id || (d.clientId === selected.userId && (d.type === "coupon" || d.type === "reclamation" || d.type === "releve" || d.type === "attestation"))) : [];
  const now = new Date();
  // the acts panel: positions with their paid flows (and the notice each already has), the client's operations
  const [intents, offers] = selected ? await Promise.all([r.listIntents(), r.listOffers()]) : [[], []];
  const mine = selected ? intents.filter((i) => i.clientId === selected.userId) : [];
  const byFlow = new Map(docs.filter((d) => d.flowKey).map((d) => [d.flowKey!, d]));
  const actPositions: ActPosition[] = selected
    ? positionsFrom(mine, offers).map((p) => ({ isin: p.offer.isin, title: p.offer.title, units: p.units, unitWord: p.unitWord, nominalAmount: p.nominalAmount, echus: p.echus.map((f) => ({ ...f, docNumber: byFlow.get(`${selected.userId}|${p.offer.isin}|${f.date}`)?.number, docId: byFlow.get(`${selected.userId}|${p.offer.isin}|${f.date}`)?.id })) }))
    : [];
  const byOffer = new Map(offers.map((o) => [o.id, o]));
  const operations: ActOperation[] = mine.filter((i) => i.state !== "annulee").slice(0, 30).map((i) => ({ ref: i.ref, label: `${i.ref} · ${byOffer.get(i.offerId)?.title ?? ""} · ${t(INTENT_LABEL[i.type])}${i.amount ? ` · ${i.amount.toLocaleString("fr-FR")}` : ""} · ${fmtDate(i.createdAt)}` }));

  return (
    <>
      <DeskNav current="/desk/clients" badges={{ "/desk/clients": todo }} />

      <div className={styles.layout}>
        <aside className={styles.queue} data-coach="queue">
          <form className={styles.search} action="/desk/clients">
            <input name="q" defaultValue={sp.q} placeholder={t("Un nom, un numéro, un e-mail")} aria-label={t("Chercher un client")} />
            <button className="btn sm" type="submit">
              {t("Chercher")}
            </button>
          </form>
          <div className={styles.qnote}>
            {q
              ? t("{n} client(s) pour « {q} »", { n: String(queue.length), q: sp.q ?? "" })
              : attente > 0
                ? t("{n} clients · {m} en attente", { n: String(files.length), m: String(attente) })
                : t("{n} clients · rien n'attend", { n: String(files.length) })}
            {q ? <> · <Link href="/desk/clients">{t("tout voir")}</Link></> : null}
          </div>
          <div className={styles.qlist}>
            {queue.map((f) => (
              <Link key={f.id} href={`/desk/clients?file=${f.id}`} className={styles.qitem} aria-current={f.id === selected?.id ? "true" : undefined}>
                <b>
                  {/* Une pastille, pas une étiquette : l'état complet se lit à
                      droite, et la colonne n'a la place que de dire « celui-ci
                      attend ». */}
                  {waiting(f) && <i className={styles.qdot} aria-hidden="true" />}
                  {f.identity.name || "(sans nom)"}
                </b>
                <span className={styles.qsub}>
                  {[f.identity.phone, f.identity.email].filter(Boolean).join(" · ") || t("sans contact")}
                </span>
              </Link>
            ))}
            {queue.length === 0 && <div className="empty">{t(files.length === 0 ? "Aucun dossier client. Un client démarre le sien depuis « Ouvrir un compte »." : "Aucun client ne répond à cette recherche.")}</div>}
          </div>
        </aside>

        {selected && (
          <div className={styles.detail}>
            <div className={styles.dHead}>
              <div>
                <div className="eyebrow">{t(KIND_LABEL[selected.kind])}</div>
                <h2 className="display">
                  {selected.identity.name || "(sans nom)"}
                  {/* Un dossier d essai ouvert sur le desk ressemble a un vrai : la marque suit le nom. */}
                  {compte?.demo && <span className="st" style={{ marginLeft: "var(--s-3)", verticalAlign: "middle" }} title={t("Compte de démonstration : écarté du reporting réglementaire.")}>{t("démo")}</span>}
                </h2>
                <div className="muted" style={{ fontSize: ".8rem" }}>
                  {[selected.identity.phone, selected.identity.email, selected.identity.city, selected.identity.country].filter(Boolean).join(" · ")}
                  {selected.submittedAt ? ` · ${t("soumis le")} ${fmtDateTime(selected.submittedAt)}` : ""}
                  {/* La colonne de gauche le portait, en rangée d'une ligne et
                      demie elle ne le porte plus : la date de dernière main
                      appartient de toute façon au dossier ouvert. */}
                  {` · ${t("mis à jour")} ${fmtDateTime(selected.updatedAt)}`}
                </div>
                <ReachLine prefs={prefs} channels={channels} t={t} />
                {/* LA TENUE SE LIT EN MANQUEMENTS, JAMAIS EN NOTE. Un cran se
                    conteste ligne à ligne ; un chiffre sur cent ne se conteste
                    pas, et c'est pourquoi il serait plus commode et moins
                    juste. Elle n'autorise rien et n'interdit rien : une mesure
                    se prend par une personne, avec un motif. */}
                <div style={{ marginTop: "var(--s-5)" }}>
                  <span className="eyebrow">{t("Tenue")}</span>{" "}
                  <span className={`st ${maTenue.cran === "en_defaut" ? "annulee" : maTenue.cran === "a_surveiller" ? "recue" : "reglee"}`}>{t(CRAN_LABEL[maTenue.cran])}</span>
                  {maTenue.manquements.length === 0 ? (
                    <small className="muted"> {t("aucun manquement")}</small>
                  ) : (
                    <ul style={{ margin: "var(--s-3) 0 0", paddingLeft: "var(--s-7)", fontSize: ".82rem" }}>
                      {maTenue.manquements.map((m) => (
                        <li key={m.clef}>
                          {t(m.phrase, m.vars)}
                          {m.objet && <span className="muted"> · {m.objet}</span>}
                          {m.quand && <span className="muted"> · {fmtDate(m.quand)}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* L'ACTIVITÉ EST UN NOMBRE PARCE QU'ELLE N'ORDONNE QU'UNE
                    LISTE, et ses cinq ingrédients s'affichent avec leurs
                    poids, qui sont arbitraires : la discussion porte alors sur
                    le poids, jamais sur le chiffre. */}
                {monActivite && (
                  <div style={{ marginTop: "var(--s-5)" }}>
                    <span className="eyebrow">{t("Activité")}</span>{" "}
                    <b style={{ fontVariantNumeric: "tabular-nums" }}>{monActivite.score}</b> <span className="muted">{t("sur 100")}</span>{" "}
                    <Link className="muted" style={{ fontSize: ".8rem" }} href="/desk/referentiel/bareme">
                      {t("barème v{n}", { n: String(monActivite.bareme) })}
                    </Link>
                    <dl style={{ margin: "var(--s-3) 0 0", display: "grid", gridTemplateColumns: "1fr auto auto", gap: "var(--s-2) var(--s-5)", fontSize: ".82rem", alignItems: "baseline" }}>
                      {monActivite.parts.map((p) => (
                        <Fragment key={p.clef}>
                          <dt>{t(INGREDIENT_LABEL[p.clef])}</dt>
                          <dd className="muted" style={{ margin: 0, fontVariantNumeric: "tabular-nums" }}>{p.brut}</dd>
                          <dd style={{ margin: 0, fontVariantNumeric: "tabular-nums" }}>
                            {p.points} / {p.sur}
                          </dd>
                        </Fragment>
                      ))}
                    </dl>
                  </div>
                )}
                <MesureForm userId={selected.userId} posee={compte?.mesure} />
                <Link className="btn sm" style={{ marginTop: "var(--s-4)" }} href={`/desk/clients/quantitatif?file=${selected.id}`}>
                  {t("Ce qu'il a traité avec nous")}
                </Link>
              </div>
              <span className={`${styles.st} ${styles[`st_${selected.status}`]}`}>{t(STATUS_LABEL[selected.status])}</span>
            </div>

            <div className={styles.cols}>
              <div>
                <h3>{t("Identité")}</h3>
                <dl className={styles.dl}>
                  {selected.kind === "physique" ? (
                    <>
                      <dt>{t("Naissance")}</dt>
                      <dd>{selected.identity.birthDate ? fmtDate(selected.identity.birthDate) : "—"} · {selected.identity.nationality ?? "—"}</dd>
                      <dt>{t("Pièce")}</dt>
                      <dd>
                        {selected.identity.idType ?? "—"} n° {selected.identity.idNumber ?? "—"}
                        {selected.identity.idExpiresOn ? `, expire le ${fmtDate(selected.identity.idExpiresOn)}` : ""}
                      </dd>
                      <dt>{t("Profession")}</dt>
                      <dd>{selected.identity.profession ?? "—"}</dd>
                    </>
                  ) : (
                    <>
                      <dt>{t("Immatriculation")}</dt>
                      <dd>{selected.identity.registration ?? "—"}</dd>
                      <dt>{t("Forme")}</dt>
                      <dd>{selected.identity.legalForm ?? "—"}</dd>
                      {selected.identity.decisionRule && (
                        <>
                          <dt>{t("Règle de décision")}</dt>
                          <dd>{selected.identity.decisionRule}</dd>
                        </>
                      )}
                    </>
                  )}
                  <dt>NIU</dt>
                  <dd>{selected.identity.taxId ?? "—"}</dd>
                  <dt>{t("Adresse")}</dt>
                  <dd>{[selected.identity.address, selected.identity.city, selected.identity.country].filter(Boolean).join(", ") || "—"}</dd>
                  <dt>{t("Résident hors CEMAC")}</dt>
                  <dd>{t(selected.identity.residentAbroad ? "oui" : "non")}</dd>
                  <dt>{t("Origine des fonds")}</dt>
                  <dd>
                    {selected.funds.source ? t(selected.funds.source) : "—"}
                    {selected.funds.expectedAmount ? ` · ${t(selected.funds.expectedAmount)}` : ""}
                    {selected.funds.bankName ? ` · ${t("banque")} ${selected.funds.bankName}` : ""}
                  </dd>
                  <dt>{t("Compte de règlement")}</dt>
                  <dd className="mono">{selected.funds.bankAccount ? `${selected.funds.bankAccount}${selected.funds.bankHolder ? ` · ${selected.funds.bankHolder}` : ""}` : t("RIB manquant")}</dd>
                  <dt>PPE</dt>
                  <dd>{selected.funds.pep ? `${t("oui")} : ${selected.funds.pepDetails ?? ""}` : t("non")}</dd>
                  <dt>{t("Profil")}</dt>
                  <dd>{[selected.profile.objectives, selected.profile.horizon, selected.profile.riskTolerance].filter(Boolean).map((x) => t(x as string)).join(" · ") || "—"}</dd>
                  <dt>{t("Convention")}</dt>
                  <dd>{selected.consents.conventionAt ? t("acceptée le {d} ({m})", { d: fmtDateTime(selected.consents.conventionAt), m: t(selected.consents.conventionMethod ?? "") }) : t("non acceptée")}</dd>
                </dl>
                {selected.persons.length > 0 && (
                  <>
                    <h3>{t("Personnes")}</h3>
                    <table className="tbl">
                      <tbody>
                        {selected.persons.map((p, i) => (
                          <tr key={i}>
                            <td>{t(ROLE[p.role])}</td>
                            <td>
                              <b>{p.name}</b>
                              {p.idNumber ? <small className="muted"> · {p.idNumber}</small> : null}
                            </td>
                            <td className="r">{p.share ? `${p.share} %` : ""}</td>
                            <td>{p.pep ? <span className="st recue">PPE</span> : null}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
              <div>
                <h3>{t("Profil financier")}</h3>
                <ProfileCard profile={fin} lang={lang} t={t} />
                {/* LES APPAREILS DE CONFIANCE, ET LE SEUL GESTE EST DE RETIRER.
                    Un client qui perd son téléphone appelait, et personne ne
                    pouvait rien : seul le porteur retirait ses appareils, depuis
                    son espace, c'est-à-dire depuis l'appareil qu'il n'a plus.
                    Le desk ne peut pas en ajouter un, ce qui reviendrait à se
                    donner sa clef ; il peut en reprendre une, ce qui ferme une
                    porte et n'en ouvre aucune. */}
                {/* LE CONSEILLER, ET LE REPLI QUI N'EST PAS UN MANQUE.
                    « Le desk » est une valeur du menu, pas une case vide :
                    sans rattachement, le client voit le desk sur sa carte et
                    le desk répond. Un conseiller sans numéro reste enregistré
                    ici mais ne s'affiche pas chez le client, parce qu'une carte
                    qui mène par WhatsApp ne doit pas nommer quelqu'un qu'on ne
                    peut pas joindre par là. */}
                <h3>{t("Conseiller")}</h3>
                <form action={setAdvisorAction} className={styles.conseillerForm}>
                  <input type="hidden" name="userId" value={selected.userId} />
                  <input type="hidden" name="clientName" value={selected.identity.name} />
                  <label className="lab" htmlFor="advisorId">
                    {t("Qui suit ce client")}
                  </label>
                  <select id="advisorId" name="advisorId" defaultValue={conseiller?.id ?? ""}>
                    <option value="">{t("Le desk, sans nom")}</option>
                    {equipe.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.phone ? "" : ` · ${t("sans numéro, invisible chez le client")}`}
                      </option>
                    ))}
                  </select>
                  <button className="btn sm" type="submit">
                    {t("Enregistrer")}
                  </button>
                </form>
                <h3>{t("Appareils de confiance")}</h3>
                {devices.length === 0 ? (
                  <p className="muted">{t("Aucun appareil enregistré : ce client entre par un code à chaque fois.")}</p>
                ) : (
                  <ul className={styles.appareils}>
                    {devices.map((d) => (
                      <li key={d.id}>
                        <span>
                          <b>{d.name}</b>
                          <small className="muted">
                            {t(d.kind === "passkey" ? "clef d'accès" : "code à quatre chiffres")}
                            {d.lastUsedAt ? ` · ${t("dernier usage")} ${fmtDateTime(d.lastUsedAt)}` : ` · ${t("jamais utilisé")}`}
                            {d.failures > 0 ? ` · ${t("{n} échecs", { n: String(d.failures) })}` : ""}
                          </small>
                        </span>
                        <form action={removeClientDeviceAction}>
                          <input type="hidden" name="deviceId" value={d.id} />
                          <input type="hidden" name="userId" value={selected.userId} />
                          <input type="hidden" name="clientName" value={selected.identity.name} />
                          <button className="btn sm ghost" type="submit">
                            {t("Retirer")}
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <h3>{t("Contrôles")}</h3>
                <ul className={styles.checks}>
                  {autoChecks(selected, now).map((c) => (
                    <li key={c.label} className={c.ok === true ? styles.ok : c.ok === false ? styles.ko : styles.manual}>
                      <b>{t(c.label)}</b> <span>{c.detail ? t(c.detail) : ""}</span>
                    </li>
                  ))}
                </ul>
                <h3>{t("Pièces")}</h3>
                <ul className={styles.pieces}>
                  {requiredDocs(selected.kind, selected.identity.residentAbroad).map((k) => {
                    const d = selected.documents.find((x) => x.kind === k);
                    return (
                      <li key={k} className={d ? "" : styles.missing}>
                        {d ? (
                          <a href={`/desk/clients/piece/${selected.id}/${k}`} target="_blank" rel="noreferrer">
                            {t(DOC_LABEL[k])}
                          </a>
                        ) : (
                          <span>{t(DOC_LABEL[k])} : {t("manquante")}</span>
                        )}
                        {d?.verified && <small className={styles.okText}> {t("vérifiée")}</small>}
                      </li>
                    );
                  })}
                </ul>
                {kycDocs.length > 0 && (
                  <>
                    <h3>{t("Documents émis")}</h3>
                    <ul className={styles.pieces}>
                      {kycDocs.map((d) => (
                        <li key={d.id}>
                          <a href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer" className="mono">
                            {d.number}
                          </a>{" "}
                          · {d.title}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>

            <div data-coach="review">
              <RegistreBand hits={await correspondancesDuDossier(selected)} t={t} />
              <ReviewForm file={selected} suggested={suggestedRisk(selected)} riskLabels={RISK_LABEL} screening={{ auto: screeningConfigured(), names: namesToScreen(selected), lists: MANUAL_LISTS.map((l) => ({ key: l.key, label: l.label, url: l.url(namesToScreen(selected)[0] ?? selected.identity.name) })) }} />
            </div>
            <ClientActs fileId={selected.id} clientId={selected.userId} status={selected.status} closure={selected.acts?.closure} positions={actPositions} operations={operations} custodianAccount={selected.review.custodianAccount} />
          </div>
        )}
      </div>
    </>
  );
}
