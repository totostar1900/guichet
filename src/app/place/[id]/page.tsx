import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { fmt, fmtDate } from "@/lib/format";
import { facialLisible } from "@/lib/domain/facial-lisible";
import { annoncesPubliees, peutParticiper, placeOuverte, propositionsRecues } from "@/lib/place-donnees";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { accepterAction, refuserAction } from "../actions";
import { Reponse } from "./Reponse";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Annonce" };

/** Une annonce : deux gestes pour répondre (accepter le prix, proposer un autre prix) ; l'annonceur lit les propositions, sans nom, et en accepte une. */
export default async function AnnoncePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession(`/place/${id}`);
  if (!placeOuverte() || !peutParticiper(s)) notFound();
  const t = await getT();
  const a = (await annoncesPubliees(s.userId)).find((x) => x.id === id);
  if (!a) notFound();
  const recues = a.mienne ? await propositionsRecues(s, id) : null;
  const prix = a.unite === "pct" ? `${a.prix.toLocaleString("fr-FR")} %` : `${fmt(a.prix)} FCFA`;
  return (
    <Glissement>
      <div className="pile">
        <EnTete titre={a.titre} phrase={`${a.sens === "vend" ? t("À vendre") : t("Recherché")} · ${fmtDate(a.deposeeLe)}`} />
        <section className={styles.resume}>
          <strong className={styles.facial}>{facialLisible(a.facialOffert)} FCFA</strong>
          <span>{fmt(a.titresOfferts)} {t("titres")} · {a.decoupage ? t("découpage permis") : t("tout ou rien")}</span>
          <span className={styles.prix}>{prix}</span>
        </section>
        {a.mienne ? (
          <section className={styles.recues}>
            <h2>{t("Propositions reçues")}</h2>
            {!recues || recues.liste.length === 0 ? (
              <p className={styles.vide}>{t("Aucune proposition pour le moment.")}</p>
            ) : (
              <ul>
                {recues.liste.map((p) => (
                  <li key={p.id} className={styles.proposition}>
                    <span>
                      <strong>{facialLisible(p.facial)} FCFA</strong> · {fmt(p.titres)} {t("titres")} · {a.unite === "pct" ? `${p.prix.toLocaleString("fr-FR")} %` : `${fmt(p.prix)} FCFA`}
                    </span>
                    {p.etat === "ouverte" ? (
                      <span className={styles.gestes}>
                        <form action={accepterAction}>
                          <input type="hidden" name="annonceId" value={a.id} />
                          <input type="hidden" name="propositionId" value={p.id} />
                          <button className="btn primary sm" type="submit">{t("Accepter")}</button>
                        </form>
                        <form action={refuserAction}>
                          <input type="hidden" name="annonceId" value={a.id} />
                          <input type="hidden" name="propositionId" value={p.id} />
                          <button className="btn sm" type="submit">{t("Refuser")}</button>
                        </form>
                      </span>
                    ) : (
                      <span className={styles.vide}>{p.etat === "acceptee" ? t("Acceptée : accord de principe pour 72 h") : t("Refusée")}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <Reponse annonceId={a.id} prix={a.prix} unite={a.unite} decoupage={a.decoupage} titresOfferts={a.titresOfferts} nominal={a.facial / a.titres} />
        )}
      </div>
    </Glissement>
  );
}
