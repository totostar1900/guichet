"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDates, useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { groupDigits, groupedInput } from "@/lib/ui/grouped";
import { fmt, parseAmount } from "@/lib/format";
import { JOUR_MAX_VERSEMENT, premierVersement } from "@/lib/domain/standing";
import { mettreEnPlaceAction, type MiseEnPlace } from "@/app/moi/epargne/actions";
import { deposerCopieMandatAction, signerMandatAction, type MandatResult } from "@/app/moi/prelevements/actions";
import { BarreDEtape } from "@/components/mobile/BarreDEtape";
import barre from "@/components/mobile/BarreDEtape.module.css";
import styles from "./EpargneParcours.module.css";

/**
 * METTRE UNE ÉPARGNE EN PLACE : QUATRE PAGES, UN BOUTON CHACUNE (décision du 15 novembre 2026, maquette « Parcours » : 1A · 2B · 3 OK · 4 prélèvement seul · 5 OK · 6 OK · 7 28 · 8).
 *
 * 1 · l'épargne (le fonds, la somme, le jour, ce qui se passe si un mois bloque) ; 2 · le compte à débiter ; 3 · le récapitulatif, et le code qui part ;
 * 4 · le code, et la signature ; 5 · l'exemplaire signé à la main, à déposer à la banque et dont la copie vient au desk (maquette « Signature manuelle » : 1A).
 * L'épargne et le mandat sont créés d'un seul geste au bouton de la page 3, tous deux non signés ; le prélèvement attend la vérification de la copie.
 *
 * PAR PRÉLÈVEMENT SEUL : il n'y a plus de choix du mode de paiement. Le préavis de cinq jours se dit une fois, à la page 3, avec le droit de révoquer.
 *
 * LE JOUR VA DE 1 À 30. Le 29 et le 30 n'existent pas en février : le prélèvement tombe alors le 1er mars (règle du domaine, « dateDuVersement »).
 *
 * L'étape est dans l'adresse (« ?etape=2 ») : le retour du téléphone et la flèche du haut reculent d'une étape au lieu de quitter la page.
 */
export interface FondsChoix {
  id: string;
  title: string;
  min: number;
  vl?: number;
}

