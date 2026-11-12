import { DeskNav } from "@/components/DeskNav";
import { getT } from "@/i18n/server";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { SEUIL_CLIENTS, SEUIL_MONTANT, changementsDeLaLigne, consensus, mur, prete, type ChampsModifiables } from "@/lib/domain/sondage";
import { analyserGroupe, ageEnJours, demandesDuGroupe, minimum, versReponse } from "@/lib/domain/sondage-analyse";
import { fmt, fmtDate, localIso } from "@/lib/format";
import { Pourquoi } from "@/components/Pourquoi";
import { PoserUneQuestion } from "./Formulaires";
import { Accumulation } from "./Accumulation";
import { Questions, type QuestionOuverte } from "./Questions";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sondage" };

/**
 * CE QUE LE DESK REÇOIT, ET CE QUE LE ROBOT EN PROPOSE.
 *
 * CE QUE LE DIRIGEANT A DEMANDÉ : « Le desk recevra les lignes avec toutes
 * leurs caractéristiques (OTA, BTA, pays, maturité, coupon, prix, date…) et un
 * robot consolidera et proposera un consensus. »
 *
 * LE CONSENSUS SE CALCULE À LA LECTURE, ET C'EST UN CHOIX. Il est une fonction
 * pure des lignes : le faire écrire par un robot dans une table créerait un
 * chiffre qui vieillit — le desk lirait un consensus de la veille pendant qu'une
 * réponse de ce matin l'a déjà déplacé, et personne ne verrait l'écart. Ce que
 * le robot fait, lui, est ce qu'une lecture ne peut pas faire : clore ce dont la
 * date est passée, et PRÉVENIR quand un consensus franchit le seuil. Voir
 * « lib/sondage/tour ».
 *
 * L'ORDRE DE LA PAGE SUIT CELUI DE LA DÉCISION : d'abord ce qui est mûr — une
 * ligne qu'on peut porter à un Trésor aujourd'hui —, puis ce qui s'accumule,
 * puis les questions ouvertes, puis la question qu'on pose. Un desk qui ouvre
 * cette page le matin veut savoir en une seconde s'il a un coup de fil à passer.
 */
