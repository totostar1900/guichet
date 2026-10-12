import Link from "next/link";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Nos placements") };
}

/**
 * NOS PLACEMENTS : ce qu'on peut faire ici, et comment on s'y prend.
 *
 * DEUX PAGES ONT ÉTÉ FONDUES EN UNE, sur décision de Georges le 12 octobre
 * 2026. La maquette en portait quatre : « Ce que vous pouvez faire »,
 * « Comment ça marche », « Nous joindre » et « À propos ». Les deux premières
 * répondaient à une seule question posée en deux temps, et un visiteur qui lit
 * l'une sans l'autre repart avec la moitié de la réponse : ce qu'on vend sans
 * savoir comment on l'obtient, ou l'inverse. « Nous joindre » disparaît : le
 * contact vit au pied de page et sur « /info/aide », où il était déjà.
 *
 * L'ORDRE DE LA PAGE EST CELUI D'UNE DÉCISION, et non celui d'un catalogue :
 * ce que je peux faire, ce que ça rapporte et ce que ça risque, comment je
 * commence, ce qui se passe ensuite, et ce que ça coûte. Les frais viennent
 * donc avant l'appel à l'action, jamais après.
 *
 * AUCUN TAUX, AUCUN RENDEMENT, AUCUN MONTANT. La règle de la vitrine tient
 * ici comme à l'accueil : la page dit la NATURE de chaque placement et son
 * risque, et les chiffres s'ouvrent avec le compte.
 */