export function EpargneParcours({
  fonds,
  fondsInitial,
  aujourdhui,
  titulaire,
  banque,
  compte,
  apres,
  empeche,
}: {
  fonds: FondsChoix[];
  fondsInitial?: string;
  aujourdhui: string;
  titulaire: string;
  banque: string;
  compte: string;
  /** Où l'on atterrit une fois le mandat signé : la liste des épargnes. */
  apres: string;
  /** Ce qui empêche de signer (pas de dossier, pas d'adresse où recevoir le code) : dit avant de faire remplir. */
  empeche?: "dossier" | "adresse";
}) {
  const t = useT();
  const { fmtDate } = useDates();
  const router = useRouter();
  const chemin = usePathname();
  const sp = useSearchParams();
  const [mise, miseAct, envoi] = useActionState<MiseEnPlace | null, FormData>(mettreEnPlaceAction, null);
  const [sign, signAct, signant] = useActionState<MandatResult | null, FormData>(signerMandatAction, null);
  const [copie, copieAct, deposant] = useActionState<MandatResult | null, FormData>(deposerCopieMandatAction, null);
  const [fichier, setFichier] = useState("");

  const [choisi, setChoisi] = useState(fondsInitial && fonds.some((f) => f.id === fondsInitial) ? fondsInitial : (fonds[0]?.id ?? ""));
  const plancher = fonds.find((f) => f.id === choisi)?.min ?? 0;
  const [montant, setMontant] = useState(plancher ? groupDigits(String(plancher)) : "");
  const [jour, setJour] = useState(5);
  const [bloque, setBloque] = useState("passer");
  const [nom, setNom] = useState(titulaire);
  const [bq, setBq] = useState(banque);
  const [rib, setRib] = useState(compte);
  const [code, setCode] = useState("");

  const verse = parseAmount(montant);
  const montantOk = verse > 0 && verse >= plancher;
  const compteOk = nom.trim().length >= 2 && bq.trim().length >= 2 && rib.trim().length >= 6;
  const demande = Number(sp.get("etape")) || 1;
  /* On ne saute pas une étape qu'on n'a pas remplie : sans montant retour à la première, sans code parti retour au récapitulatif. */
  const etape: 1 | 2 | 3 | 4 | 5 = demande >= 5 && sign?.ok ? 5 : demande >= 4 && mise?.ok ? 4 : demande >= 3 && montantOk && compteOk ? 3 : demande >= 2 && montantOk ? 2 : 1;
  const aller = (n: number) => router.push(`${chemin}?etape=${n}`, { scroll: false });

  /* Le code est parti : la page suivante est celle où on le saisit. */
  useEffect(() => {
    if (mise?.ok && etape === 3) router.push(`${chemin}?etape=4`, { scroll: false });
  }, [mise, etape, chemin, router]);
  /* Le mandat est signé par code : reste l'exemplaire à la main. « replace » : la signature ne se rejoue pas au retour. */
  useEffect(() => {
    if (sign?.ok) router.replace(`${chemin}?etape=5`, { scroll: false });
  }, [sign, chemin, router]);
  /* La copie est envoyée : l'épargne attend sa vérification, on la retrouve dans sa liste. */
  useEffect(() => {
    if (copie?.ok) router.replace(apres);
  }, [copie, apres, router]);

  if (empeche) {
    return (
      <p className={styles.vide}>
        {empeche === "dossier"
          ? t("Votre dossier doit être ouvert avant de programmer une épargne : c'est lui qui porte le canal par lequel le code vous parvient.")
          : t("Il nous faut une adresse e-mail avant de programmer une épargne : c'est là que part le code, puis l'annonce de chaque prélèvement.")}{" "}
        {empeche === "adresse" && <Link href="/moi/securite#canaux">{t("Ajouter mon adresse →")}</Link>}
      </p>
    );
  }

  const bloqueTexte = (v: string) => t(v === "arreter" ? "Arrêter l'épargne" : "Passer ce versement et continuer");
  const premier = fmtDate(premierVersement(jour, aujourdhui));

  return (
    <div className={styles.parcours}>
      <p className={styles.etape}>{t("Étape {n} sur 5", { n: String(etape) })}</p>

      {etape === 1 && (
        <>
          <section className={styles.section}>
            <h2>{t("Le fonds")}</h2>
            {/* La liste de la maison, mise en avant : une tuile à sa propre section, sa valeur en grand, « Changer » à droite. */}
            <div className={styles.tuileSelect}>
              <Select block name="offerIdChoix" value={choisi} onChange={setChoisi} options={fonds.map((f) => ({ value: f.id, label: f.title }))} />
            </div>
          </section>

          <section className={styles.section}>
            <h2>{t("La somme chaque mois")}</h2>
            <label className={styles.chiffre}>
              <span className={styles.lecteur}>{t("Montant du versement : FCFA")}</span>
              <input value={montant} {...groupedInput(setMontant)} inputMode="numeric" autoComplete="off" aria-label={t("Montant du versement : FCFA")} />
            </label>
            {plancher > 0 && <small className={styles.aide}>{t("minimum {n}", { n: fmt(plancher) })}</small>}
          </section>

          <section className={styles.section}>
            <h2>{t("Le jour du mois")}</h2>
            <div className={styles.tuileSelect}>
              <Select
                block
                name="jourChoix"
                value={String(jour)}
                onChange={(v) => setJour(Number(v))}
                cherchable={false}
                options={Array.from({ length: JOUR_MAX_VERSEMENT }, (_, i) => ({ value: String(i + 1), label: t("Le {j} de chaque mois", { j: String(i + 1) }) }))}
              />
            </div>
            <small className={styles.aide}>
              <b>{t("Premier versement le {d}", { d: premier })}</b>
            </small>
            {jour >= 29 && <small className={styles.aide}>{t("En février, un prélèvement du 29 ou du 30 tombe le 1er mars quand ce jour n'existe pas.")}</small>}
          </section>

          <section className={styles.section}>
            <h2>{t("Si un mois le prélèvement est impossible")}</h2>
            {/* Deux choix : on les montre tous les deux, à cocher, plutôt que dans une liste qu'il faut ouvrir. */}
            <div className={styles.cartes} role="radiogroup" aria-label={t("Si un mois le prélèvement est impossible")}>
              {[
                ["passer", "Passer ce versement et continuer", "Le mois suivant reprend normalement."],
                ["arreter", "Arrêter l'épargne", "Plus rien ne part tant que vous ne la remettez pas en place."],
              ].map(([v, titre, aide]) => (
                <button key={v} type="button" role="radio" aria-checked={bloque === v} className={bloque === v ? styles.carteOn : styles.carte} onClick={() => setBloque(v)}>
                  <span className={styles.rond} aria-hidden="true" />
                  <span>
                    <b>{t(titre)}</b>
                    <small>{t(aide)}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {etape === 2 && (
        <>
          <p className={styles.phrase}>{t("Le compte à débiter est le vôtre : il doit être ouvert à votre nom.")}</p>
          <section className={styles.section}>
            <h2>{t("Titulaire du compte à débiter")}</h2>
            <input className={styles.champ} value={nom} onChange={(e) => setNom(e.target.value)} maxLength={80} aria-label={t("Titulaire du compte à débiter")} />
          </section>
          <section className={styles.section}>
            <h2>{t("Banque du compte à débiter")}</h2>
            <input className={styles.champ} value={bq} onChange={(e) => setBq(e.target.value)} maxLength={80} aria-label={t("Banque du compte à débiter")} />
          </section>
          <section className={styles.section}>
            <h2>{t("RIB ou IBAN du compte à débiter")}</h2>
            <input className={styles.champ} value={rib} onChange={(e) => setRib(e.target.value)} maxLength={60} aria-label={t("RIB ou IBAN du compte à débiter")} />
            <small className={styles.aide}>{t("Repris de votre dossier. Nous ne présentons jamais de prélèvement sur le compte d'un tiers.")}</small>
          </section>
        </>
      )}

      {etape === 3 && (
        <>
          <div className={styles.recap}>
            <div>
              <span>{t("Vers quel fonds")}</span>
              <b>{fonds.find((f) => f.id === choisi)?.title ?? "—"}</b>
            </div>
            <div>
              <span>{t("Chaque mois")}</span>
              <b>
                {fmt(verse)} FCFA
              </b>
            </div>
            <div>
              <span>{t("Le")}</span>
              <b>
                {t("{j} de chaque mois", { j: String(jour) })}
                <small>{t("Premier versement le {d}", { d: premier })}</small>
              </b>
            </div>
            <div>
              <span>{t("Si un mois le prélèvement est impossible")}</span>
              <b>{bloqueTexte(bloque)}</b>
            </div>
            <div>
              <span>{t("Compte débité")}</span>
              <b>
                {nom}
                <small>
                  {bq} · {rib}
                </small>
              </b>
            </div>
          </div>
          {/* LE PRÉAVIS ET LE DROIT DE RÉVOQUER, DITS UNE SEULE FOIS, au moment de signer. Rien n'est prélevé avant la signature. */}
          <p className={styles.garanties}>
            {t("Chaque prélèvement vous est annoncé cinq jours avant, et vous pouvez révoquer votre autorisation à tout moment, sans motif. Rien n'est prélevé avant votre signature. Vous pourrez lire le mandat avant de le signer.")}
          </p>
          {mise && !mise.ok && <p className={styles.erreur}>{t(mise.error)}</p>}
        </>
      )}

      {etape === 4 && mise?.ok && (
        <>
          <p className={styles.phrase}>{t(mise.code ? "Mode démonstration : le code s'affiche ci-dessous." : mise.message)}</p>
          <p className={styles.garanties}>
            <a href={`/api/documents/mandat-apercu/${mise.mandatId}`} target="_blank" rel="noopener noreferrer">
              {t("Lire le mandat avant de le signer")} ↗
            </a>{" "}
            {t("— c'est le document que votre banque vous demandera.")}
          </p>
          <section className={styles.section}>
            <h2>{t("Code reçu")}</h2>
            <input
              className={styles.champ}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder={t("6 chiffres")}
              autoComplete="one-time-code"
              aria-label={t("Code reçu")}
            />
            {mise.code && (
              <small className={styles.demo}>
                {t("Code de démonstration :")} <b className="mono">{mise.code}</b>
              </small>
            )}
            {sign && !sign.ok && <p className={styles.erreur}>{t(sign.error)}</p>}
          </section>
          {/* UN RENVOI N'EST PAS UN SECOND BOUTON : un geste discret, en texte, sous le champ. */}
          <form action={miseAct} className={styles.renvoi}>
            <input type="hidden" name="mandatId" value={mise.mandatId} />
            <input type="hidden" name="standingId" value={mise.standingId} />
            <button type="submit" className={styles.lien} disabled={envoi}>
              {envoi ? "…" : t("Renvoyer le code")}
            </button>
          </form>
        </>
      )}

      {etape === 5 && sign?.ok && (
        <>
          <p className={styles.phrase}>{t("Votre banque et nous gardons chacune un exemplaire signé à la main.")}</p>
          <ol className={styles.pas}>
            <li>
              <b>{t("Téléchargez le mandat")}</b>
              <small>
                {t("Deux exemplaires à imprimer, à votre nom, avec la référence du mandat.")}{" "}
                {sign.piece ? (
                  <a href={`/api/documents/${sign.piece}`} target="_blank" rel="noopener noreferrer">
                    {t("Télécharger le mandat")} ↓
                  </a>
                ) : (
                  <Link href="/moi/documents/signes">{t("Ouvrir mes documents")} →</Link>
                )}
              </small>
            </li>
            <li>
              <b>{t("Signez-le et déposez-en un à votre banque")}</b>
              <small>{t("Votre signature dans le cadre prévu pour elle. Gardez le second exemplaire : c'est lui que vous nous envoyez.")}</small>
            </li>
            <li>
              <b>{t("Envoyez-nous la copie signée")}</b>
              <small>{t("PDF, photo ou scan, 10 Mo au plus. Rien n'est prélevé avant que nous l'ayons vérifiée.")}</small>
            </li>
          </ol>
          <label className={styles.fichier}>
            <input form="parcours-copie" type="file" name="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFichier(e.target.files?.[0]?.name ?? "")} />
            <span>{fichier || t("Touchez pour choisir la copie signée")}</span>
          </label>
          {copie && !copie.ok && <p className={styles.erreur}>{t(copie.error)}</p>}
          <p className={styles.garanties}>
            <Link href={apres}>{t("Plus tard")}</Link> — {t("l'épargne reste en attente de la copie, et elle ne prélève rien.")}
          </p>
        </>
      )}

      {/* LA SEULE ACTION DE LA PAGE, dans la barre collée en bas. Chaque bouton n'existe que sur sa page. */}
      {etape === 3 ? (
        <form id="parcours-mise" action={miseAct}>
          <input type="hidden" name="offerId" value={choisi} />
          <input type="hidden" name="amount" value={verse} />
          <input type="hidden" name="dayOfMonth" value={jour} />
          <input type="hidden" name="onBlocked" value={bloque} />
          <input type="hidden" name="reglement" value="prelevement" />
          <input type="hidden" name="accountHolder" value={nom} />
          <input type="hidden" name="bankName" value={bq} />
          <input type="hidden" name="bankAccount" value={rib} />
          {mise && !mise.ok && mise.mandatId && (
            <>
              <input type="hidden" name="mandatId" value={mise.mandatId} />
              <input type="hidden" name="standingId" value={mise.standingId ?? ""} />
            </>
          )}
        </form>
      ) : null}
      {etape === 4 && mise?.ok ? (
        <form id="parcours-signe" action={signAct}>
          <input type="hidden" name="id" value={mise.mandatId} />
          <input type="hidden" name="code" value={code} />
        </form>
      ) : null}
      {etape === 5 && sign?.ok ? (
        <form id="parcours-copie" action={copieAct}>
          <input type="hidden" name="id" value={sign.id ?? mise?.mandatId ?? ""} />
        </form>
      ) : null}

      <BarreDEtape indice={etape === 1 && !montantOk ? (verse > 0 ? t("Le minimum est de {n} FCFA.", { n: fmt(plancher) }) : t("Indiquez d'abord le montant du versement.")) : etape === 2 && !compteOk ? t("Indiquez le titulaire, la banque et le RIB du compte à débiter.") : undefined}>
        {etape > 1 && etape < 4 && (
          <button className={`btn ${barre.retour}`} type="button" onClick={() => router.back()}>
            {t("Corriger")}
          </button>
        )}
        {etape === 1 && (
          <button className={`btn primary ${barre.suivant}`} type="button" disabled={!montantOk} onClick={() => aller(2)}>
            {t("Continuer")}
          </button>
        )}
        {etape === 2 && (
          <button className={`btn primary ${barre.suivant}`} type="button" disabled={!compteOk} onClick={() => aller(3)}>
            {t("Continuer")}
          </button>
        )}
        {etape === 3 && (
          <button className={`btn primary ${barre.suivant}`} type="submit" form="parcours-mise" disabled={envoi}>
            {envoi ? "…" : t("Recevoir mon code")}
          </button>
        )}
        {etape === 4 && (
          <button className={`btn primary ${barre.suivant}`} type="submit" form="parcours-signe" disabled={signant || code.length < 6}>
            {signant ? "…" : t("Je signe ce mandat")}
          </button>
        )}
        {etape === 5 && (
          <button className={`btn primary ${barre.suivant}`} type="submit" form="parcours-copie" disabled={deposant || !fichier}>
            {deposant ? "…" : t("Envoyer ma copie signée")}
          </button>
        )}
      </BarreDEtape>
    </div>
  );
}