export default async function SondageDeskPage() {
  const t = await getT();
  await requireDesk("/desk/sondage");
  const r = repo();
    const lignes = await r.listLignesSondees();
  const groupes = consensus(lignes);
  const questions = lignes.filter((l) => l.origine === "desk" && l.state !== "close");
  const parId = new Map(lignes.map((l) => [l.id, l]));
  /* CE QU'UN CLIENT A MODIFIÉ SE VOIT (9 novembre 2026) : la dernière modification de chaque intention, lue dans l'audit, avec ce qui a changé champ par champ. Le fil ne dit que l'instant ; l'audit dit l'avant et l'après. */
  const audits = await r.listAudit({ entity: "sondage", limit: 1000 }).catch(() => []);
  const modifs = new Map<string, { at: string; resume: string }>();
  for (const a of audits) {
    if (a.action !== "sondage.modifie") continue;
    const deja = modifs.get(a.entityId);
    if (deja && deja.at >= a.at) continue;
    const avant = a.before as ChampsModifiables | undefined;
    const apres = a.after as ChampsModifiables | undefined;
    modifs.set(a.entityId, { at: a.at, resume: avant && apres ? changementsDeLaLigne(avant, apres).join(" · ") : "" });
  }


  const demandesDe = (cle: string) => demandesDuGroupe(lignes, cle);

  const aujourdhui = localIso(new Date());
  const modifsTexte = new Map([...modifs].map(([id, m]) => [id, `${t("modifiée le {d}", { d: fmtDate(m.at.slice(0, 10), false) })}${m.resume ? ` · ${m.resume}` : ""}`]));
  /* Une ligne par sondage : tout ce que le desk lit pour analyser, calculé une fois, ici, et passé au tableau tel quel. */
  const analyses = groupes.map((c) => {
    const a = analyserGroupe(c, demandesDe(c.cle), c.surLigne ? parId.get(c.surLigne) : undefined, modifsTexte, mur(c));
    return { ...a, age: ageEnJours(a.derniere, aujourdhui) };
  });
  const ouvertes: QuestionOuverte[] = questions.map((q) => {
    const reps = lignes.filter((l) => l.repondA === q.id && l.state !== "close");
    const dernieres = reps.map((l) => l.updatedAt || l.createdAt).sort();
    return {
      id: q.id,
      ref: q.ref,
      ligne: `${q.instrument} · ${t(q.country)} · ${q.tenor}`,
      posee: q.createdAt,
      horizon: prete(q),
      cherche: q.montant,
      recu: reps.reduce((s, l) => s + l.montant, 0),
      tauxMin: minimum(reps.map((l) => l.rate)),
      prixMin: minimum(reps.map((l) => l.pricePct)),
      age: ageEnJours(dernieres[dernieres.length - 1], aujourdhui),
      reponses: reps.map((l) => versReponse(l, modifsTexte)),
    };
  });

  return (
    <main className={styles.page}>
      <DeskNav current="/desk/sondage" />
      <header className={styles.tete}>
        <span className="eyebrow">{t("Marché primaire")}</span>
        <h1 className="display">{t("Sondage d'avant séance")}</h1>
        <p className={styles.phrase}>
          {t("Ce que la place prendrait, avant qu'un Trésor annonce quoi que ce soit.")}
          <Pourquoi titre="Comment ce consensus est calculé" petit>
            <p>
              {t(
                "Il se recalcule à CHAQUE LECTURE de cette page : il n'y a pas de chiffre d'hier ici. Un consensus rangé chaque soir dans une table vieillirait entre deux lectures, et rien ne dirait l'écart.",
              )}
            </p>
            <p>
              {t("Le niveau est la moyenne des taux PONDÉRÉE PAR LES MONTANTS : dix clients à un million ne pèsent pas comme un à cent millions devant un Trésor. L'échelle, elle, dit où la demande s'arrête vraiment.")}
            </p>
            <p>
              {t("La date est le PLUS TARD des « à partir de » : une séance tenue avant elle trouverait sans fonds un client compté dans la demande.")}
            </p>
            <p>
              {t("Une demande se porte à partir de {m} FCFA ET de {n} clients. Cent millions d'un seul client ne sont pas une demande de la place, c'est un ordre, et il a sa propre porte.", {
                m: fmt(SEUIL_MONTANT),
                n: String(SEUIL_CLIENTS),
              })}
            </p>
          </Pourquoi>
        </p>
      </header>

      {/* CE QUI S'ACCUMULE, pour analyser. Sous le seuil, et ce n'est pas un rebut : c'est la matière des séances du trimestre prochain. Un desk qui ne voit que ce qui est mûr ne
          sait jamais ce qui vient. Une ligne par sondage ; le volet dit ce qui la fonde, et l'export CSV permet de conduire l'analyse ailleurs. */}
      <section className={styles.bloc}>
        <div className={styles.titreRang}>
          <h2 className={styles.titre}>{t("Ce qui s'accumule")}</h2>
          {analyses.length > 0 && (
            <a className={styles.exporter} href="/desk/sondage/export">
              {t("Tout exporter en CSV")}
            </a>
          )}
        </div>
        {analyses.length === 0 ? <div className="empty">{t("Rien d'autre en attente.")}</div> : <Accumulation groupes={analyses} />}
      </section>

      <section className={styles.bloc}>
        <h2 className={styles.titre}>{t("Les questions ouvertes")}</h2>
        {ouvertes.length === 0 ? <div className="empty">{t("Aucune question posée en ce moment.")}</div> : <Questions questions={ouvertes} />}
      </section>

      <section className={styles.bloc}>
        <h2 className={styles.titre}>{t("Poser une question à la place")}</h2>
        <PoserUneQuestion />
      </section>
    </main>
  );
}
