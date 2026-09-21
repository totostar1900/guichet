import Link from "next/link";
import { FAMILY_LABEL, type IssuerProfile } from "@/data/issuer-registry";
import type { BondIssuer } from "@/data/issuers";
import type { Company } from "@/data/companies";
import type { Offer } from "@/lib/domain/types";
import type { OfferSummary } from "@/lib/domain/summary";
import { COUNTRY_CODE } from "@/lib/domain/summary";
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
      {others.length > 0 && (
        <div className={styles.others}>
          <h4>
            {t("Ses autres lignes au Guichet")} <small>{others.length}</small>
          </h4>
          {others.map(({ o: x, s }) => (
            <Link key={x.id} href={`/offres/${x.id}`} className={styles.other}>
              <span>
                <b>{x.title}</b>
                <small>
                  {s.kind} · {t(s.status)}
                </small>
              </span>
              <em className={s.gold ? styles.gold : undefined}>
                {s.hero}
                {s.heroUnit ? ` ${s.heroUnit}` : ""}
              </em>
            </Link>
          ))}
          <Link href={`/?groupe=emetteur&q=${encodeURIComponent(name)}`} className={styles.all}>
            {t("Toutes ses lignes dans la liste")} →
          </Link>
        </div>
      )}
    </div>
  );
}
