import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getLang, getT } from "@/i18n/server";
import { COMPANY } from "@/lib/config";
import { fmtDateTime } from "@/lib/format";
import { conventionAJour, conventionAReprendre, conventionSignable } from "@/lib/kyc/checklist";
import { canalDuCode } from "@/lib/kyc/canal";
import { PASSAGES, passage, resolvePassages } from "@/lib/documents/passages";
import { CONVENTION_CHANGE } from "@/data/legal";
import { Signer } from "./Signer";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Votre convention") };
}

/**
 * LA CONVENTION A SA PAGE, ET RIEN D'AUTRE NE S'Y PASSE.
 *
 * Elle a longtemps vécu comme une section du dossier d'ouverture : huit puces
 * d'« essentiel », un lien vers le texte complet, le bloc de signature, le
 * tout entre l'identité, les pièces et le profil. Le client y faisait trois
 * choses de natures différentes dans un même écran, et la seule qui l'engage
 * était la moins visible. Demandé le 9 octobre 2026 : « dédier une page
 * entière à cette tâche, pour le moment c'est un mélange des genres ».
 *
 * CE QUE LA PAGE DIT, DANS CET ORDRE : les deux temps (lire, signer), la
 * BALANCE (ce que vous nous donnez, ce que nous vous devons), le texte
 * complet replié, puis la signature seule en bas. La balance est le coeur :
 * une convention est un échange, et huit puces à la file ne le disaient pas.
 *
 * LE TEXTE COMPLET EST DANS LA PAGE, et non derrière un lien qui sort. C'est
 * la leçon de la visionneuse : ouvert à part, le PDF emportait l'app
 * installée, et on demandait une signature sur un texte que le signataire ne
 * pouvait pas lire. Les articles viennent du même registre que l'exemplaire
 * signé (resolvePassages), donc le lu et le signé ne peuvent pas diverger.
 *
 * LES DATES SE FORMATENT ICI, côté serveur, et descendent en chaînes : la
 * langue vit dans deux graphes de modules qui s'ignorent, et une date rendue
 * dans un composant client sort parfois dans l'autre langue.
 */
