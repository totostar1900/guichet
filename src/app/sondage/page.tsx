import { Fragment, type ReactNode } from "react";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { etatDeLAttente, motDuNiveau, prete, rendementDeLaLigne } from "@/lib/domain/sondage";
import type { LigneSondee } from "@/lib/domain/types";
import { getT } from "@/i18n/server";
import { fmtDate, fmtPct, fmtUnits, localIso } from "@/lib/format";
import { codeDuPays } from "@/lib/market/budget";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { EnBref } from "@/components/EnBref";
import { Pourquoi } from "@/components/Pourquoi";
import { Repondre, ProposerMaLigne, Retirer } from "./Formulaires";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sondage" };

/**
 * LA PAGE DU SONDAGE, QUI N'EN AVAIT PAS.
 *
 * CE QUE LE DIRIGEANT A DEMANDÉ : « Le sondage demande une page à lui. Pour
 * l'instant il mène aux adjudications, où il n'a pas sa place. »
 *
 * ET IL AVAIT RAISON SUR LE FOND, pas seulement sur le rangement. La tuile
 * « Sondage » menait au calendrier des adjudications, c'est-à-dire à la liste
 * des séances DÉJÀ ANNONCÉES. Or le sondage sert précisément à l'inverse : dire
 * ce qu'on prendrait AVANT qu'une séance existe. Le client qui suivait la tuile
 * arrivait donc sur l'écran qui prouvait que le service ne servait à rien — il
 * n'y avait plus rien à sonder, tout était déjà là.
 *
 * ─── L'ORDRE DE LA PAGE, ET IL EST DÉLIBÉRÉ ────────────────────────────────
 *
 *   CE QUE LA MAISON DEMANDE, en premier. C'est la seule chose ici dont le
 *   client ne peut pas deviner l'existence, et c'est ce pour quoi il vient :
 *   répondre coûte un montant et une date, et vaut un rappel avant la clôture.
 *
 *   CE QU'IL A DÉJÀ DIT, ensuite. « L'attente du client est gardée sur sa
 *   page » : sans ce bloc, il redirait chaque mois la même chose, ou rien.
 *
 *   SA PROPRE LIGNE, en dernier et replié. C'est le geste le plus rare et le
 *   plus long — six champs — et le mettre en tête ferait croire qu'il faut
 *   inventer une ligne pour se servir de la page.
 *
 * CE QUE LA PAGE NE MONTRE PAS, et c'est un refus : le consensus. Savoir qui
 * prendrait combien est exactement ce qu'un concurrent voudrait lire, et un
 * client qui verrait la demande totale avant de répondre ajusterait son niveau
 * dessus — ce qui ferait du sondage un marché, et d'un renseignement une
 * enchère. Le consensus est au desk, et il n'en sort que porté à un Trésor.
 */
/**
 * CE QU'UNE INTENTION REND AU FORMULAIRE QUI LA ROUVRE.
 *
 * ELLE REND SES DEUX DATES, ET PLUS UN DÉLAI. Le champ demandait un nombre de
 * jours, la page répondait par une date, et le nombre rendu n'était même pas
 * celui qu'on avait tapé : c'était ce qui restait à courir, quatorze le 26
 * pour un « vingt et un » écrit le 19. Le client écrit maintenant le jour, et
 * c'est ce jour que la base garde.
 */
const modifiable = (l: LigneSondee) => ({
  id: l.id,
  montant: l.montant,
  rate: l.rate,
  pricePct: l.pricePct,
  pretLe: prete(l),
  jusquA: l.jusquA,
  note: l.note,
  instrument: l.instrument,
  country: l.country,
  tenor: l.tenor,
});

