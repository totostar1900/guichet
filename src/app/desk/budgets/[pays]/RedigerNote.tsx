"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import type { NoteBudget, Reference } from "@/lib/domain/types";
import { LIBELLES_DU_RELEVE, MIN, REFUS, estConditionnelle, verifierNote, type BrouillonNote } from "@/lib/market/note-budget";
import { ecrireNoteAction, type EcritureNote } from "./actions";
import styles from "./page.module.css";

/**
 * ÉCRIRE UNE NOTE, DEPUIS LA FICHE QU'ELLE COMMENTE.
 *
 * Elle ne vit pas sur une page à part, et ce n'est pas un détail de rangement :
 * une note se rédige en regardant les chiffres: le millésime, l'écart du baril,
 * les six portes sont au-dessus du formulaire, dans la même page. Une page
 * « nouvelle note » obligerait à mémoriser ce qu'on commente, et une note
 * écrite de mémoire est exactement ce que la série sert à éviter.
 *
 * LA MÊME RÈGLE QUE LE SERVEUR, LUE ICI AUSSI. `verifierNote` est du TypeScript
 * sans dépendance serveur : le formulaire l'appelle à chaque frappe, et le
 * bouton reste fermé tant qu'un refus tient. La maison l'a écrit pour la clé de
 * répartition — un bouton qui mène à un refus prévisible est une petite
 * trahison. Le serveur la rejoue malgré tout : un formulaire se contourne.
 *
 * CE QUI N'EST PAS DANS LE FORMULAIRE : le relevé des chiffres, calculé sur la
 * fiche ; le rang dans la série, calculé sur les notes existantes ; la
 * signature, prise sur la session. Trois champs qu'on n'écrit pas à la main
 * parce que trois champs qu'on écrirait faux.
 */
type Ligne = { genre: "constat" | "lecture"; texte: string };

/**
 * DEUX NOMS POUR UN MÊME ÉTAT, et ils ne s'échangent pas : `slug` est son
 * adresse — ce que l'action relit —, `pays` est son nom — ce qu'on lit à
 * l'écran. Confondus, le desk se voit proposer d'écrire une note sur
 * « guinee-equatoriale ».
 */
