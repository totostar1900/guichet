import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { ordreSignable } from "@/lib/domain/intent";
import { plafondEnVigueur, prixDuPlafond, seSigneAuPlafond } from "@/lib/domain/plafond";
import { ordreAcceptable } from "@/lib/domain/ouverture";
import { positionFor } from "@/lib/documents/position";
import { peutOPCVM } from "@/lib/auth/types";
import { fmt, fmtDate, fmtDateTime } from "@/lib/format";
import { getT } from "@/i18n/server";
import { canalDuCode } from "@/lib/kyc/canal";
import { SignatureOrdre } from "./Signature";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;
  const i = (await repo().listIntents()).find((x) => x.id === id);
  return { title: i ? `${i.ref} · ${t("Mon ordre")}` : t("Mon ordre") };
}

/**
 * L'ÉCRAN OÙ L'ON SIGNE, ET LE SEUL GESTE QUI RESTE.
 *
 * Le parcours tenait en quatre gestes et deux attentes : annoncer une
 * intention, attendre que le desk confirme et fabrique le bulletin, le signer
 * hors de l'application, attendre encore la transmission. Or le desk
 * n'ajoutait aucune arithmétique entre les deux : documents/position.ts
 * calculait déjà le montant. Il ajoutait une décision, et une décision ne
 * demande pas deux allers.
 *
 * Deux écrans, donc : on saisit sur le premier, on signe sur celui-ci. Signer
 * mérite une page qui ne bouge plus sous les doigts pendant qu'on relit.
 *
 * ET L'ON PEUT LIRE AVANT DE SIGNER. La convention a coûté une journée pour
 * cette raison exacte : un texte qu'on demandait d'accepter sans pouvoir
 * l'ouvrir. L'ordre se lit, autant de fois qu'on veut, avant de l'engager.
 */
