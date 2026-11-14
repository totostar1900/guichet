import { DeskNav } from "@/components/DeskNav";
import { RegleForm } from "./Formulaire";
import { requireDesk } from "@/lib/auth";
import { loadBaremeDeFrais } from "@/lib/policy";
import { CLES_DE_REGLE, LIBELLE_DE_REGLE, enVigueur, premierDepartPossible, type RegleDeFrais } from "@/lib/domain/frais";
import { getT } from "@/i18n/server";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Frais" };

/**
 * LE BARÈME DES FRAIS : cinq cases, lues d'un regard (planche du 14 novembre 2026, option 2A).
 *
 * Chaque case est une règle : ce que le client couvre, ce que la maison reçoit d'un partenaire ou d'un émetteur, et la date de
 * départ. Le client ne lit que la première colonne, sous le mot « Frais », sans destination ; la seconde ne sort pas de cette page.
 * La direction arrête une règle, l'audit garde l'avant et l'après, et une règle sans date de départ calcule zéro.
 */
export default async function FraisPage() {
  await requireDesk("/desk/frais");
  const t = await getT();
  const bareme = await loadBaremeDeFrais();
  const jour = new Date().toISOString().slice(0, 10);
  const premier = fmtDate(premierDepartPossible(jour));

  const client = (r: RegleDeFrais) => (r.clientPct > 0 ? `${fmtPct(r.clientPct, 2)}${r.clientMin > 0 ? ` · ${t("min. {m}", { m: fmt(r.clientMin) })}` : ""}${r.clientMax > 0 ? ` · ${t("max. {m}", { m: fmt(r.clientMax) })}` : ""}` : "—");
  const tiers = (r: RegleDeFrais) => {
    const bornes = (min: number, max: number) => `${min > 0 ? ` · ${t("min. {m}", { m: fmt(min) })}` : ""}${max > 0 ? ` · ${t("max. {m}", { m: fmt(max) })}` : ""}`;
    const op = [r.tiersPct > 0 ? fmtPct(r.tiersPct, 2) : "", r.tiersPartDesDroitsPct > 0 ? t("{p} % des droits", { p: String(r.tiersPartDesDroitsPct) }) : ""].filter(Boolean).join(" + ");
    const p = [op ? `${op}${bornes(r.tiersMin, r.tiersMax)}` : "", r.tiersEncoursPct > 0 ? `${t("encours {p} %/an", { p: String(r.tiersEncoursPct) })}${bornes(r.tiersEncoursMin, r.tiersEncoursMax)}` : ""].filter(Boolean);
    return p.length ? p.join(" · ") : "—";
  };

  return (
    <>
      <DeskNav current="/desk/frais" />
      <div className={styles.page}>
        <header className={styles.head}>
          <h1>{t("Frais")}</h1>
          <p className="muted">
            {t("Ce que le client couvre sur chaque opération, ce que la maison reçoit de tiers, et la date de départ de chaque règle. Tout est à zéro tant que la direction n'a rien arrêté ; le client ne lit que ses frais, sans destination.")}
          </p>
        </header>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Le barème")}</h2>
            <span className="muted">{t("préavis de 30 jours : le {d} au plus tôt", { d: premier })}</span>
          </div>
          <div className={styles.large}>
            <table className={styles.tableau}>
              <thead>
                <tr>
                  <th>{t("Opération")}</th>
                  <th>{t("Frais du client")}</th>
                  <th>{t("Reçu de tiers · desk seulement")}</th>
                  <th>{t("Départ")}</th>
                </tr>
              </thead>
              <tbody>
                {CLES_DE_REGLE.map((cle) => {
                  const r = bareme[cle];
                  return (
                    <tr key={cle}>
                      <td>{t(LIBELLE_DE_REGLE[cle])}</td>
                      <td>{client(r)}</td>
                      <td>{tiers(r)}</td>
                      <td>
                        {r.effetLe ? <span className={enVigueur(r, jour) ? "st reglee" : "st transmise"}>{enVigueur(r, jour) ? t("en vigueur") : fmtDate(r.effetLe)}</span> : <span className="muted">{t("non fixé")}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {CLES_DE_REGLE.map((cle) => (
          <section key={cle} className="panel">
            <details className={styles.fiche}>
              <summary>{t(LIBELLE_DE_REGLE[cle])}</summary>
              <div className={styles.pb}>
                <RegleForm cle={cle} regle={bareme[cle]} fonds={cle.startsWith("fonds.")} premier={premier} />
              </div>
            </details>
          </section>
        ))}
      </div>
    </>
  );
}
