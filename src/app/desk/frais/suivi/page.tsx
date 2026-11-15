import { DeskNav } from "@/components/DeskNav";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { loadRegistry } from "@/lib/reference";
import { loadBaremeDeFrais, loadHistoriqueDeFrais } from "@/lib/policy";
import { ordreExecute } from "@/lib/frais-ordres";
import { suiviDesFrais } from "@/lib/domain/frais-suivi";
import { LIBELLE_DE_REGLE } from "@/lib/domain/frais";
import { getT } from "@/i18n/server";
import { fmt, fmtDate, localIso } from "@/lib/format";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Suivi des frais" };

/**
 * LE SUIVI DES FRAIS : trois chiffres et un tableau (planche 4A, 14 novembre 2026).
 *
 * « À encaisser » et « Encaissés » sont ce que le client paie à la maison (sa règle) sur les ordres exécutés du mois ; « À recevoir de
 * tiers » est ce que la maison attend d'un partenaire ou d'un émetteur, calculé : aucun relevé n'est encore rapproché, ce n'est donc pas
 * du reçu. Tout se calcule avec la règle de la date de chaque ordre (historique) : le mois dernier ne bouge pas quand un taux change.
 * Rien de cette page n'est lu par le client.
 */
export default async function SuiviDesFraisPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireDesk("/desk/frais/suivi");
  await loadRegistry();
  const t = await getT();
  const sp = await searchParams;
  const r = repo();
  const [intents, offres, bareme, historique] = await Promise.all([r.listIntents(), r.listOffers(), loadBaremeDeFrais(), loadHistoriqueDeFrais()]);

  const aujourdHui = new Date();
  const mois = Array.from({ length: 4 }, (_, k) => {
    const d = new Date(Date.UTC(aujourdHui.getUTCFullYear(), aujourdHui.getUTCMonth() - k, 1));
    return d.toISOString().slice(0, 7);
  });
  const choisi = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : mois[0];

  const parId = new Map(offres.map((o) => [o.id, o]));
  const ordres = intents
    .filter((i) => (i.state === "servie" || i.state === "reglee") && localIso(new Date(i.createdAt)).startsWith(choisi))
    .flatMap((i) => {
      const o = parId.get(i.offerId);
      const x = o ? ordreExecute(i, o) : undefined;
      return x ? [x] : [];
    });
  const suivi = suiviDesFrais(ordres, bareme, historique);

  return (
    <>
      <DeskNav current="/desk/frais/suivi" />
      <div className={styles.page}>
        <header className={styles.head}>
          <h1>{t("Suivi des frais")}</h1>
          <p className="muted">{t("Les ordres exécutés du mois, avec la règle de leur date. Ce que le client paie à la maison, et ce que la maison attend de tiers : le client ne lit jamais ni l'un ni l'autre séparément.")}</p>
        </header>

        <div className={styles.onglets}>
          {mois.map((m) => (
            <a key={m} href={`/desk/frais/suivi?m=${m}`} className={m === choisi ? styles.actif : undefined}>
              {m}
            </a>
          ))}
        </div>

        <div className={styles.band}>
          <div>
            <span>{t("À encaisser")}</span>
            <b>{fmt(suivi.aEncaisser)}</b>
            <small>{t("frais du client, ordres non réglés")}</small>
          </div>
          <div>
            <span>{t("Encaissés")}</span>
            <b>{fmt(suivi.encaisses)}</b>
            <small>{t("frais du client, ordres réglés")}</small>
          </div>
          <div>
            <span>{t("À recevoir de tiers")}</span>
            <b>{fmt(suivi.aRecevoirDeTiers)}</b>
            <small>{t("calculé, pas encore rapproché d'un relevé")}</small>
          </div>
        </div>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Par opération")}</h2>
            <span className="muted">{t("{n} ordres exécutés · FCFA", { n: String(suivi.lignes.length) })}</span>
          </div>
          <div className={styles.large}>
            <table className={styles.tableau}>
              <thead>
                <tr>
                  <th>{t("Opération")}</th>
                  <th className={styles.r}>{t("Ordres")}</th>
                  <th className={styles.r}>{t("Montant")}</th>
                  <th className={styles.r}>{t("Frais du client")}</th>
                  <th className={styles.r}>{t("Reçu de tiers · attendu")}</th>
                </tr>
              </thead>
              <tbody>
                {suivi.parRegle.map((l) => (
                  <tr key={l.cle}>
                    <td>{t(l.libelle)}</td>
                    <td className={styles.r}>{l.ordres}</td>
                    <td className={styles.r}>{l.ordres ? fmt(l.base) : "—"}</td>
                    <td className={styles.r}>{l.ordres ? fmt(l.fraisDuClient) : "—"}</td>
                    <td className={styles.r}>{l.ordres ? fmt(l.recetteDeTiers) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <details>
            <summary className={styles.tiroir}>{t("Le journal des ordres")}</summary>
            <div className={styles.large}>
              <table className={styles.tableau}>
                <thead>
                  <tr>
                    <th>{t("Ordre")}</th>
                    <th>{t("Date")}</th>
                    <th>{t("Opération")}</th>
                    <th className={styles.r}>{t("Frais du client")}</th>
                    <th className={styles.r}>{t("Reçu de tiers · attendu")}</th>
                    <th>{t("État")}</th>
                  </tr>
                </thead>
                <tbody>
                  {suivi.lignes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="muted">
                        {t("Aucun ordre exécuté ce mois-ci.")}
                      </td>
                    </tr>
                  )}
                  {suivi.lignes.map((l) => (
                    <tr key={l.ordre.id}>
                      <td>{l.ordre.ref}</td>
                      <td>{fmtDate(l.ordre.jour)}</td>
                      <td>{t(LIBELLE_DE_REGLE[l.cle])}</td>
                      <td className={styles.r}>{fmt(l.fraisDuClient)}</td>
                      <td className={styles.r}>{fmt(l.recetteDeTiers)}</td>
                      <td>{l.ordre.regle ? t("réglé") : t("à encaisser")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>

        <p className={styles.note}>
          {t("Ce qui est réellement reçu d'un partenaire ou d'un émetteur, et la rétrocession mensuelle sur l'encours, se rapprochent à part.")} <a href={`/desk/frais/rapprochement?m=${choisi}`}>{t("Rapprochement des frais de tiers")}</a>
        </p>
      </div>
    </>
  );
}