export default async function PlacementsPage() {
  const t = await getT();

  const familles = [
    {
      clef: "etats",
      d: "M3 20h18 M5 20V10l7-5 7 5v10 M10 20v-6h4v6",
      titre: t("Prêter aux États de la zone"),
      corps: [
        t("Les six États de la CEMAC empruntent sur le marché pour financer leurs budgets. Ils annoncent une séance, fixent la somme recherchée et la durée, et chacun peut y prendre part. Vous leur prêtez le montant de votre choix ; l'État vous verse un intérêt, puis vous rembourse à l'échéance convenue."),
        t("Les durées vont de quelques semaines à dix ans. Plus la durée est longue, plus le taux est élevé : c'est la règle du marché, et elle se lit sur la courbe des taux que nous publions."),
      ],
      qui: t("Cameroun, Gabon, Congo, Tchad, Guinée équatoriale, Centrafrique."),
      touchez: t("Un intérêt aux dates prévues, puis le capital à l'échéance."),
      risque: t("Celui que l'émetteur ne paie pas, et celui de revendre avant terme à un prix plus bas."),
    },
    {
      clef: "institutions",
      d: "M4 21h16 M6 21V8h5v13 M13 21V3h5v18",
      titre: t("Prêter aux institutions et aux entreprises"),
      corps: [
        t("La banque de développement de l'Afrique centrale et les grandes sociétés de la région empruntent elles aussi, en émettant des obligations. Le mécanisme est celui des emprunts d'État : un intérêt régulier, une échéance connue d'avance, et un titre que vous pouvez céder entre-temps."),
        t("Certaines de ces obligations s'amortissent, c'est-à-dire qu'elles vous rendent le capital par tranches au lieu d'une seule fois. Votre échéancier le dit, ligne par ligne et date par date."),
      ],
      qui: t("La BDEAC, et des sociétés de la zone admises à la cote."),
      touchez: t("Un coupon, puis le capital, en une fois ou par tranches."),
      risque: t("Celui de l'émetteur, et celui d'une revente difficile sur un marché étroit."),
    },
    {
      clef: "actions",
      d: "M3 17l6-6 4 3 7-8 M20 6h-4 M20 6v4",
      titre: t("Prendre part au capital des sociétés cotées"),
      corps: [
        t("Acheter une action, c'est devenir propriétaire d'une fraction d'une entreprise. Vous percevez votre part des bénéfices qu'elle décide de distribuer, et vous pouvez revendre vos titres lorsque le marché le permet."),
        t("À la différence d'un emprunt, rien n'est promis : ni le dividende, ni le prix de revente. En contrepartie, votre gain n'est pas plafonné par un taux. La fiche de chaque société porte ses comptes publiés et son dernier cours, avec sa date."),
      ],
      qui: t("La bourse régionale, et les sociétés qui y sont inscrites."),
      touchez: t("Le dividende s'il est voté, et le prix de cession si vous vendez."),
      risque: t("Le cours peut baisser, et la perte peut porter sur tout le capital investi."),
    },
    {
      clef: "fonds",
      d: "M12 3l9 5-9 5-9-5z M3 13l9 5 9-5",
      titre: t("Placer dans des fonds agréés par la COSUMAF"),
      corps: [
        t("Un fonds réunit l'épargne de nombreuses personnes et la confie à un gérant professionnel, qui la répartit entre plusieurs placements. Vous n'avez pas à choisir ligne par ligne : vous souscrivez une part, et votre argent suit la stratégie annoncée."),
        t("Tous les fonds que nous présentons sont agréés par la COSUMAF, le régulateur du marché financier de l'Afrique centrale, et leur société de gestion comme leur dépositaire sont déclarés. Nous affichons pour chacun sa valeur de part, la date de cette valeur et ses frais."),
      ],
      qui: t("La COSUMAF agrée le fonds et sa société de gestion."),
      touchez: t("La valeur de votre part au jour du rachat, frais déduits."),
      risque: t("Celui des placements que le fonds détient. Un agrément n'est pas une garantie de rendement."),
    },
  ];

  const temps = [
    {
      n: "1",
      titre: t("Vous créez votre compte"),
      dit: t("Vous donnez votre nom, une adresse électronique et un numéro. Un code à usage unique vous parvient dans l'instant et prouve que ce canal est bien le vôtre. Aucun mot de passe à retenir."),
      points: [t("Vous voyez les prix et la courbe"), t("Vous recevez les avis de séance"), t("Vous préparez votre dossier à votre rythme")],
      cout: t("Une minute. Aucun document."),
    },
    {
      n: "2",
      titre: t("Vous faites ouvrir votre compte-titres"),
      dit: t("La réglementation nous oblige à savoir qui vous êtes avant de détenir vos titres et votre argent. C'est la connaissance du client, et elle protège autant la place que vous."),
      points: [t("Une pièce d'identité en cours de validité"), t("Un justificatif de domicile récent"), t("Votre situation et l'origine des fonds"), t("Un questionnaire sur votre connaissance des placements")],
      cout: t("Dix minutes. Le bureau examine, puis la convention se signe."),
    },
    {
      n: "3",
      titre: t("Vous approvisionnez et vous placez"),
      dit: t("Par virement, vers le compte espèces ouvert à votre nom. Vous choisissez une séance annoncée ou une ligne de la cote, et vous suivez votre allocation jusqu'à son règlement."),
      points: [t("Chaque mouvement porte sa date de valeur"), t("Vous retirez à tout moment ce qui n'est pas engagé")],
      cout: t("Dès l'approbation de votre dossier."),
    },
  ];

  const vie = [
    { quand: t("Vous alimentez"), dit: t("Par virement, vers le compte espèces ouvert à votre nom. Dès que les fonds sont reçus, votre compte le montre avec la date de valeur, c'est-à-dire le jour où l'argent compte réellement pour vous.") },
    { quand: t("Vous choisissez"), dit: t("Une séance d'emprunt annoncée, une ligne de la cote, ou un fonds. La fiche vous donne l'émetteur, la durée, les conditions, et ce que vous percevrez. Vous indiquez votre montant.") },
    { quand: t("Nous exécutons"), dit: t("Le bureau porte votre ordre sur le marché, puis vous dit ce qui vous a été attribué et à quel prix. Sur une séance d'emprunt, la demande dépasse parfois l'offre : vous recevez alors une part de ce que vous aviez demandé, et nous vous le disons tel quel.") },
    { quand: t("Vous détenez"), dit: t("Les titres sont inscrits à votre nom. Votre portefeuille affiche chaque ligne avec son échéancier : les dates auxquelles vous percevrez un intérêt, et celle du remboursement.") },
    { quand: t("Vous percevez"), dit: t("À chaque échéance, la somme arrive sur votre compte espèces. Elle y reste à votre disposition : vous la retirez, ou vous la replacez. Si vous l'avez décidé d'avance, elle repart seule vers la ligne que vous avez désignée.") },
    { quand: t("Vous retirez"), dit: t("Vous demandez un virement vers votre banque, à tout moment, pour les sommes qui ne sont pas engagées. Le mouvement figure au journal, avec sa date.") },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.tete}>
        <span className="eyebrow">{t("Nos placements")}</span>
        <h1>{t("Quatre emplois pour votre épargne, et trois temps pour commencer.")}</h1>
        <p>{t("Chacun se tient dans le même compte. Vous passez de l'un à l'autre sans rien rouvrir, et votre conseiller vous aide à choisir si vous le souhaitez.")}</p>
      </header>

      {/* LES QUATRE FAMILLES. Chacune porte ce qu'elle rapporte ET ce qu'elle
          risque, dans le même encadré : séparer les deux ferait de la seconde
          une petite ligne qu'on saute. */}
      <div className={styles.familles}>
        {familles.map((f) => (
          <section className="panel" key={f.clef} id={f.clef}>
            <div className={styles.familleTete}>
              <span className={styles.figurine}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={f.d} />
                </svg>
              </span>
              <h2>{f.titre}</h2>
            </div>
            <div className={styles.familleCorps}>
              <div className={styles.prose}>
                {f.corps.map((p) => (
                  <p key={p.slice(0, 24)}>{p}</p>
                ))}
              </div>
              <dl className={styles.enBref}>
                <div>
                  <dt>{t("Qui emprunte, qui est surveillé")}</dt>
                  <dd>{f.qui}</dd>
                </div>
                <div>
                  <dt>{t("Ce que vous percevez")}</dt>
                  <dd>{f.touchez}</dd>
                </div>
                <div>
                  <dt>{t("Le risque")}</dt>
                  <dd className={styles.risque}>{f.risque}</dd>
                </div>
              </dl>
            </div>
          </section>
        ))}
      </div>

      <section className="panel">
        <div className="panel-h">
          <h2>{t("Les quatre, côte à côte")}</h2>
          <span className="muted">{t("aucun n'est meilleur que l'autre : ils ne répondent pas à la même question")}</span>
        </div>
        <div className={styles.tableBoite}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col"></th>
                <th scope="col">{t("Emprunts d'État")}</th>
                <th scope="col">{t("Obligations")}</th>
                <th scope="col">{t("Actions")}</th>
                <th scope="col">{t("Fonds agréés")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{t("Ce que vous percevez")}</th>
                <td>{t("Un intérêt convenu d'avance")}</td>
                <td>{t("Un coupon convenu d'avance")}</td>
                <td>{t("Un dividende, s'il est voté")}</td>
                <td>{t("La valeur de la part au rachat")}</td>
              </tr>
              <tr>
                <th scope="row">{t("Quand vous récupérez")}</th>
                <td>{t("À l'échéance annoncée")}</td>
                <td>{t("À l'échéance, ou par tranches")}</td>
                <td>{t("Quand vous vendez")}</td>
                <td>{t("Quand vous demandez le rachat")}</td>
              </tr>
              <tr>
                <th scope="row">{t("Le capital est-il promis")}</th>
                <td>{t("Oui, par l'émetteur")}</td>
                <td>{t("Oui, par l'émetteur")}</td>
                <td className={styles.non}>{t("Non")}</td>
                <td className={styles.non}>{t("Non")}</td>
              </tr>
              <tr>
                <th scope="row">{t("Qui choisit les lignes")}</th>
                <td>{t("Vous")}</td>
                <td>{t("Vous")}</td>
                <td>{t("Vous")}</td>
                <td>{t("Le gérant du fonds")}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className={styles.note}>
          {t("« Le capital est promis par l'émetteur » signifie qu'il s'y engage, non qu'un tiers le garantit.")}
        </p>
      </section>

      {/* L'ÉPARGNE RÉGULIÈRE : le cinquième emploi, qui automatise les quatre
          autres plutôt que de s'y ajouter. */}
      <section className={styles.epargne}>
        <div>
          <h2>{t("Et le cinquième : l'épargne régulière.")}</h2>
          <p>{t("Vous arrêtez un montant et un jour du mois ; le prélèvement s'exécute de lui-même. Vous désignez d'avance où va cette somme, et où repart ce qui vous est remboursé. Vous pouvez modifier ou arrêter à tout moment, et ce qui a déjà été placé reste à vous.")}</p>
        </div>
        <Link className="btn primary" href="/connexion?creer=1">
          {t("Créer mon compte")}
        </Link>
      </section>

      <section className="panel">
        <div className="panel-h">
          <h2>{t("Commencer tient en trois temps")}</h2>
          <span className="muted">{t("le premier prend une minute et ne demande aucun document")}</span>
        </div>
        <ol className={styles.temps}>
          {temps.map((x) => (
            <li key={x.n}>
              <span className={styles.chiffre}>{x.n}</span>
              <div>
                <b>{x.titre}</b>
                <p>{x.dit}</p>
                <ul>
                  {x.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <small>{x.cout}</small>
              </div>
            </li>
          ))}
        </ol>
        <p className={styles.note}>
          {t("Tant que votre dossier n'est pas approuvé et la convention signée, aucun versement ni aucun ordre n'est possible. Votre écran vous dit alors exactement ce qui manque.")}
        </p>
      </section>

      <section className="panel">
        <div className="panel-h">
          <h2>{t("La vie d'un placement")}</h2>
          <span className="muted">{t("chaque étape porte sa date et sa pièce")}</span>
        </div>
        <ol className={styles.vie}>
          {vie.map((v) => (
            <li key={v.quand}>
              <b>{v.quand}</b>
              <p>{v.dit}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.deux}>
        <section className="panel">
          <div className="panel-h">
            <h2>{t("Qui décide quoi")}</h2>
          </div>
          <dl className={styles.reglages}>
            <div>
              <dt>{t("Vous décidez")}</dt>
              <dd>{t("Où placer, combien, et quand. Aucun ordre ne part sans vous, et personne d'autre que vous ne peut en donner.")}</dd>
            </div>
            <div>
              <dt>{t("Le conseiller éclaire")}</dt>
              <dd>{t("Il explique une ligne, vérifie qu'elle convient à votre situation, et vous dit ce qu'il en pense si vous le lui demandez.")}</dd>
            </div>
            <div>
              <dt>{t("Le bureau exécute et conserve")}</dt>
              <dd>{t("Il porte votre ordre sur le marché, tient vos titres, encaisse ce qui vous revient, et vous en rend compte.")}</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Ce que coûte le service")}</h2>
          </div>
          <dl className={styles.reglages}>
            <div>
              <dt>{t("Créer son compte")}</dt>
              <dd>{t("Gratuit, et sans engagement.")}</dd>
            </div>
            <div>
              <dt>{t("Passer un ordre")}</dt>
              <dd>{t("Une commission, connue avant que vous ne validiez, et rappelée sur votre avis d'opéré.")}</dd>
            </div>
            <div>
              <dt>{t("Conserver vos titres")}</dt>
              <dd>{t("Des droits de garde, selon un barème publié.")}</dd>
            </div>
            <div>
              <dt>{t("Aucun frais caché")}</dt>
              <dd>{t("Ce qui vous est prélevé figure au journal de votre compte, avec sa date et son motif.")}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className={styles.final}>
        <div>
          <h2>{t("Créez votre compte pour voir les lignes et leurs prix.")}</h2>
          <p>{t("Une minute, aucun document, et vous déciderez ensuite.")}</p>
        </div>
        <div className={styles.boutons}>
          <Link className="btn primary" href="/connexion?creer=1">
            {t("Créer mon compte")}
          </Link>
          <Link className="btn" href="/info/aide">
            {t("Poser une question")}
          </Link>
        </div>
      </section>

      <p className={styles.avertissement}>
        {t("Tout placement comporte un risque de perte en capital. Les performances passées ne préjugent pas des performances futures. Les conditions de chaque placement vous sont remises avant toute décision.")}{" "}
        <Link href="/info/risques">{t("Ce qu'il faut savoir sur les risques")}</Link>
      </p>
    </div>
  );
}