export default async function ConventionPage() {
  const t = await getT();
  const lang = await getLang();
  const s = await requireSession("/ouvrir-un-compte/convention");
  const file = await repo().getClientFileByUser(s.userId);
  /* SANS DOSSIER, IL N'Y A RIEN À SIGNER : la page ne se lit pas comme un
     document public, elle est l'acte d'un dossier. On renvoie là où il se
     remplit, plutôt que d'afficher une convention sans titulaire. */
  if (!file) redirect("/ouvrir-un-compte");

  const signable = conventionSignable(file);
  const reprise = conventionAReprendre(file);
  const acceptee = conventionAJour(file);
  const approuve = file.status === "approuve";
  const canal = signable ? await canalDuCode(s.userId, file) : undefined;

  const { text } = await resolvePassages("convention", lang);
  /* Les mêmes variables que l'exemplaire imprimé : un article qui citerait ici
     une autre société ou un autre agrément que le PDF serait un faux. */
  const vars = {
    societe: COMPANY.legalName,
    agrement: COMPANY.licence,
    email: COMPANY.email,
    categorie: file.profile.category === "professionnel" ? t("professionnel") : t("non professionnel"),
  };
  const articles = (PASSAGES.convention ?? []).map((d) => ({ key: d.key, label: t(d.label), body: passage("convention", d.key, text, vars) }));

  const approuveLe = file.review.reviewedAt ? fmtDateTime(file.review.reviewedAt) : undefined;
  const signeeLe = file.consents.conventionAt ? fmtDateTime(file.consents.conventionAt) : undefined;

  /* LES DEUX TEMPS, dits avant tout le reste : lire est un temps, signer en
     est un autre, et le dossier approuvé est la porte des deux. */
  const temps: { n: string; etat: "fait" | "ici" | "attente"; titre: string; sous: string }[] = [
    {
      n: approuve ? "✓" : "·",
      etat: approuve ? "fait" : "attente",
      titre: t(approuve ? "Votre dossier est approuvé" : "Votre dossier est à l'examen"),
      sous: approuve ? (approuveLe ?? t("le desk a statué")) : t("la convention s'ouvre à la décision"),
    },
    { n: "1", etat: "ici", titre: t("Lire"), sous: t("L'essentiel, puis le texte complet") },
    {
      /* Un pas fait porte la même marque partout : le chiffre qui reste sur
         une étape accomplie se lit comme une étape qui attend encore. */
      n: acceptee ? "✓" : "2",
      etat: acceptee ? "fait" : signable ? "ici" : "attente",
      titre: t("Signer"),
      sous: acceptee ? (signeeLe ?? t("c'est fait")) : t("Par un code reçu, une fois"),
    },
  ];

  const donne = [
    { b: t("Mandat d'ouvrir vos comptes"), p: t("Vous nous autorisez à ouvrir en votre nom les comptes nécessaires à vos ordres. Vous ne signerez rien d'autre pour cela, et l'ouverture est sans frais.") },
    { b: t("L'origine de vos fonds"), p: t("L'argent doit venir d'un compte à votre nom. Un versement d'un tiers est refusé et restitué.") },
    { b: t("Vos données"), p: t("Conservées dix ans après la fin de la relation, comme la lutte contre le blanchiment l'exige. Ni vendues ni cédées.") },
  ];
  const devons = [
    { b: t("Vos titres à votre nom"), p: t("Dématérialisés, inscrits à votre nom chez le dépositaire. Purpose Capital n'est qu'intermédiaire.") },
    { b: t("L'argent ne précède jamais l'ordre"), p: t("Un ordre naît de votre signature. S'il est réglé aussitôt par un moyen authentifié, le reçu vaut signature.") },
    { b: t("Votre solde, sous 72 heures"), p: t("Vous le réclamez quand vous voulez : il part sous 72 heures ouvrables, vers votre compte bancaire et vers lui seul.") },
    { b: t("Un prix connu d'avance"), p: t("Aucun frais d'ouverture."), lien: { href: "/moi/tarifs", nom: t("Lire l'annexe tarifaire →") } },
    { b: t("Une trace de chaque opération"), p: t("Un avis d'opéré par opération, un relevé de position, et la médiation COSUMAF si rien ne va.") },
  ];
  /* LA MARQUE DE LA REPRISE PORTE SUR LA COLONNE QUI A CHANGÉ, et non sur la
     page entière : on ne refait pas lire dix articles pour une phrase. */
  const marque = reprise ? CONVENTION_CHANGE.cote : undefined;

  return (
    <div className={styles.page}>
      <Link href="/ouvrir-un-compte" className={styles.retour}>
        ← {t("Mon dossier d'ouverture")}
      </Link>
      <div className={styles.tete}>
        <div className="eyebrow">{t("Convention de compte-titres")}</div>
        <h1 className="display">{t("Votre convention")}</h1>
        <p className={styles.lead}>{t("C'est le contrat entre vous et Purpose Capital. Il dit ce que vous nous confiez, et ce que nous vous devons en retour. Rien d'autre ne se passe sur cette page.")}</p>
      </div>

      {reprise && (
        <div className={styles.reprise}>
          <b>{t("Ce qui a changé depuis votre signature")}</b>
          <p>{t(CONVENTION_CHANGE.quoi)}</p>
          <p className={styles.repriseFin}>{t("Vos positions et votre compte ne changent pas. Le reste du texte est celui que vous avez déjà lu.")}</p>
        </div>
      )}

      <ol className={styles.temps}>
        {temps.map((p) => (
          <li key={p.titre} className={`${styles.pas} ${styles[p.etat]}`}>
            <i className={styles.n} aria-hidden="true">
              {p.n}
            </i>
            <div>
              <b>{p.titre}</b>
              <small>{p.sous}</small>
            </div>
          </li>
        ))}
      </ol>

      <section className={styles.bloc}>
        <h2 className="display">{t("L'essentiel, en deux colonnes")}</h2>
        <p className={styles.sous}>{t("Une convention est un échange. Ces deux colonnes le disent dans l'ordre où il vous concerne.")}</p>
        <div className={styles.balance}>
          <div className={`${styles.cote} ${marque === "donne" ? styles.coteMarque : ""}`}>
            <div className={styles.coteTete}>
              <b>{t("Ce que vous nous donnez")}</b>
              <small>{marque === "donne" ? t("une ligne a changé") : t("Trois choses, et rien de plus")}</small>
            </div>
            <ul>
              {donne.map((l) => (
                <li key={l.b}>
                  <b>{l.b}</b>
                  {l.p}
                </li>
              ))}
            </ul>
          </div>
          <div className={`${styles.cote} ${marque === "devons" ? styles.coteMarque : ""}`}>
            <div className={styles.coteTete}>
              <b>{t("Ce que nous vous devons")}</b>
              <small>{marque === "devons" ? t("une ligne a changé") : t("Cinq engagements")}</small>
            </div>
            <ul>
              {devons.map((l) => (
                <li key={l.b}>
                  <b>{l.b}</b>
                  {l.p}
                  {l.lien ? (
                    <>
                      {" "}
                      <Link href={l.lien.href}>{l.lien.nom}</Link>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Le texte complet se lit ici : replié, parce qu'il vient après
            l'essentiel, et dans la page, parce qu'un PDF ouvert à part emporte
            l'app installée. */}
        <details className={styles.texte}>
          <summary>
            <b>{t("Le texte complet, tel que vous le signez")}</b>
            <span>{t("{n} articles", { n: String(articles.length) })}</span>
          </summary>
          <div className={styles.texteCorps}>
            {articles.map((a) => (
              <section key={a.key}>
                <h3>{a.label}</h3>
                {a.body.split("\n").map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </section>
            ))}
          </div>
        </details>
      </section>

      <section className={`${styles.signer} ${signable ? styles.signerOuvert : ""}`}>
        {/* « Reprendre » seul existe déjà au desk, où il veut dire « reprendre
            un travail en cours » : la clef courte aurait rendu « Resume ». */}
        <h2 className="display">{t(reprise && signable ? "Reprendre ma convention" : "Signer")}</h2>
        {acceptee ? (
          <>
            <p className={styles.ok}>{t("Convention acceptée le {d} par {m}.", { d: signeeLe ?? "", m: t(file.consents.conventionMethod ?? "code à usage unique") })}</p>
            <p>{t("Votre exemplaire daté est dans vos documents : c'est lui qui fait foi.")}</p>
            <div className={styles.rangee}>
              <Link className="btn" href="/moi/documents">
                {t("Voir mon exemplaire")}
              </Link>
            </div>
          </>
        ) : !signable ? (
          <p>{t("Rien ne se signe avant l'approbation de votre dossier. Vous pouvez lire la convention autant de fois que vous le voulez : le bouton de signature apparaîtra ici dès que le desk aura statué.")}</p>
        ) : (
          <>
            <p>{t("Un code à six chiffres, une fois. Votre exemplaire daté part aussitôt dans vos documents : c'est lui qui fait foi.")}</p>
            <Signer canal={canal} pending={{ at: file.consents.pendingCodeAt, to: file.consents.pendingCodeTo }} reprise={reprise} />
          </>
        )}
        <p className={styles.apres}>{t("Une fois signée, vos ordres sur parts de fonds partent sans autre formalité, et le sous-compte titres s'ouvre de lui-même : c'est le mandat ci-dessus qui nous y autorise.")}</p>
      </section>
    </div>
  );
}
