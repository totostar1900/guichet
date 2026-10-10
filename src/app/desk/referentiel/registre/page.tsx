import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { requireResponsable } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { getT } from "@/i18n/server";
import { registreEnBrouillon, registrePublie } from "@/lib/desk/registre-data";
import { ecartVivant, MOTIFS_D_ECART } from "@/lib/domain/registre-ecartes";
import { InscrireForm, LeverForm, PublierForm } from "./RegistreForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Registre des personnes écartées" };

/**
 * LE REGISTRE, ET POURQUOI IL EXISTE.
 *
 * Une mesure vit sur un compte : fermer le compte l'efface, et la même
 * personne revient le lendemain avec une autre adresse. C'est le seul
 * endroit du produit où tout le travail de la tenue et des mesures s'annule
 * d'un geste. Ce registre vit à côté des comptes.
 */
export default async function RegistrePage() {
  await requireResponsable("/desk/referentiel/registre");
  const t = await getT();
  const [publies, brouillons] = await Promise.all([registrePublie(), registreEnBrouillon()]);
  const enBrouillon = new Set(brouillons.map((b) => b.id));
  const now = new Date();
  const vivants = publies.filter((e) => ecartVivant(e, now));
  const eteints = publies.filter((e) => !ecartVivant(e, now));

  return (
    <>
      <DeskNav current="/desk/referentiel" />
      <div className="panel">
        <div className="panel-h">
          <div>
            <div className="eyebrow">
              {t("Référentiel")} · <Link href="/desk/referentiel">{t("retour")}</Link>
            </div>
            <h1 className="display" style={{ margin: 0 }}>
              {t("Registre des personnes écartées")}
            </h1>
          </div>
          <span className="right" />
          <span className="st">{t("{n} inscription(s) vivante(s)", { n: String(vivants.length) })}</span>
        </div>
        <p className="muted">
          {t(
            "Une mesure vit sur un compte : fermer le compte l'efface, et la même personne peut revenir le lendemain avec une autre adresse et un autre numéro. Ce registre vit à côté des comptes, et c'est pour cela qu'il existe.",
          )}
        </p>
        <p className="muted" style={{ fontSize: ".82rem" }}>
          {t(
            "Il ne refuse jamais tout seul : une correspondance lève un drapeau sur le dossier, et une personne nommée tranche en disant pourquoi. C'est un filet, pas un mur : il attrape celui qui revient, pas celui qui se fabrique une identité.",
          )}
        </p>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Inscrire quelqu'un")}</h2>
          {brouillons.length > 0 && <span className="st recue">{t("{n} brouillon(s) en attente", { n: String(brouillons.length) })}</span>}
        </div>
        <InscrireForm />
      </div>

      {brouillons.length > 0 && (
        <div className="panel">
          <div className="panel-h">
            <h2>{t("Ce que la publication poserait")}</h2>
          </div>
          <ul style={{ margin: 0, padding: "0 var(--s-6) var(--s-5) var(--s-9)", lineHeight: 1.7 }}>
            {brouillons.map((b) => (
              <li key={b.id}>
                {b.leveeLe ? (
                  <>
                    <b>{t("Levée")}</b> : {b.nom} <span className="muted">· {b.leveeMotif}</span>
                  </>
                ) : (
                  <>
                    <b>{b.nom}</b> <span className="muted">· {t(MOTIFS_D_ECART[b.motif].libelle)}</span>
                    {b.pieceNumero ? <span className="muted"> · {b.pieceType ?? t("pièce")} {b.pieceNumero}</span> : null}
                    {b.naissance ? <span className="muted"> · {b.naissance}</span> : null}
                    <span className="muted"> · {b.jusquAu ? t("jusqu'au {d}", { d: b.jusquAu }) : t("sans terme")}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
          <PublierForm n={brouillons.length} />
        </div>
      )}

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Les inscriptions vivantes")}</h2>
        </div>
        {vivants.length === 0 ? (
          <p className="muted" style={{ padding: "0 var(--s-6) var(--s-5)" }}>
            {t("Personne. C'est le bon état : le registre n'est pas une liste qu'on remplit, c'est une exception qu'on documente.")}
          </p>
        ) : (
          <div className="scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Nom")}</th>
                  <th>{t("Pièce")}</th>
                  <th>{t("Motif")}</th>
                  <th>{t("Terme")}</th>
                  <th>{t("Inscrit")}</th>
                  <th>{t("Lever")}</th>
                </tr>
              </thead>
              <tbody>
                {vivants.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <b>{e.nom}</b>
                      {e.naissance ? <small className="muted"> · {e.naissance}</small> : null}
                      {e.note ? (
                        <>
                          <br />
                          <small className="muted">{e.note}</small>
                        </>
                      ) : null}
                    </td>
                    <td>{e.pieceNumero ? `${e.pieceType ?? "?"} ${e.pieceNumero}` : <span className="muted">{t("aucune")}</span>}</td>
                    <td>
                      {t(MOTIFS_D_ECART[e.motif].libelle)}
                      {MOTIFS_D_ECART[e.motif].conformite && <small className="muted"> · {t("ne se dit pas")}</small>}
                    </td>
                    <td>{e.jusquAu ?? <span className="muted">{t("sans terme")}</span>}</td>
                    <td>
                      <small className="muted">
                        {fmtDateTime(e.le)} · {e.par}
                      </small>
                    </td>
                    <td>{enBrouillon.has(e.id) ? <small className="muted">{t("levée en brouillon")}</small> : <LeverForm e={e} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted" style={{ fontSize: ".82rem", padding: "0 var(--s-6) var(--s-5)" }}>
          {t(
            "Un motif de conformité ne se dit jamais à la personne : prévenir quelqu'un qu'il est soupçonné est une faute au regard des textes LBC/FT. Ce silence est la loi, pas une pudeur.",
          )}
        </p>
      </div>

      {eteints.length > 0 && (
        <div className="panel">
          <div className="panel-h">
            <h2>{t("Levées et échues")}</h2>
            <span className="muted" style={{ fontSize: ".8rem" }}>
              {t("elles n'écartent plus personne")}
            </span>
          </div>
          <ul style={{ margin: 0, padding: "0 var(--s-6) var(--s-5) var(--s-9)", lineHeight: 1.7 }}>
            {eteints.map((e) => (
              <li key={e.id}>
                {e.nom} <span className="muted">· {t(MOTIFS_D_ECART[e.motif].libelle)}</span>
                {e.leveeLe ? (
                  <span className="muted">
                    {" "}
                    · {t("levée le {d} par {q}", { d: fmtDateTime(e.leveeLe), q: e.leveePar ?? "—" })}
                    {e.leveeMotif ? ` · ${e.leveeMotif}` : ""}
                  </span>
                ) : (
                  <span className="muted"> · {t("échue le {d}", { d: e.jusquAu ?? "—" })}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="muted" style={{ fontSize: ".82rem", padding: "0 var(--s-6) var(--s-5)" }}>
            {t(
              "Une inscription levée n'est jamais supprimée : savoir qu'on a écarté quelqu'un puis qu'on s'est ravisé vaut mieux qu'une ligne disparue, et c'est la seule façon de répondre à quelqu'un qui demande pourquoi il a été refusé l'an dernier.",
            )}
          </p>
        </div>
      )}
    </>
  );
}
