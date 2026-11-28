import { DeskNav } from "@/components/DeskNav";
import { requireDesk } from "@/lib/auth";
import { isResponsable } from "@/lib/auth/types";
import { getT } from "@/i18n/server";
import { fmt, fmtDateTime } from "@/lib/format";
import { facialLisible } from "@/lib/domain/facial-lisible";
import { accordsDuDesk, fourchette } from "@/lib/place-donnees";
import { fraisConvenus, passage, poserFourchette } from "./actions";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Place de marché : accords" };

/**
 * L'ARRANGEMENT (planche 6A, second écran) : le desk négocie au téléphone, l'application garde le résultat. Les frais se conviennent partie par partie dans la fourchette posée par la direction ; hors
 * fourchette, la direction pose une dérogation motivée. Blocage des fonds et des titres, puis règlement, à la main du desk.
 */
export default async function AccordsDuDesk() {
  const s = await requireDesk("/desk/place/accords");
  const t = await getT();
  const [liste, four] = await Promise.all([accordsDuDesk(), fourchette()]);
  const direction = isResponsable(s);
  return (
    <div className={styles.page}>
      <DeskNav current="/desk/place" />
      <header>
        <h1>{t("Place de marché : accords")}</h1>
        <p>{t("Les frais se conviennent au téléphone avec chaque partie ; ici on en garde le résultat. Hors fourchette, la direction pose une dérogation motivée.")}</p>
      </header>
      <section className={styles.bloc}>
        <h2>{t("Fourchette de frais")}</h2>
        <p className={styles.meta}>{four.posee ? `${four.f.pctMin} % à ${four.f.pctMax} % de la valeur, entre ${fmt(four.f.plancher)} et ${fmt(four.f.plafond)} FCFA` : t("Aucune fourchette posée : tout montant demande une dérogation.")}</p>
        {direction ? (
          <form action={poserFourchette} className={styles.form}>
            <input name="pctMin" placeholder={t("% bas")} defaultValue={four.posee ? four.f.pctMin : ""} inputMode="decimal" />
            <input name="pctMax" placeholder={t("% haut")} defaultValue={four.posee ? four.f.pctMax : ""} inputMode="decimal" />
            <input name="plancher" placeholder={t("Plancher (FCFA)")} defaultValue={four.posee ? four.f.plancher : ""} inputMode="numeric" />
            <input name="plafond" placeholder={t("Plafond (FCFA)")} defaultValue={four.posee ? four.f.plafond : ""} inputMode="numeric" />
            <button className="btn primary sm" type="submit">{t("Poser")}</button>
          </form>
        ) : (
          <p className={styles.meta}>{t("Seule la direction pose la fourchette.")}</p>
        )}
      </section>
      <section className={styles.bloc}>
        <h2>{t("Accords")}</h2>
        {liste.length === 0 ? (
          <p className={styles.meta}>{t("Aucun accord pour le moment.")}</p>
        ) : (
          <ul className={styles.liste}>
            {liste.map((x) => (
              <li key={x.id} className={styles.accord}>
                <p>
                  <strong>{x.titre}</strong> · {x.etat} · {fmt(x.quantite)} {t("titres")} · {facialLisible(x.facial)} FCFA · {x.unite === "pct" ? `${x.prix.toLocaleString("fr-FR")} %` : `${fmt(x.prix)} FCFA`} · {t("valeur")} {fmt(x.valeur)} FCFA
                </p>
                <p className={styles.meta}>
                  {t("Vendeur")} : {x.vendeur} · {t("Acheteur")} : {x.acheteur} · {t("expire")} {fmtDateTime(x.expireLe)} · {t("fourchette")} {fmt(x.permis.min)} – {fmt(x.permis.max)} FCFA
                </p>
                <p className={styles.meta}>
                  {t("Signatures")} : {x.signatures.vendeur ? t("vendeur ✓") : t("vendeur —")} · {x.signatures.acheteur ? t("acheteur ✓") : t("acheteur —")} · {t("Blocage")} : {x.bloque.fonds ? t("fonds ✓") : t("fonds —")} · {x.bloque.titres ? t("titres ✓") : t("titres —")}
                </p>
                {x.etat === "accord_de_principe" &&
                  (["vendeur", "acheteur"] as const).map((partie) => (
                    <form key={partie} action={fraisConvenus} className={styles.form}>
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="partie" value={partie} />
                      <span className={styles.partie}>{t(partie === "vendeur" ? "Frais du vendeur" : "Frais de l'acheteur")}{x.frais[partie] ? ` : ${fmt(x.frais[partie]!.montant)} FCFA` : ""}</span>
                      <input name="montant" placeholder={t("Montant (FCFA)")} inputMode="numeric" />
                      <input name="motif" placeholder={t("Motif")} />
                      {direction && <input name="derogation" placeholder={t("Motif de la dérogation (hors fourchette)")} />}
                      <button className="btn sm" type="submit">{t("Convenir")}</button>
                    </form>
                  ))}
                <form action={passage} className={styles.gestes}>
                  <input type="hidden" name="id" value={x.id} />
                  {x.etat === "signe" && !x.bloque.fonds && <button className="btn sm" name="passage" value="bloquer_fonds" type="submit">{t("Bloquer les fonds")}</button>}
                  {x.etat === "signe" && !x.bloque.titres && <button className="btn sm" name="passage" value="bloquer_titres" type="submit">{t("Bloquer les titres")}</button>}
                  {x.etat === "bloque" && <button className="btn primary sm" name="passage" value="regler" type="submit">{t("Régler l'échange")}</button>}
                  {(x.etat === "signe" || x.etat === "bloque") && <button className="btn sm" name="passage" value="echouer" type="submit">{t("Échec du règlement")}</button>}
                  {x.etat === "accord_de_principe" && <button className="btn sm" name="passage" value="annuler" type="submit">{t("Annuler l'accord")}</button>}
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