export default async function SondagePage() {
  const t = await getT();
  const s = await requireSession("/sondage");
  const r = repo();
  const aujourdHui = localIso(new Date());

  const [questions, miennes] = await Promise.all([r.listLignesSondees({ origine: "desk" }), r.listLignesSondees({ userId: s.userId })]);
  const ouvertes = questions.filter((q) => q.state !== "close");
  const repondu = new Map(miennes.filter((m) => m.repondA && m.state !== "close").map((m) => [m.repondA!, m]));
  const vivantes = miennes.filter((m) => m.state !== "close");
  const closes = miennes.filter((m) => m.state === "close");

  return (
    <Glissement>
      <main className={styles.page}>
        <EnTete
          surTitre={t("Investissez")}
          titre={t("Sondage")}
          /**
           * UNE SEULE PORTE D'EXPLICATION, ET C'EST LA BULLE.
           *
           * DEMANDÉ LE 29 OCTOBRE 2026 : « reporter le commentaire dans la
           * bulle point d'interrogation en haut dans le en bref, en y
           * éliminant les doublons ». La page en portait DEUX, à dix
           * centimètres l'une de l'autre : un accordéon « À quoi sert un
           * sondage » sous la phrase, et le brief au coin droit. Deux portes
           * pour une même question apprennent à n'en ouvrir aucune — et
           * elles divergent, puisque rien ne les tient ensemble.
           *
           * CE QUI ÉTAIT UN DOUBLON, ET QUI EST PARTI. Le deuxième
           * paragraphe de l'accordéon — « ce n'est pas un ordre, vous la
           * retirez quand vous voulez » — redisait « RAISON.sondage » (« sans
           * vous engager ») et la quatrième étape (« rien ne vous engage, et
           * vous retirez votre attente quand vous voulez »). Il ne reste de
           * lui que ce que le brief ne disait pas : rien à signer, rien à
           * provisionner.
           *
           * CE QUI N'EN ÉTAIT PAS, ET QUI A DÉMÉNAGÉ. Pourquoi un Trésor
           * achète ce renseignement est un contexte que le catalogue des
           * services ne porte pas et ne doit pas porter : il parle du MARCHÉ,
           * pas du service. Il vient donc avant les étapes. Et la légende de
           * « ~ », « ind. » et « min. » suppose la liste sous les yeux : elle
           * vient après.
           *
           * LES DEUX SONT PARTIES DE CETTE PAGE le 31 octobre 2026, dans
           * « components/briefs/prose ». Le « i » d'une tuile de Trade ouvre
           * désormais la même feuille, et Trade n'a aucun moyen d'atteindre du
           * JSX écrit dans le corps d'une page qu'il n'ouvre pas.
           */
          /**
           * DEUX SOUS-TEXTES, ET LE SECOND REMONTE CE QUE LE PREMIER TAISAIT.
           *
           * La phrase ne disait que l'objet de la page ; ce qui JUSTIFIE la
           * page — « la plupart des séances que nous obtenons en viennent » —
           * était enfermé dans l'état vide de la liste, c'est-à-dire dans
           * l'écran que presque personne n'atteint : tant qu'une ligne est
           * sondée, et c'est le cas normal, le lecteur n'apprenait jamais que
           * pousser sa propre ligne est ce qui fait naître les séances.
           *
           * ET AUCUN DES DEUX NE NOMME LE VIDE. Une page ne dit pas « il n'y a
           * rien » : elle dit ce qu'on y fait. Quand la maison ne sonde rien,
           * il reste un geste, et c'est celui-là ; quand elle sonde, il y en a
           * deux, dans l'ordre où ils se présentent à l'écran.
           */
          phrase={
            ouvertes.length === 0
              ? t("Dire ce que vous prendriez avant qu'une séance ouvre. Proposez la ligne que vous cherchez : la plupart des séances que nous obtenons en viennent, et rien ne vous engage.")
              : t("Dire ce que vous prendriez avant qu'une séance ouvre. Répondez à une ligne, ou proposez celle que vous cherchez : la plupart des séances que nous obtenons en viennent, et rien ne vous engage.")
          }
          aCote={<EnBref brief="sondage" />}
        />

        {/* LE TITRE POSE LA QUESTION, et c'est la demande du dirigeant :
            « Combien investiriez-vous ? » plutôt que « Ce que la maison
            demande ». Le second décrivait au client ce qu'il avait sous les
            yeux ; le premier lui demande quelque chose, et c'est exactement ce
            que la page attend de lui.

            Une question close ne paraît pas : elle n'attend plus de réponse, et
            la montrer barrée ferait chercher un bouton qui n'existe plus. */}
        <section className={styles.bloc}>
          <h2 className={styles.titre}>{t("Combien investiriez-vous ?")}</h2>
          {/* RIEN NE S'ÉCRIT ICI QUAND RIEN N'EST SONDÉ : la phrase du haut vient
              de dire quoi faire, et la bande « Proposer votre propre ligne » est
              juste dessous. Un second texte redirait le premier à dix
              centimètres, et nommerait le vide par-dessus le marché. */}
          {ouvertes.length === 0 ? null : (
            <ul className={styles.liste}>
              {ouvertes.map((q) => {
                const mienne = repondu.get(q.id);
                return (
                  <li key={q.id} className={styles.question}>
                    {/* « RÉPONDU » SE VOIT D'UN COUP D'ŒIL, et c'est ce qui
                        remplace la phrase qu'on a retirée : le client qui
                        parcourt la liste doit savoir lesquelles il a déjà
                        traitées sans lire chaque bouton. Le chiffre, lui, est
                        dans le formulaire que le bouton rouvre — et une fois,
                        dans ses intentions. */}
                    <Faits
                      l={q}
                      role="question"
                      t={t}
                      avant={mienne ? <span className={styles.pastille}>{t("Répondu")}</span> : undefined}
                    />
                    {q.note && <p className={styles.note}>{q.note}</p>}
                    {/* LA RÉPONSE DÉJÀ DITE N'EST PLUS RÉÉCRITE ICI.
                        Le dirigeant l'a vu : « une tuile montre déjà la réponse
                        du client ; comment cela se combine-t-il avec “vos
                        intentions” en dessous ? » Elle était écrite deux fois,
                        sous deux formes — une phrase ici, une ligne là — et deux
                        écritures du même chiffre finissent par en dire deux.
                        Elle vit UNE fois, dans vos intentions ; ici il ne reste
                        que le fait d'avoir répondu, et le bouton qui rouvre la
                        réponse telle qu'elle a été dite. */}
                    <Repondre question={{ id: q.id, instrument: q.instrument, mot: motDuNiveau(q.instrument) }} existante={mienne ? modifiable(mienne) : undefined} aujourdHui={aujourdHui} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* VOS INTENTIONS, ET LE « + » QUI EN AJOUTE UNE.
            « Où est le bouton + pour la ligne du client ? » Il était au bas de
            la page, sous un troisième titre — « Proposer votre ligne / Remplir
            le gabarit » — c'est-à-dire à l'endroit où l'on ne regarde plus, et
            loin des intentions auxquelles il en ajoute une. Il est maintenant au
            titre de celles-ci : une ligne poussée par le client EST une
            intention, et c'est le même endroit pour les lire et pour en
            ajouter.

            Et c'est « vos intentions » plutôt que « ce que vous avez dit » :
            ce qui est là engage le desk à rappeler, pas une conversation. */}
        {/* LE BOUTON A SA PROPRE BANDE, ENTRE LES DEUX LISTES.
            « Un bouton à lui, séparé, après “combien investiriez-vous ?” et avant
            “vos intentions”. » Posé au titre des intentions, il se lisait comme
            un réglage de cette liste-là ; posé ici, il est ce qu'il est : la
            suite de la question qu'on vient de lire — « et si ce que je cherche
            n'y était pas ? » — et la porte de ce qu'on va trouver en dessous. */}
        <ProposerMaLigne aujourdHui={aujourdHui} />

        <section className={styles.bloc} id="mes-attentes">
          <h2 className={styles.titre}>{t("Vos intentions")}</h2>
          {vivantes.length === 0 && closes.length === 0 ? (
            <p className={styles.vide}>{t("Rien encore. Répondre à une ligne ci-dessus prend deux chiffres ; proposer la vôtre en prend six.")}</p>
          ) : (
            <ul className={styles.attentes}>
              {[...vivantes, ...closes].map((m) => {
                const e = etatDeLAttente(m);
                return (
                  <li key={m.id} className={styles.attente} data-etat={e.etat}>
                    {/* L'ÉTAT OUVRE LA LIGNE, et il la quitte aussitôt : le mot
                        dit où en est l'attente, et le point d'interrogation dit
                        ce que le mot veut dire — vrai en permanence, donc
                        replié. Le MOTIF d'une clôture, lui, reste à l'écran :
                        il change d'une ligne à l'autre. */}
                    <Faits
                      l={m}
                      role="attente"
                      t={t}
                      avant={
                        <>
                          <span className={styles.pastille} data-etat={e.etat}>
                            {t(e.mot)}
                          </span>
                          <Pourquoi titre={e.etat === "close" ? "Une attente close" : e.etat === "consolidee" ? "Une attente portée au Trésor" : "Une attente reçue"} petit>
                            <p>{t(e.phrase)}</p>
                          </Pourquoi>
                        </>
                      }
                    />
                    {m.closedReason && <p className={styles.motif}>{m.closedReason}</p>}
                    {/* MODIFIER AVANT RETIRER : c'est le geste qu'on vient faire
                        le plus souvent — un chiffre a bougé — et le retrait, qui
                        est définitif, ne doit pas être le premier sous la main.
                        Une réponse se rouvre par son formulaire de réponse, une
                        ligne poussée par son gabarit : ce n'est pas le même
                        geste, parce que ce ne sont pas les mêmes champs. */}
                    {m.state !== "close" && (
                      <div className={styles.gestes}>
                        {m.repondA ? (
                          <Repondre question={{ id: m.repondA, instrument: m.instrument, mot: motDuNiveau(m.instrument) }} existante={modifiable(m)} discret aujourdHui={aujourdHui} />
                        ) : (
                          <ProposerMaLigne existante={modifiable(m)} aujourdHui={aujourdHui} />
                        )}
                        <Retirer id={m.id} ref_={m.ref} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

      </main>
    </Glissement>
  );
}

/**
 * LA BANDE DE FAITS, ÉCRITE UNE FOIS POUR LES DEUX TUILES.
 *
 * CE QUE LE DIRIGEANT A DEMANDÉ, le 26 octobre 2026 : « harmoniser les tuiles
 * du sondage — montant court, maturité, coupon pour une OTA, taux pour un
 * bon ». Les deux tuiles de cette page portent la même chose et la disaient
 * autrement : la question de la maison annonçait « 500 000 000 FCFA · autour de
 * 6,25 % · séance visée le 9 nov. », l'attente du client « 250 000 000 FCFA ·
 * au coupon d'au moins 6,10 % · à partir du 3 nov. ». Trois écarts pour une
 * seule information : la durée était en haut d'un côté et absente de l'autre,
 * le montant était écrit au franc, et la date promettait une séance.
 *
 * ELLE EST DONC UNE FONCTION, ET NON DEUX GABARITS. Deux listes qui décrivent
 * la même chose divergent au premier changement — celle qu'on retouche, et
 * celle qu'on oublie. Le `role` ne change QUE le sens du niveau, qui n'est pas
 * le même : la maison dit un niveau INDICATIF, le client dit un PLANCHER.
 * Confondre les deux ferait porter au Trésor un chiffre que personne n'a dit.
 *
 * LE MONTANT EST COURT — « 500 M FCFA », « 1,2 Md FCFA » — parce qu'une tuile
 * se compare d'un coup d'œil : neuf chiffres se comptent, un ordre de grandeur
 * se voit. Le franc exact reste au desk, où l'on porte la demande.
 *
 * ET LA DATE NE PROMET PLUS DE SÉANCE. « Séance visée le 9 nov. » disait ce que
 * la maison ne peut pas dire : elle n'adjuge pas, et le sondage ne suit aucun
 * calendrier annoncé — c'est elle qui réunit les appétits, avant qu'il y ait
 * quoi que ce soit à annoncer. « À partir du » dit la même date sans la
 * promesse, et c'est le même mot dans les deux rôles.
 *
 * ─── UNE SEULE LIGNE, ET UNE SEULE POLICE, le 26 octobre 2026 ──────────────
 *
 * CE QUE LE DIRIGEANT A ÉCRIT, et c'est un gabarit, pas une description :
 *
 *     OTA • CMR • 5 ans • coupon ind. 5% • Rendement ind. 5.5% • ~ 30 oct
 *     « Avec une police harmonisée et de taille raisonnable. »
 *
 * CE QUE CELA RETIRE : le nom de la ligne au-dessus, et le chiffre de tête.
 * La tuile avait un titre, un sous-titre et une bande — trois degrés pour six
 * faits qui sont tous du même rang. Aucun n'est le titre des autres : le
 * compartiment ne coiffe pas la durée, le coupon ne coiffe pas la date. Une
 * hiérarchie posée sur des faits de même rang ne hiérarchise rien, elle
 * fatigue.
 *
 * L'ÉTAT ABRÈGE CE QUI EST LONG ET GARDE CE QUI EST FAUX AUTREMENT : « CMR »
 * plutôt que « Cameroun », « ind. » plutôt que « indicatif », « ~ » plutôt que
 * « à partir du ». Sur 412 px, « Cameroun » coûte la place de deux faits.
 *
 * ─── LA QUESTION NE PORTE PLUS DE MONTANT, le 26 octobre 2026 ───────────────
 *
 * CE QUE LE DIRIGEANT A DIT : « retirer le montant de l'offre, puisque c'est
 * justement ce que nous cherchons à savoir ».
 *
 * ET C'EST LE DÉFAUT LE PLUS COÛTEUX DE CETTE PAGE, parce qu'il ne se voit pas :
 * « 500 M FCFA » écrit sur la question DONNE LA RÉPONSE AVANT DE POSER LA
 * QUESTION. Le client qui aurait dit trente millions en dit cinquante, celui
 * qui en aurait dit huit cents en dit cinq cents, et la maison porte au Trésor
 * son propre chiffre, renvoyé par un miroir. Un sondage dont la question
 * contient sa réponse ne mesure plus rien, et rien à l'écran ne le montre : les
 * chiffres sont plausibles, la page est jolie, et le renseignement est faux.
 *
 * LE MONTANT CHERCHÉ RESTE DEMANDÉ AU DESK, et c'est voulu : c'est sa cible, et
 * la page du desk la met en regard de ce que la place donne. Il n'en sort pas.
 */
function Faits({ l, role, t, avant }: { l: LigneSondee; role: "question" | "attente"; t: (s: string, v?: Record<string, string>) => string; avant?: ReactNode }) {
  /* Le niveau est un taux sur les deux compartiments — coupon sur une OTA, taux
     précompté sur un bon : même sens, deux mots, voir « motDuNiveau ». */
  const mot = motDuNiveau(l.instrument);
  /* Toujours une date, jamais le délai tel qu'il a été écrit : « dans 21 jours »
     posé le 19 se relit « le 16 novembre » quand la ligne dit le 9. */
  const j = prete(l);
  /* « IND. » POUR LA MAISON, « MIN. » POUR LE CLIENT, et c'est la seule chose
     que le rôle change : la maison indique un niveau, le client pose un
     plancher. Deux abréviations de même longueur, au même endroit de la
     phrase — l'œil compare les chiffres, pas les mots. */
  const q = role === "question" ? "ind." : "min.";
  /* LE RENDEMENT EST LE CHIFFRE QUI COMPARE : un coupon de 6,25 % acheté à 97
     ne rend pas 6,25 %. Un bon n'en a pas — son taux EST son rendement. */
  const r = rendementDeLaLigne(l);

  /**
   * DEUX RANGÉES, ET NON UNE PHRASE : L'IDENTITÉ, PUIS LES CHIFFRES.
   *
   * DEMANDÉ LE 29 OCTOBRE 2026 : « une présentation plus harmonieuse des
   * lignes proposées, facilitant la lecture rapide ». Les sept faits se
   * suivaient dans une phrase, au même poids, séparés par des points
   * médians : « OTA · CM · 5 ans · 50 M · coupon min. 6,25 % · rendement
   * min. 6,40 % · ~ 9 nov. ».
   *
   * CE QUI EMPÊCHE DE LIRE VITE N'EST PAS LA LONGUEUR, C'EST LE DÉPLACEMENT.
   * Dans une liste, l'œil ne lit pas chaque ligne : il compare la MÊME
   * grandeur d'une ligne à l'autre. Une phrase met le montant après le nom
   * du Trésor, donc à une abscisse différente à chaque rangée — « CM » fait
   * deux signes, « GQ » aussi, mais « 5 ans » et « 52 semaines » non. Le
   * regard doit relire pour retrouver ce qu'il cherchait.
   *
   * L'IDENTITÉ TIENT LA PREMIÈRE RANGÉE — ce qu'est la ligne —, les chiffres
   * la seconde, chacun sous son étiquette et en chiffres de même chasse. Ce
   * qui se compare se retrouve au même endroit, et ce qui ne se compare pas
   * ne vole plus la place de ce qui se compare.
   *
   * LE MONTANT PASSE EN TÊTE DES CHIFFRES sur une intention : c'est celui
   * qu'on vient vérifier. Sur une question de la maison il n'y en a pas, et
   * le niveau prend la tête.
   */
  const identite = [l.instrument, codeDuPays(l.country), l.tenor].join(" · ");
  const chiffres: { quoi: string; dit: string; fort?: boolean }[] = [
    role === "attente" ? { quoi: t("montant"), dit: fmtUnits(l.montant, true), fort: true } : null,
    l.rate != null ? { quoi: `${t(mot === "taux" ? "taux" : "coupon")} ${q}`, dit: fmtPct(l.rate, 2) } : null,
    r != null ? { quoi: `${t("rendement")} ${q}`, dit: fmtPct(r, 2) } : null,
    j ? { quoi: t("prête vers"), dit: fmtDate(j, false) } : null,
    /* LA FENÊTRE SE LIT ENTIÈRE : un début sans fin laisse croire qu'une
       attente court toujours, et c'est précisément ce qu'elle ne fait plus. */
    l.jusquA ? { quoi: t("valable jusqu'au"), dit: fmtDate(l.jusquA, false) } : null,
  ].filter((x): x is { quoi: string; dit: string; fort?: boolean } => x !== null);

  return (
    <p className={styles.faits}>
      {/* L'ÉTAT ET SON POINT SONT DANS LA PHRASE, et non à côté d'elle : posés
          en voisins dans une rangée en flex, ils volaient quatre-vingt-dix
          pixels à la bande, qui se repliait sur trois lignes dans sa colonne
          étroite (relevé à 412 px). Dans la phrase, le texte reprend toute la
          largeur dès la deuxième ligne. */}
      {/* L'ÉTAT ET SON POINT RESTENT DANS LA PREMIÈRE RANGÉE, et non à côté
          d'elle : posés en voisins dans une rangée en flex, ils volaient
          quatre-vingt-dix pixels à la bande, qui se repliait sur trois
          lignes dans sa colonne étroite (relevé à 412 px). */}
      {avant ? <>{avant} </> : null}
      <span className={styles.identite}>{identite}</span>{" "}
      <span className={`mono ${styles.ref}`}>{l.ref}</span>
      {/* LES CHIFFRES SUR LEUR PROPRE RANGÉE, chacun sous son étiquette.
          L'ESPACE QUI SÉPARE DEUX GROUPES RESTE DEHORS du morceau insécable :
          enfermé dedans, il ne donnait plus une seule occasion de passer à la
          ligne, et la bande sortait du cadre (relevé à 412 px). */}
      {chiffres.length > 0 && (
        <span className={styles.chiffres}>
          {chiffres.map((c, i) => (
            <Fragment key={c.quoi}>
              {i > 0 ? " " : null}
              <span className={c.fort ? styles.chiffreFort : styles.chiffre}>
                <em className={styles.etiquette}>{c.quoi}</em> {c.dit}
              </span>
            </Fragment>
          ))}
        </span>
      )}
    </p>
  );
}
