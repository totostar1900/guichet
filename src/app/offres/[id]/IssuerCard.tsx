import Link from "next/link";
import { FAMILY_LABEL, type IssuerProfile } from "@/data/issuer-registry";
import type { BondIssuer } from "@/data/issuers";
import type { Company } from "@/data/companies";
import type { Offer } from "@/lib/domain/types";
import type { OfferSummary } from "@/lib/domain/summary";
import { COUNTRY_CODE, summarize } from "@/lib/domain/summary";
import { issuerLadder, marketYields } from "@/lib/domain/issuer-lines";
import { fmt } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./IssuerCard.module.css";

/**
 * The « Émetteur » pane of a fiche: who borrows, in the shape that fits
 * them. A state or a regional institution: the zone, the treasury, its
 * lines. A company or a bank: sector, city, capital and the way to its full
 * profile. Only what a source says appears; a fact the source does not give
 * is simply not there.
 */
export async function IssuerCard({ profile, o, others, company, issuer }: { profile?: IssuerProfile; o: Offer; others: { o: Offer; s: OfferSummary }[]; company?: Company; issuer?: BondIssuer }) {
  const t = await getT();
  const name = profile?.name ?? o.issuer;
  const zone = profile?.zone ?? o.country;
  const family = profile?.family;
  const sovereign = family === "etat" || family === "supranational";
  const initials = name.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 3).map((w) => w[0]).join("").toUpperCase();
  const href = profile?.href ?? (company ? `/societes/${company.mnemo.toLowerCase()}` : issuer ? `/emetteurs/${issuer.slug}` : undefined);
  const facts: [string, string][] = [];
  if (family) facts.push(["Famille", t(FAMILY_LABEL[family])]);
  if (zone === "CEMAC") facts.push(["Zone", "CEMAC"]);
  else facts.push(["Pays", t(o.countryName)]);
  if (profile?.city ?? company?.city ?? issuer?.city) facts.push(["Siège", (profile?.city ?? company?.city ?? issuer?.city)!]);
  if (!sovereign && (profile?.sector ?? company?.sector ?? issuer?.sector)) facts.push(["Secteur", t((profile?.sector ?? company?.sector ?? issuer?.sector)!)]);
  if (company?.shareCapital) facts.push(["Capital social", `${fmt(company.shareCapital)} FCFA`]);
  else if (issuer?.shareCapital) facts.push(["Capital social", `${fmt(issuer.shareCapital)} FCFA`]);
  if (company?.listedOn) facts.push(["Cotée depuis", company.listedOn.slice(0, 4)]);
  const website = profile?.website ?? company?.website ?? issuer?.website;
  const activity = profile?.activity ?? company?.activity ?? issuer?.activity;
  const source = profile?.source;
  // La fiche qu'on lit garde sa place dans l'échelle : sans elle, la section se
  // lit comme une liste d'autres possibilités alors que c'est un rayon où le
  // client doit pouvoir se situer.
  const years = others.length > 0 ? issuerLadder([{ o, s: summarize(o, new Date()) }, ...others], name, o.id) : [];
  const priced = marketYields(years);
  const lead =
    priced === 0
      ? t("Rangées par échéance. Le cours de ces lignes est au pair ou absent : le chiffre donné est le coupon inscrit au contrat.")
      : priced === 1
        ? t("Rangées par échéance. Une ligne affiche un rendement de marché : ce qu'un achat au cours du jour procure. Ailleurs le cours est au pair ou absent, et le chiffre donné est le coupon du contrat.")
        : t("Rangées par échéance. {n} lignes affichent un rendement de marché : ce qu'un achat au cours du jour procure. Ailleurs le cours est au pair ou absent, et le chiffre donné est le coupon du contrat.", { n: String(priced) });
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={`${styles.badge} ${zone === "CEMAC" ? styles.cemac : ""}`}>{zone === "CEMAC" ? "CEMAC" : initials || COUNTRY_CODE[o.country]}</span>
        <div className={styles.who}>
          <b>{name}</b>
          {(profile?.aliases?.length ?? 0) > 1 && <small>{t("aussi écrit")} : {profile!.aliases.filter((a) => a !== name).slice(0, 3).join(" · ")}</small>}
        </div>
      </div>
      {facts.length > 0 && (
        <div className={styles.facts}>
          {facts.map(([k, v]) => (
            <div key={k}>
              <span>{t(k)}</span>
              <b>{v}</b>
            </div>
          ))}
        </div>
      )}
      {activity && <p className={styles.activity}>{t(activity)}</p>}
      {(source || website || href) && (
        <p className={styles.source}>
          {source && (
            <>
              {t("Source")} : {source}
            </>
          )}
          {website && (
            <>
              {source ? " · " : ""}
              <a href={website} target="_blank" rel="noreferrer">
                {website.replace(/^https?:\/\//, "")}
              </a>
            </>
          )}
          {href && (
            <>
              {source || website ? " · " : ""}
              <Link href={href}>{t(company ? "Analyse complète : comptes certifiés, ratios, dividendes" : "Profil de l'émetteur : comptes publiés, actionnariat, autres emprunts")} →</Link>
            </>
          )}
        </p>
      )}
      {years.length > 0 && (
        <div className={styles.others}>
          <div>
            <h4>
              {t("Ses autres lignes au Guichet")} <small>{others.length}</small>
            </h4>
            <p className={styles.lead}>{lead}</p>
          </div>
          <div className={styles.headWrap}>
            <div />
            <div className={styles.headRow}>
              <span className={styles.cNom}>{t("Ligne")}</span>
              <span className={styles.cEch}>{t("Échéance")}</span>
              <span className={styles.cCours}>{t("Cours")}</span>
              <span className={styles.cRdt}>{t("Rendement")}</span>
            </div>
          </div>
          {years.map((y) => (
            <div key={y.year || y.kind} className={`${styles.group} ${y.kind === "echues" ? styles.spent : ""}`}>
              <div className={styles.year}>
                <span className={y.kind === "annee" ? undefined : styles.tag}>{y.kind === "annee" ? y.year : y.kind === "sans" ? t("Sans échéance") : t("Échues")}</span>
              </div>
              <div className={styles.rows}>
                {y.lines.map((l) => {
                  const cells = (
                    <>
                      <span className={styles.cNom}>
                        <b className={styles.longName} title={l.title}>
                          {l.title}
                        </b>
                        <b className={styles.shortName} title={l.title}>
                          {l.short}
                        </b>
                        {l.here && <small className={styles.hereTag}>{t("cette fiche")}</small>}
                      </span>
                      <span className={styles.cEch}>{l.day ?? (l.approx ? t("année seule") : "—")}</span>
                      <span className={`${styles.cCours} ${l.price ? "" : styles.none}`}>{l.price ?? "—"}</span>
                      <span className={styles.cRdt}>
                        {l.basis === "aucun" ? (
                          <b className={styles.none}>—</b>
                        ) : l.basis === "coupon" ? (
                          <>
                            <b className={styles.plain}>{l.figure}</b> <small className={styles.qual}>{t("coupon")}</small>
                          </>
                        ) : (
                          <>
                            <b className={styles.gold}>{l.figure}</b>
                            {l.price && <small className={styles.underFig}>{t("cours {p}", { p: l.price })}</small>}
                          </>
                        )}
                      </span>
                    </>
                  );
                  return l.here ? (
                    <div key={l.id} className={`${styles.row} ${styles.hereRow}`}>
                      {cells}
                    </div>
                  ) : (
                    <Link key={l.id} href={`/offres/${l.id}`} className={styles.row}>
                      {cells}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          <Link href={`/?groupe=emetteur&q=${encodeURIComponent(name)}`} className={styles.all}>
            {t("Toutes ses lignes dans la liste")} →
          </Link>
        </div>
      )}
    </div>
  );
}
