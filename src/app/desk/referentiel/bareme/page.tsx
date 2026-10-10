import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { requireResponsable } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { activitesDeTous, baremeCourant, baremeEnBrouillon } from "@/lib/desk/activite-data";
import { INGREDIENT_LABEL, INGREDIENTS, sommeDesPoids } from "@/lib/domain/activite";
import { comptesDemo } from "@/lib/domain/demo";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { BaremeForm } from "./BaremeForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Barème de l'activité" };

/**
 * LE BARÈME, ET CE QUE SA PUBLICATION DÉPLACERAIT.
 *
 * Les poids sont au desk, pas dans le code : ils sont arbitraires, et une
 * maison doit pouvoir les discuter sans déployer. Mais un barème se publie en
 * VOYANT QUI BOUGE, parce que les cohortes commandent les envois : trois
 * clients qui changent de groupe, ce sont trois personnes qui recevront, ou
 * cesseront de recevoir, les annonces de lignes.
 */
export default async function BaremePage() {
  await requireResponsable("/desk/referentiel/bareme");
  const t = await getT();
  const [courant, brouillon, contacts] = await Promise.all([baremeCourant(), baremeEnBrouillon(), repo().listContacts().catch(() => [])]);
  const demo = comptesDemo(contacts);
  const vrais = contacts.filter((c) => !demo.has(c.id));

  /* Les deux lectures, l'actuelle et celle que le brouillon poserait : c'est
     la comparaison qui fait l'écran, pas le formulaire. */
  const [avant, apres] = await Promise.all([activitesDeTous(courant), brouillon ? activitesDeTous(brouillon) : undefined]);
  const bouges = apres
    ? vrais
        .map((c) => ({ nom: c.name, a: avant.get(c.id)?.score ?? 0, b: apres.get(c.id)?.score ?? 0 }))
        .filter((x) => Math.abs(x.b - x.a) >= 1)
        .sort((x, y) => Math.abs(y.b - y.a) - Math.abs(x.b - x.a))
    : [];

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
              {t("Barème de l'activité")}
            </h1>
          </div>
          <span className="right" />
          <span className="st">{t("barème v{n}", { n: String(courant.version) })}</span>
        </div>
        <p className="muted">
          {t(
            "Les poids sont au desk, pas dans le code. Mais un score ne se compare qu'à barème égal : chaque barème porte un numéro et une date, tout score affiché dit duquel il sort, et les scores d'hier gardent le barème d'hier.",
          )}
        </p>
        {courant.publieLe && (
          <p className="muted" style={{ fontSize: ".82rem" }}>
            {t("Publié le {d} par {q}.", { d: fmtDateTime(courant.publieLe), q: courant.publiePar ?? "—" })}
            {courant.quoi ? ` ${courant.quoi}` : ""}
          </p>
        )}
      </div>

      <BaremeForm courant={courant} brouillon={brouillon} />

      {brouillon && (
        <div className="panel">
          <div className="panel-h">
            <h2>{t("Ce que la publication déplacerait")}</h2>
            <span className="muted" style={{ fontSize: ".8rem" }}>
              {t("{n} client(s) hors démonstration", { n: String(vrais.length) })}
            </span>
          </div>
          {bouges.length === 0 ? (
            <p className="muted" style={{ padding: "0 var(--s-6) var(--s-5)" }}>
              {t("Personne ne bouge d'un point. Le barème change, le classement non.")}
            </p>
          ) : (
            <div className="scroll-x">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t("Client")}</th>
                    <th className="r">{t("Aujourd'hui")}</th>
                    <th className="r">{t("Après publication")}</th>
                    <th className="r">{t("Écart")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bouges.map((x) => (
                    <tr key={x.nom}>
                      <td>{x.nom}</td>
                      <td className="r num">{x.a}</td>
                      <td className="r num">{x.b}</td>
                      <td className="r num">{x.b > x.a ? `+${x.b - x.a}` : x.b - x.a}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted" style={{ fontSize: ".82rem", padding: "0 var(--s-6) var(--s-5)" }}>
            {t(
              "Un barème se publie en voyant qui bouge, jamais à l'aveugle : les cohortes commandent les envois, et un client qui change de groupe recevra, ou cessera de recevoir, les annonces de lignes.",
            )}
          </p>
        </div>
      )}

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Les cinq ingrédients")}</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {t("somme : {n} sur 100", { n: String(sommeDesPoids(brouillon ?? courant)) })}
          </span>
        </div>
        <ul style={{ margin: 0, padding: "0 var(--s-6) var(--s-5) var(--s-9)", lineHeight: 1.7 }}>
          {INGREDIENTS.map((k) => (
            <li key={k}>
              {t(INGREDIENT_LABEL[k])} <span className="muted">· {(brouillon ?? courant).poids[k]}</span>
            </li>
          ))}
        </ul>
        <p className="muted" style={{ fontSize: ".82rem", padding: "0 var(--s-6) var(--s-5)" }}>
          {t(
            "Une consultation ne pèse rien ici : elle nourrit la cadence et le fil des gestes. Sinon regarder vaudrait acheter, et le classement de la maison deviendrait un classement des curieux.",
          )}
        </p>
      </div>
    </>
  );
}