export default async function OrdrePage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;
  const s = await requireSession(`/moi/ordres/${id}`);
  const r = repo();
  const intent = (await r.listIntents()).find((x) => x.id === id);
  if (!intent || intent.clientId !== s.userId) notFound();
  const offer = await r.getOffer(intent.offerId);
  if (!offer) notFound();

  const f = offer.fund;
  const montant = intent.amount ?? 0;
  const rachat = intent.type === "rachat";
  /* Les mêmes calculs que l'estimation et que le document : le montant versé
     porte les droits d'entrée, et ce qui est investi s'en déduit. On les montre
     séparément, parce que ce qu'on paie en frais se lit sur sa propre ligne
     quand on signe. */
  const droitsPct = f?.entryFeePct ?? 0;
  const investi = rachat ? 0 : Math.round(montant / (1 + droitsPct / 100));
  const droits = rachat ? 0 : montant - investi;
  const parts = !rachat && f && f.nav > 0 ? Math.floor((investi / f.nav) * 1000) / 1000 : 0;
  const produit = rachat && f ? Math.round(montant * f.nav) : 0;

  /* ON NE SIGNE PAS UN ORDRE SANS DOSSIER APPROUVÉ.
     « ordreSignable » parle de l'ordre : le bon type, pas encore signé, pas
     encore pris en main. Le droit de signer, lui, tient à la personne, et pour
     des parts d'OPCVM c'est « peutOPCVM » : dossier approuvé et convention
     acceptée. Les deux se lisent ici, sinon l'écran offrirait une signature que
     l'action refuserait ensuite. */
  const dossier = await r.getClientFileByUser(s.userId);
  /* UN TITRE NE DEMANDE PAS LE SOUS-COMPTE POUR SE SIGNER, et c'est la règle
     du 9 octobre 2026 : l'ordre d'un résident est pris sans attendre
     l'ouverture, et c'est la TRANSMISSION qui patiente. Exiger ici le palier 2
     remettrait l'attente là où on vient de l'enlever. `ordreAcceptable` dit
     la vraie condition : dossier approuvé, convention à jour, et le
     sous-compte seulement pour un non-résident. */
  const titre = seSigneAuPlafond(intent.type);
  const habilite = titre ? ordreAcceptable(intent.type, dossier) : peutOPCVM(s);
  const signable = ordreSignable(intent) && habilite && Boolean(dossier);
  const canal = signable && dossier ? await canalDuCode(s.userId, dossier) : undefined;

  return (
    <div className={styles.wrap}>
      <Link href="/moi/documents" className={styles.back}>
        ← {t("Mes documents")}
      </Link>
      <div className={styles.head}>
        <div className="eyebrow">
          {t(INTENT_LABEL[intent.type])} · {intent.signedAt ? t("signé") : signable ? t("étape 2 sur 2") : t(INTENT_STATE_LABEL[intent.state])}
        </div>
        <h1 className="display">{intent.signedAt ? t("Votre ordre") : t("Signer mon ordre")}</h1>
        <p className={styles.lead}>
          {offer.title}
          {f ? ` · ${f.manager}` : ""}
        </p>
      </div>

      <section className={styles.recap}>
        <div className={styles.recapH}>{t("Ce que vous signez")}</div>
        <dl className={styles.lignes}>
          {titre ? (
            /* UN TITRE SE LIT À L'ENVERS D'UNE PART : la quantité est ferme,
               c'est la dépense qui flotte. Le plafond vient donc en dernier
               et en gras, parce que c'est LUI qu'on signe ; le reste l'explique. */
            <>
              <div>
                <dt>{t("Quantité demandée")}</dt>
                <dd>{positionFor(intent, offer).label}</dd>
              </div>
              {intent.limitPrice != null && (
                <div>
                  <dt>{t("Au prix maximum de")}</dt>
                  <dd>{intent.limitPrice.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} %</dd>
                </div>
              )}
              {offer.commissionPct > 0 && (
                <div>
                  <dt>{t("dont commission {p} %", { p: offer.commissionPct.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) })}</dt>
                  <dd className={styles.second}>{fmt(Math.round(positionFor(intent, offer, prixDuPlafond(intent, offer) != null ? { pricePct: prixDuPlafond(intent, offer) } : {}).commission))} FCFA</dd>
                </div>
              )}
              <div>
                <dt>{t("Vous engagez au plus")}</dt>
                <dd>{fmt(plafondEnVigueur(intent, offer))} FCFA</dd>
              </div>
            </>
          ) : rachat ? (
            <>
              <div>
                <dt>{t("Parts rachetées")}</dt>
                <dd>{montant.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}</dd>
              </div>
              {f && (
                <div>
                  <dt>{t("Produit, à la VL du {d}", { d: fmtDate(f.navDate, false) })}</dt>
                  <dd className={styles.approx}>≈ {fmt(produit)} FCFA</dd>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <dt>{t("Montant versé")}</dt>
                <dd>{fmt(montant)} FCFA</dd>
              </div>
              {droitsPct > 0 && (
                <div>
                  <dt>{t("dont droits d'entrée {p} %", { p: droitsPct.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) })}</dt>
                  <dd className={styles.second}>{fmt(droits)} FCFA</dd>
                </div>
              )}
              <div>
                <dt>{t("Investi")}</dt>
                <dd>{fmt(investi)} FCFA</dd>
              </div>
              {f && (
                <div>
                  <dt>{t("Parts, à la VL du {d}", { d: fmtDate(f.navDate, false) })}</dt>
                  <dd className={styles.approx}>≈ {parts.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}</dd>
                </div>
              )}
            </>
          )}
        </dl>
        {/* DIRE OÙ EST L'INCERTITUDE, ET OÙ ELLE N'EST PAS. Sur un OPCVM le
            montant est ferme et seule la quantité flotte : un client qui l'a lu
            ici ne sera pas surpris par son avis d'opéré. */}
        <p className={styles.ferme}>
          {titre
            ? t("C'est ce plafond que vous signez, et rien au-delà. Si le prix servi est meilleur, vous payez moins ; s'il dépasse, l'ordre n'est pas exécuté pour vous. Vous pouvez aussi n'être servi qu'en partie : vous ne payez alors que ce qui vous revient.")
            : rachat
              ? t("Le nombre de parts est ferme. Le montant sera celui de la VL de rachat retenue à la centralisation{c}.", { c: f?.cutoff ? `, ${f.cutoff}` : "" })
              : t("Le montant est ferme. Le nombre de parts sera celui de la VL retenue à la centralisation{c}.", { c: f?.cutoff ? `, ${f.cutoff}` : "" })}
        </p>
        <p className={styles.fin}>
          {f ? t("Dépositaire {d} · parts inscrites à votre nom au registre du fonds", { d: f.depositary }) : ""}
          {f?.settlementDays ? ` · ${t("règlement J+{n}", { n: String(f.settlementDays) })}` : ""}
        </p>
        <p className={styles.lire}>
          <Link href={`/moi/ordres/${intent.id}/lire`}>{intent.signedAt ? t("Lire l'ordre signé") : t("Lire l'ordre complet")}</Link>
        </p>
      </section>

      {intent.signedAt ? (
        <div className={styles.signe}>
          {t("Ordre signé le {d} par {m}.", { d: fmtDateTime(intent.signedAt), m: t(intent.signedMethod ?? "code à usage unique") })} {t("Référence")} <b className="mono">{intent.ref}</b>
        </div>
      ) : signable ? (
        <SignatureOrdre id={intent.id} canal={canal ? { to: canal.to, channel: canal.channel } : undefined} codeEnvoyeLe={intent.pendingCodeAt} />
      ) : ordreSignable(intent) && !habilite ? (
        <p className={styles.hint}>
          {t("Votre ordre est enregistré. Il se signera dès que votre dossier sera approuvé et votre convention acceptée.")}{" "}
          <Link href="/ouvrir-un-compte">{t("Mon dossier d'ouverture")}</Link>
        </p>
      ) : (
        <p className={styles.hint}>{t("Cet ordre n'est plus à signer ici : le desk l'a pris en main. Vous le suivez dans vos documents.")}</p>
      )}

      <section className={styles.suite}>
        <div className={styles.recapH}>{t("Ensuite")}</div>
        <ol className={styles.etapes}>
          <li className={intent.signedAt ? styles.fait : styles.encours}>
            <b>{t("Vous signez")}</b>
            <small>{intent.signedAt ? fmtDateTime(intent.signedAt) : t("maintenant")}</small>
          </li>
          {/* L'ORDRE DES DEUX ÉTAPES SUIVANTES N'EST PAS LE MÊME SELON CE
              QU'ON ACHÈTE, et s'y tromper ferait attendre le client pour rien
              ou le ferait payer trop tôt. Sur une part, le desk centralise
              puis appelle les fonds. Sur un titre, on ne transmet au marché
              qu'un ordre COUVERT (convention, article 4) : le règlement
              précède donc la transmission, à hauteur du plafond signé. */}
          {titre ? (
            <>
              <li>
                <b>{t("Vous réglez")}</b>
                <small>{t("au plus le plafond, avec la référence de l'ordre")}</small>
              </li>
              <li>
                <b>{t("Le desk transmet")}</b>
                <small>{t("au marché, puis le résultat")}</small>
              </li>
            </>
          ) : (
            <>
              <li>
                <b>{t("Le desk donne le go")}</b>
                <small>{t("un numéro d'opération")}</small>
              </li>
              <li>
                <b>{rachat ? t("Vous êtes payé") : t("Vous virez")}</b>
                <small>{rachat ? t("sur votre compte de règlement") : t("avec ce numéro")}</small>
              </li>
            </>
          )}
        </ol>
        {titre ? (
          <p className={styles.fin}>{t("Vous ne payez jamais plus que le plafond. Servi en partie, vous ne payez que votre part ; non servi, tout vous revient, et le solde part sous 72 heures ouvrables si vous le demandez.")}</p>
        ) : (
          !rachat && <p className={styles.fin}>{t("Signer n'est pas payer : rien n'est à verser avant le go.")}</p>
        )}
      </section>
    </div>
  );
}
