import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { ordreSignable } from "@/lib/domain/intent";
import { RetirerOrdre } from "./Retirer";
import { aCouvrirPour, plafondEnVigueur, prixDuPlafond, seSigneAuPlafond } from "@/lib/domain/plafond";
import { disponibleDe } from "@/lib/domain/provision";
import { ordreAcceptable } from "@/lib/domain/ouverture";
import { positionFor } from "@/lib/documents/position";
import { etatDArbitrage } from "@/lib/domain/arbitrage";
import { peutOPCVM } from "@/lib/auth/types";
import { fmt, fmtDate, fmtDateTime, localIso } from "@/lib/format";
import { getT } from "@/i18n/server";
import { canalDuCode } from "@/lib/kyc/canal";
import { AuDoigt } from "./AuDoigt";
import { SignatureOrdre } from "./Signature";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

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
export default async function OrdrePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
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
  /* LA BONNE NOUVELLE SE DIT AVANT, PAS APRÈS.
     « Votre provision couvre cet ordre, vous n'aurez rien à virer » change la
     décision qu'on est en train de prendre : l'apprendre après la signature,
     c'est l'apprendre trop tard. Le solde se lit donc ici, et la même règle
     décidera à la signature, sur le solde de cet instant-là. */
  /* L'ARBITRAGE DE CET ORDRE, S'IL EN PORTE UN. La ligne d'arrivée est lue
     ici et non dans le rendu : une ligne retirée du Guichet rendrait
     « undefined », et la page doit alors dire « une ligne retirée » plutôt que
     de taire l'arbitrage — c'est précisément le cas où le client doit nous
     appeler. */
  const arb = etatDArbitrage(intent, localIso(new Date()));
  const arrivee = intent.switchToOfferId ? await repo().getOffer(intent.switchToOfferId) : undefined;
  const aRegler = aCouvrirPour(intent, offer);
  const dispo = intent.signedAt ? 0 : await disponibleDe(s.userId);
  const couvrirait = !intent.signedAt && aRegler > 0 && dispo >= aRegler;
  const couvert = Boolean(intent.coveredAt);
  const signable = ordreSignable(intent) && habilite && Boolean(dossier);
  const canal = signable && dossier ? await canalDuCode(s.userId, dossier) : undefined;

  return (
    <Glissement>
      <div className={styles.wrap}>
        <EnTete
          retour={{ href: "/moi/documents", mot: t("Mes documents") }}
          surTitre={`${t(INTENT_LABEL[intent.type])} · ${intent.signedAt ? t("signé") : signable ? t("étape 2 sur 2") : t(INTENT_STATE_LABEL[intent.state])}`}
          titre={intent.signedAt ? t("Votre ordre") : t("Signer mon ordre")}
          phrase={`${t(offer.title)}${f ? ` · ${f.manager}` : ""}`}
        />

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

        {/* L'ARBITRAGE PORTE SON ÉTAT EN CLAIR, ET C'EST LA MOITIÉ DU SERVICE.

            Le fil entre les deux ordres existait depuis la migration 0042 et
            n'était affiché NULLE PART côté client : il portait son arbitrage
            sans jamais le voir. Tant que la paire est armée, rien ne bouge — et
            « rien ne bouge » est exactement ce qu'un client ne peut pas
            distinguer d'un oubli de la maison. Il rappelle, ou il repasse
            l'ordre à la main, ce qui défait la protection.

            ET L'EXPIRATION SE LIT COMME UN SUCCÈS. Un arbitrage qui s'annule
            sans rien faire est la protection qui a joué ; écrit autrement, le
            client lit « ça n'a pas marché » et n'en reposera jamais. Les mots
            viennent du domaine, avec ceux du robot du soir, pour qu'ils ne
            divergent pas. */}
        {arb && (
          <section className={styles.arbitrage}>
            <div className={styles.arbH}>
              <span className={styles.arbPastille} data-etat={arb.etat}>{t(arb.mot)}</span>
              {t("Arbitrage vers {l}", { l: arrivee?.title ?? t("une ligne retirée") })}
            </div>
            <p className={styles.arbDit}>{t(arb.phrase)}</p>
            <dl className={styles.lignes}>
              {intent.switchFloor != null && (
                <div>
                  <dt>{t("Plancher signé")}</dt>
                  <dd>{fmt(intent.switchFloor)} FCFA</dd>
                </div>
              )}
              {intent.switchBy && (
                <div>
                  <dt>{t("Date limite")}</dt>
                  <dd>{fmtDate(intent.switchBy, false)}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {intent.signedAt ? (
          <div className={styles.signe}>
            {t("Ordre signé le {d} par {m}.", { d: fmtDateTime(intent.signedAt), m: t(intent.signedMethod ?? "code à usage unique") })} {t("Référence")} <b className="mono">{intent.ref}</b>
          </div>
        ) : signable ? (
          <>
            {/* L'APPAREIL D'ABORD, LE CODE ENSUITE. Un ordre couvert par la
                provision n'attend plus rien : l'argent est là, le plafond est
                signé, et il restait un code à aller chercher dans une boîte aux
                lettres. Le bloc ne paraît que si le navigateur connaît un
                appareil, ce que le serveur ignore : il se peint après. */}
            <AuDoigt id={intent.id} couvert={couvrirait} />
            <SignatureOrdre id={intent.id} canal={canal ? { to: canal.to, channel: canal.channel } : undefined} codeEnvoyeLe={intent.pendingCodeAt} />
            {/* LES DEUX ISSUES, SUR LA PAGE OÙ LE RAPPEL RENVOIE. Signer est
                au-dessus et pèse son poids ; renoncer est un lien de texte en
                dessous. Mais il existe, et c'est tout le point : un panier
                qu'on ne peut pas vider se garde plein. */}
            <RetirerOrdre intentId={intent.id} ref_={intent.ref} ouvertDoffice={"retirer" in ((await searchParams) ?? {})} />
          </>
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
            {couvert || couvrirait ? (
              /* COUVERT, IL N'Y A PLUS DE SECOND GESTE. Garder « vous virez »
                 sur un ordre déjà payé par la provision enverrait le client à
                 sa banque pour rien, ce qui est la friction qu'on retire. */
              <>
                <li className={couvert ? styles.fait : undefined}>
                  <b>{t("Réglé sur votre provision")}</b>
                  <small>{t("{m} FCFA réservés, rien à virer", { m: fmt(couvert ? (intent.coveredAmount ?? 0) : aRegler) })}</small>
                </li>
                <li>
                  <b>{titre ? t("Le desk transmet") : t("Le desk donne le go")}</b>
                  <small>{titre ? t("au marché, puis le résultat") : t("puis la centralisation")}</small>
                </li>
              </>
            ) : titre ? (
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
          {couvert ? (
            <p className={styles.fin}>{t("Cette somme est mise de côté sur votre solde : elle n'en sort qu'au règlement de l'opération. Ce qui n'est pas consommé y revient.")}</p>
          ) : couvrirait ? (
            <p className={styles.fin}>{t("Votre solde disponible couvre cet ordre : à la signature, la somme sera mise de côté et vous n'aurez rien à virer.")}</p>
          ) : titre ? (
            <p className={styles.fin}>{t("Vous ne payez jamais plus que le plafond. Servi en partie, vous ne payez que votre part ; non servi, tout vous revient, et le solde part sous 72 heures ouvrables si vous le demandez.")}</p>
          ) : (
            !rachat && <p className={styles.fin}>{t("Signer n'est pas payer : rien n'est à verser avant le go.")}</p>
          )}
        </section>
      </div>
    </Glissement>
  );
}