export function RedigerNote({
  slug,
  pays,
  exercice,
  releve,
  references,
  prochainNumero,
}: {
  slug: string;
  pays: string;
  exercice: number;
  releve: NoteBudget["releve"];
  references: Reference[];
  prochainNumero: number;
}) {
  const t = useT();
  const [res, action, pending] = useActionState<EcritureNote | null, FormData>(ecrireNoteAction, null);

  const [titre, setTitre] = useState("");
  const [enUnePhrase, setPhrase] = useState("");
  const [motif, setMotif] = useState("");
  const [demandeePar, setDemandee] = useState("");
  const [malLu, setMalLu] = useState("");
  const [surveiller, setSurveiller] = useState("");
  const [pieces, setPieces] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([
    { genre: "constat", texte: "" },
    { genre: "lecture", texte: "" },
  ]);

  /* LES PIÈCES DE LA FICHE, PLUS CELLES QU'ON TAPE : le compte doit être le
     même ici et au serveur, sinon le bouton s'ouvre sur un refus. */
  const ajoutees: Reference[] = pieces
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [titre, editeur, url] = l.split("|").map((x) => x.trim());
      return { titre: titre || l, editeur: editeur || "non nommé", url: url && /^https?:\/\/\S+$/.test(url) ? url : undefined };
    });

  const brouillon: BrouillonNote = {
    titre,
    enUnePhrase,
    motif,
    demandeePar,
    malLu,
    surveiller: surveiller.split("\n").map((s) => s.trim()).filter(Boolean),
    corps: lignes.filter((l) => l.texte.trim()).map((l) => ({ genre: l.genre, texte: l.texte.trim() })),
    references: [...references, ...ajoutees],
  };
  const refus = verifierNote(brouillon);
  const refusDe = (champ: string) => refus.filter((r) => r.champ === champ);
  const maj = (i: number, v: Partial<Ligne>) => setLignes((xs) => xs.map((x, j) => (j === i ? { ...x, ...v } : x)));

  return (
    <details className={styles.rediger}>
      <summary>
        {t("Écrire la note")} n° {prochainNumero} · {pays} {exercice}
      </summary>

      <form action={action} className={styles.formulaire}>
        <input type="hidden" name="pays" value={slug} />

        {/* POURQUOI ELLE EXISTE, AVANT CE QU'ELLE DIT. Une note se demande ;
            ces deux champs sont ce qui l'empêche de devenir un calendrier. */}
        <div className={styles.paire}>
          <label>
            <span className={styles.el}>{t("Demandée par")}</span>
            <input name="demandeePar" value={demandeePar} onChange={(e) => setDemandee(e.target.value)} placeholder={t("Le nom de qui l'a demandée")} />
          </label>
          <label>
            <span className={styles.el}>{t("Motif")}</span>
            <input name="motif" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder={t("Ce qui l'a déclenchée")} />
          </label>
        </div>
        {[...refusDe("demandeePar"), ...refusDe("motif")].map((r, i) => (
          <p key={i} className={styles.refus}>
            {t(r.message)}
          </p>
        ))}

        <label>
          <span className={styles.el}>{t("Titre")}</span>
          <input name="titre" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder={t("Ce que la note a trouvé, en une ligne")} />
        </label>
        {refusDe("titre").map((r, i) => (
          <p key={i} className={styles.refus}>
            {t(r.message)}
          </p>
        ))}

        <label>
          <span className={styles.el}>{t("En une phrase")}</span>
          <textarea name="enUnePhrase" rows={2} value={enUnePhrase} onChange={(e) => setPhrase(e.target.value)} placeholder={t("Ce qu'on lit si l'on ne lit qu'une chose.")} />
        </label>
        {refusDe("enUnePhrase").map((r, i) => (
          <p key={i} className={styles.refus}>
            {t(r.message)}
          </p>
        ))}

        {/* LE CORPS. Le genre se choisit AVANT d'écrire, pas après : étiqueter
            une phrase déjà rédigée revient à la ranger où elle arrange. */}
        <div>
          <span className={styles.el}>{t("Le corps de la note")}</span>
          <p className={styles.aide}>
            {t("Le constat dit ce que le document dit. La lecture dit ce que le desk en lit, et elle s'écrit au conditionnel — « si… alors… ».")}
          </p>
          {lignes.map((l, i) => (
            <div key={i} className={styles.ligne}>
              <div className={styles.genres}>
                {(["constat", "lecture"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`${styles.etiq} ${g === "constat" ? styles.constat : styles.lecture} ${l.genre === g ? styles.choisi : styles.terne}`}
                    onClick={() => maj(i, { genre: g })}
                  >
                    {t(g)}
                  </button>
                ))}
                {lignes.length > 1 ? (
                  <button type="button" className={styles.retirer} onClick={() => setLignes((xs) => xs.filter((_, j) => j !== i))}>
                    {t("retirer")}
                  </button>
                ) : null}
              </div>
              <input type="hidden" name="corps_genre" value={l.genre} />
              <textarea name="corps_texte" rows={3} value={l.texte} onChange={(e) => maj(i, { texte: e.target.value })} />
              {/* L'avertissement se montre SOUS le paragraphe fautif et non en
                  bas de page : la liste des refus dit qu'il y en a un, elle ne
                  dit pas lequel des six paragraphes. */}
              {l.genre === "lecture" && l.texte.trim().length >= MIN.paragraphe && !estConditionnelle(l.texte) ? (
                <p className={styles.refus}>{t(REFUS.lectureAffirmative)}</p>
              ) : null}
            </div>
          ))}
          <div className={styles.ajouts}>
            <button type="button" className="btn sm ghost" onClick={() => setLignes((xs) => [...xs, { genre: "constat", texte: "" }])}>
              {t("Ajouter un constat")}
            </button>
            <button type="button" className="btn sm ghost" onClick={() => setLignes((xs) => [...xs, { genre: "lecture", texte: "" }])}>
              {t("Ajouter une lecture")}
            </button>
          </div>
          {refusDe("corps")
            .filter((r) => !r.extrait)
            .map((r, i) => (
              <p key={i} className={styles.refus}>
                {t(r.message)}
              </p>
            ))}
        </div>

        <div className={styles.paire}>
          <label>
            <span className={styles.el}>{t("Ce qu'il faut surveiller")}</span>
            <textarea name="surveiller" rows={4} value={surveiller} onChange={(e) => setSurveiller(e.target.value)} placeholder={t("Une ligne par point.")} />
          </label>
          <label>
            <span className={styles.el}>{t("Ce que la note précédente a mal lu")}</span>
            <textarea name="malLu" rows={4} value={malLu} onChange={(e) => setMalLu(e.target.value)} placeholder={t("« Rien à corriger » est une réponse, et elle s'écrit.")} />
            {refusDe("malLu").map((r, i) => (
              <p key={i} className={styles.refus}>
                {t(r.message)}
              </p>
            ))}
          </label>
        </div>

        {/* LES PIÈCES. Celles de la fiche sont déjà là et se montrent ; le
            rédacteur ajoute celles qui sont propres à sa note — une
            déclaration, un communiqué. L'adresse est facultative : une pièce
            nommée se retrouve, un lien mort fait croire qu'elle n'existe pas. */}
        <div>
          <span className={styles.el}>{t("Les pièces")}</span>
          <p className={styles.aide}>
            {references.length
              ? t("Celles de la fiche sont reprises d'office. Ajoutez ci-dessous ce qui est propre à cette note, une par ligne : titre | éditeur | adresse (l'adresse est facultative).")
              : t("Cette fiche ne nomme aucune pièce. Nommez au moins le document sur lequel la note s'appuie, une par ligne : titre | éditeur | adresse (l'adresse est facultative).")}
          </p>
          {references.length ? (
            <ul className={styles.heritees}>
              {references.map((p) => (
                <li key={`${p.editeur}-${p.titre}`}>
                  {p.titre} <small>{p.editeur}</small>
                </li>
              ))}
            </ul>
          ) : null}
          <textarea name="references" rows={3} value={pieces} onChange={(e) => setPieces(e.target.value)} placeholder="Annonce de révision | presse spécialisée | https://…" />
          {refusDe("references").map((r, i) => (
            <p key={i} className={styles.refus}>
              {t(r.message)}
            </p>
          ))}
        </div>

        {/* LE RELEVÉ SE MONTRE, IL NE SE SAISIT PAS. Le rédacteur doit voir ce
            que sa note va enregistrer : c'est là-dessus que la suivante
            calculera son tableau des écarts. */}
        <div className={styles.releve}>
          <span className={styles.el}>{t("Ce que cette note enregistrera")}</span>
          <p className={styles.aide}>{t("Pris sur la fiche ci-dessus, jamais saisi : c'est ce qui rend calculable l'écart avec la note suivante.")}</p>
          {/* Même tri que la fiche, et pour la même raison : faute d'entrée au
              dictionnaire, t() traduirait mot à mot l'intitulé de la loi. */}
          <ul>
            {releve.map((x) => (
              <li key={x.cle}>
                {x.cle in LIBELLES_DU_RELEVE ? t(x.libelle) : x.libelle} <b>{x.valeur}</b>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.envoi}>
          <button className="btn primary" type="submit" disabled={pending || refus.length > 0}>
            {pending ? "…" : `${t("Écrire la note")} n° ${prochainNumero}`}
          </button>
          {refus.length > 0 ? (
            <small className="muted">
              {refus.length} {t("point(s) à reprendre avant d'écrire.")}
            </small>
          ) : null}
          {res?.ok ? <small className={styles.ok}>{res.ok}</small> : null}
          {res?.error ? <small className={styles.refus}>{res.error}</small> : null}
        </div>
      </form>
    </details>
  );
}
