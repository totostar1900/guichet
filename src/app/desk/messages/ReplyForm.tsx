"use client";

import { useActionState, useId, useState, useSyncExternalStore } from "react";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
import { Select } from "@/components/ui/Select";
import { useT } from "@/i18n/client";
import { replyAction } from "./actions";
import { garderBrouillon, lireBrouillon, oublierBrouillon, VIDE, type Brouillon } from "./brouillon";
import { fenetreWhatsApp } from "./fenetre";
import { blocLigne, citation, signature, type Ligne } from "./message-exact";
import type { ModeleDuFil } from "./modeles";
import { refusDePiece, taillePiece } from "./piece-jointe";
import styles from "./page.module.css";

export type DernierRecu = { at: string; text: string };

/** Ce que l'action rend, et `null` tant que rien n'a été tenté. */
type Etat = Awaited<ReturnType<typeof replyAction>> | null;

/** Le pas de l'horloge : la fenêtre se compte en heures, trente secondes suffisent. */
const PAS_MS = 30_000;

/**
 * L'heure, souscrite plutôt que lue au rendu.
 *
 * `Date.now()` dans un rendu est impur, et la règle a raison : deux rendus
 * donneraient deux résultats, et React en rejoue à sa guise. Ici l'heure est une
 * source extérieure à laquelle on s'abonne, donc le compte à rebours de la
 * fenêtre WhatsApp descend tout seul au lieu de figer au chargement.
 *
 * L'instantané est arrondi au pas : sans cela il changerait à chaque appel et
 * React rendrait sans fin. Côté serveur il vaut zéro, ce qui dit « pas encore
 * monté » et évite deux textes différents entre les deux rendus.
 */
function useMaintenant(): number {
  return useSyncExternalStore(
    (dire) => {
      const id = setInterval(dire, PAS_MS);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / PAS_MS) * PAS_MS,
    () => 0,
  );
}

/**
 * Répondre à un client, avec une relecture avant que le message parte.
 *
 * POURQUOI UNE RELECTURE ET NON UNE QUESTION. Le formulaire envoyait au premier
 * clic, et un message parti ne se rattrape pas : il est chez le client, dans sa
 * boîte, avec le nom de la maison dessus. Mais « êtes-vous sûr » n'attrape rien,
 * parce qu'il entre dans le rythme du clic en une semaine. La feuille montre
 * donc LE MESSAGE EXACT, et non un résumé : une faute de frappe ou un paragraphe
 * collé deux fois se voient là, et nulle part ailleurs.
 *
 * EXACT VEUT DIRE EXACT. Le résumé laissait dehors trois morceaux que le client
 * reçoit pourtant : le bloc de la fiche (son titre ET son adresse), la
 * signature, et l'enveloppe, qui est la première chose lue dans une boîte aux
 * lettres. Ils sont tous là, construits par le même `texteExact()` que le
 * serveur appelle pour envoyer : l'aperçu ne peut pas diverger de l'envoi.
 *
 * LES QUATRE TEINTES, lecture C arrêtée le 2 octobre 2026. Chaque partie porte
 * la sienne : l'enveloppe, ce que l'opérateur a écrit, ce que le serveur ajoute,
 * la signature. L'oeil voit d'un coup ce qui vient de lui et ce qui vient de la
 * machine, et c'est ce qu'une relecture doit trancher.
 *
 * LE TEXTE DU MESSAGE NE PASSE JAMAIS PAR t(). Il s'adresse au client, et le
 * serveur l'écrit en français quelle que soit la langue de l'écran du desk.
 *
 * TROIS GESTES REPRIS DES MESSAGERIES : citer le message reçu, voir la fenêtre
 * de 24 h de WhatsApp, et garder le brouillon d'un fil à l'autre. Chacun est
 * commenté à l'endroit où il se pose.
 */
export function ReplyForm({
  to,
  channel,
  name,
  lines = [],
  deskName,
  appUrl,
  from,
  dernierRecu,
  modeles,
  convKey,
}: {
  to: string;
  channel: "whatsapp" | "email";
  name?: string;
  lines?: { id: string; title: string }[];
  /** Qui signe : le serveur met ce nom au bas du message. */
  deskName: string;
  /** La racine des liens de fiche, telle que le serveur la lira. */
  appUrl: string;
  /** L'adresse d'expédition, telle que le client la verra. */
  from: string;
  /** Le dernier message venu du client : il ouvre la fenêtre, et il se cite. */
  dernierRecu?: DernierRecu;
  /** Les modèles du Référentiel, déjà remplis avec l'ordre de ce contact. */
  modeles?: ModeleDuFil[];
  /**
   * L'échange dans lequel on écrit : il part avec le message, et le serveur
   * l'inscrit sur la réponse. Il entre aussi dans la clef du brouillon, parce
   * qu'un correspondant a plusieurs affaires et qu'un brouillon rangé par
   * adresse ferait répondre à l'une avec le texte de l'autre.
   */
  convKey: string;
}) {
  /* L'ACTION EST ENVELOPPÉE POUR OUBLIER LE BROUILLON.
     Il faut l'effacer après un envoi réussi, sinon le remontage le restaure et
     le message suivant repart avec le précédent. Un effet le ferait, mais la
     maison interdit setState dans un effet et cette enveloppe n'en est pas un :
     c'est la suite d'un geste, au moment où l'on sait que le message est parti. */
  const [state, action, pending] = useActionState(async (prev: Etat, form: FormData) => {
    const r = await replyAction(prev, form);
    if (r.ok) oublierBrouillon(channel, convKey);
    return r;
  }, null);
  const formId = useId();
  /* LE BROUILLON SE LIT APRÈS LE MONTAGE, JAMAIS AVANT.
     localStorage n'existe pas au rendu serveur : l'initialiser paresseusement
     au premier rendu client donnerait deux arbres différents et React se
     plaindrait. Ce drapeau passe à vrai une fois monté, la clef change, le
     composant remonte, et c'est là que l'initialiseur lit le stockage. */
  const monte = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return (
    <form id={formId} action={action} className={styles.reply}>
      <input type="hidden" name="to" value={to} />
      <input type="hidden" name="channel" value={channel} />
      <input type="hidden" name="convKey" value={convKey} />
      {name && <input type="hidden" name="name" value={name} />}
      {/* LE REMONTAGE VIDE LE FORMULAIRE, ET C'EST VOLONTAIRE.
          Sans cela le message suivant partirait avec le texte du précédent,
          c'est-à-dire exactement l'erreur que la relecture cherche à éviter.
          La clef change à chaque envoi réussi, et aussi quand on passe d'un fil
          à l'autre. Un effet qui remettrait les champs à zéro ferait la même
          chose, mais la maison interdit d'appeler setState dans un effet, et
          elle a raison : une remise à zéro qui se déclenche toute seule finit
          par se déclencher au mauvais moment. */}
      <Champs
        key={`${convKey}:${state?.at ?? ""}:${monte}`}
        to={to}
        name={name}
        channel={channel}
        lines={lines}
        deskName={deskName}
        appUrl={appUrl}
        from={from}
        dernierRecu={dernierRecu}
        modeles={modeles ?? []}
        convKey={convKey}
        monte={monte}
        formId={formId}
        pending={pending}
        erreur={state && !state.ok ? state.error : undefined}
      />
    </form>
  );
}

function Champs({
  to,
  name,
  channel,
  lines,
  deskName,
  appUrl,
  from,
  dernierRecu,
  modeles,
  convKey,
  monte,
  formId,
  pending,
  erreur,
}: {
  to: string;
  name?: string;
  channel: "whatsapp" | "email";
  lines: { id: string; title: string }[];
  deskName: string;
  appUrl: string;
  from: string;
  dernierRecu?: DernierRecu;
  modeles: ModeleDuFil[];
  convKey: string;
  monte: boolean;
  formId: string;
  pending: boolean;
  erreur?: string;
}) {
  const t = useT();
  const maintenant = useMaintenant();
  /* Le brouillon du fil, lu UNE SEULE FOIS, au montage de ce composant.
     L'initialiseur est paresseux : écrit autrement, le stockage serait relu à
     chaque frappe pour un résultat aussitôt jeté. */
  const [garde] = useState<Brouillon>(() => (monte ? lireBrouillon(channel, convKey) : VIDE));
  const [subject, setSubject] = useState(garde.subject);
  const [body, setBody] = useState(garde.body);
  const [offerId, setOfferId] = useState(garde.offerId);
  const [garde0, setGarde0] = useState(Boolean(garde.body || garde.subject));
  /* La pièce n'entre pas dans le brouillon : un navigateur ne laisse pas
     repeupler un champ de fichier, et garder un chemin qui ne se rouvre pas
     serait une promesse en l'air. Elle se rechoisit, et l'aperçu la nomme. */
  const [piece, setPiece] = useState<{ nom: string; octets: number } | null>(null);
  const [refusPiece, setRefusPiece] = useState<string | undefined>(undefined);
  /* Ce qui vient d'être effacé, gardé le temps qu'on puisse le reposer. */
  const [efface, setEfface] = useState<Brouillon | null>(null);

  const parMail = channel === "email";
  /* UN {champ} NON REMPLI NE PART PAS. Les modèles qui demandent quelque chose
     laissent {precision} en place : elle appartient à l'opérateur, et partie
     telle quelle l'accolade arrive chez le client. */
  const trou = body.match(/\{[a-z_]+\}/)?.[0];
  const manque = !body.trim() || (parMail && !subject.trim()) || Boolean(trou) || Boolean(refusPiece);
  const choisie = lines.find((l) => l.id === offerId);

  /* Chaque frappe garde le fil en cours. L'écriture se fait dans le geste, pas
     dans un effet : elle suit la frappe au lieu de la poursuivre. */
  const noter = (champ: Partial<Brouillon>) => {
    const neuf = { subject, body, offerId, ...champ };
    garderBrouillon(channel, convKey, neuf);
    setGarde0(Boolean(neuf.body || neuf.subject));
    /* Retaper referme le ruban : le brouillon effacé n'est plus celui qu'on
       croit, et le reposer écraserait ce qu'on vient d'écrire. */
    setEfface(null);
  };

  /* EFFACER N'EST PAS PERDRE. « Êtes-vous sûr » devant un geste fréquent entre
     dans le rythme du clic en une semaine ; effacer tout de suite et laisser
     revenir protège vraiment. Le ruban n'a pas de minuterie : un ruban qui
     disparaît tout seul emporte le texte avec lui. */
  const effacer = () => {
    setEfface({ subject, body, offerId });
    setSubject("");
    setBody("");
    setOfferId("");
    setGarde0(false);
    oublierBrouillon(channel, convKey);
  };

  const reposer = () => {
    if (!efface) return;
    setSubject(efface.subject);
    setBody(efface.body);
    setOfferId(efface.offerId);
    setGarde0(Boolean(efface.body || efface.subject));
    garderBrouillon(channel, convKey, efface);
    setEfface(null);
  };

  /* L'adresse de la fiche, telle que le serveur la composera. Sur WhatsApp elle
     porte en plus une marque signée à l'envoi : elle ne peut pas s'afficher
     d'avance, elle est annoncée comme telle plutôt qu'inventée. Un aperçu qui
     invente est pire qu'un aperçu qui avoue. */
  const ligne: Ligne | undefined = choisie ? { titre: choisie.title, url: `${appUrl}/offres/${choisie.id}${parMail ? "" : "?de="}` } : undefined;
  const ajoute = blocLigne({ ligne, canal: channel }).replace(/^\n+/, "");

  /* LA FENÊTRE DE 24 H, DITE PLUTÔT QUE SOUS-ENTENDUE. Elle ne se calcule
     qu'une fois monté : l'heure du navigateur et celle du serveur diffèrent, et
     un compte à rebours rendu des deux côtés donnerait deux textes. */
  const fenetre = maintenant > 0 && !parMail ? fenetreWhatsApp(dernierRecu?.at, maintenant) : null;

  /* « Citer » ajoute le message reçu à la suite, en français : il part chez le
     client. L'opérateur peut ensuite le couper, c'est du texte comme le reste. */
  const citer = () => {
    if (!dernierRecu) return;
    const quand = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date(dernierRecu.at));
    const neuf = `${body.trimEnd()}${body.trim() ? "\n\n" : ""}${citation(quand, dernierRecu.text)}`;
    setBody(neuf);
    noter({ body: neuf });
  };

  /* Un modèle s'AJOUTE au lieu de remplacer : remplacer effacerait ce qui vient
     d'être tapé, et personne ne s'y attend quand on cherchait la bonne formule. */
  const poserModele = (key: string) => {
    const m = modeles.find((x) => x.key === key);
    if (!m) return;
    const neuf = `${body.trimEnd()}${body.trim() ? "\n\n" : ""}${m.texte}`;
    setBody(neuf);
    noter({ body: neuf });
  };

  const choisirPiece = (f: File | null) => {
    setPiece(f ? { nom: f.name, octets: f.size } : null);
    setRefusPiece(f ? refusDePiece(f.name, f.size) : undefined);
  };

  const relecture = [
    // « À : {qui} » serait une clef à trou de trois lettres, qui ne porte aucun
    // sens pour qui traduit. Le mot se traduit seul, la ponctuation est du texte.
    `${t("Destinataire")} : ${name ? `${name} · ${to}` : to}`,
    parMail ? t("Objet : {o}", { o: subject.trim() }) : t("Par WhatsApp, sans objet"),
  ];

  const enveloppe = (
    <div className={styles.relire}>
      <div className={styles.relireEnt}>
        <span>{parMail ? t("Expéditeur") : t("Canal")}</span>
        <b>{parMail ? from || t("adresse d'envoi à renseigner") : t("WhatsApp")}</b>
        <span>{t("Destinataire")}</span>
        <b>{name ? `${name} · ${to}` : to}</b>
        {parMail && (
          <>
            <span>{t("Objet")}</span>
            <b className={styles.relireObjet}>{subject.trim()}</b>
          </>
        )}
      </div>
      {/* Le texte du message reste littéral : ni t(), ni reformulation. */}
      <p className={styles.relireVotre}>{body.trim()}</p>
      {ajoute && <p className={styles.relireAjoute}>{ajoute}</p>}
      <p className={styles.relireSignature}>{signature(deskName)}</p>
      {piece && !refusPiece && <p className={styles.relirePiece}>{t("Pièce jointe : {n} · {t}", { n: piece.nom, t: taillePiece(piece.octets) })}</p>}
      <p className={styles.relirePied}>
        {t("Rien ne s'ajoute autour : le message part avec ce texte seul.")}
        {!parMail && choisie ? ` ${t("Le lien emportera en plus une marque qui reconnaît ce numéro.")}` : ""}
      </p>
    </div>
  );

  return (
    <>
      {fenetre && (
        <div className={fenetre.ouverte ? styles.fenetreOuverte : styles.fenetreFermee}>
          {fenetre.ouverte
            ? fenetre.heures > 0
              ? t("Fenêtre WhatsApp ouverte, elle se ferme dans {h} h {m}.", { h: String(fenetre.heures), m: String(fenetre.minutes).padStart(2, "0") })
              : t("Fenêtre WhatsApp ouverte, elle se ferme dans {m} minutes.", { m: String(fenetre.minutes) })
            : t("La fenêtre de 24 h est passée : WhatsApp accepte un modèle approuvé, et un e-mail passe toujours.")}
        </div>
      )}
      {parMail && (
        <input
          name="subject"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            noter({ subject: e.target.value });
          }}
          placeholder={t("Objet")}
          className={styles.subject}
          required
          maxLength={160}
        />
      )}
      <textarea
        name="body"
        rows={3}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          noter({ body: e.target.value });
        }}
        placeholder={channel === "whatsapp" ? "Répondre sur WhatsApp" : "Répondre par e-mail"}
        required
      />
      {lines.length > 0 && (
        <label className={styles.withLine}>
          <span>{t("Répondre avec la ligne")}</span>
          <Select
            block
            name="offerId"
            value={offerId}
            onChange={(v) => {
              setOfferId(v);
              noter({ offerId: v });
            }}
            options={[{ value: "", label: t("aucune") }, ...lines.map((l) => ({ value: l.id, label: l.title }))]}
          />
          <small className="muted">{t(channel === "whatsapp" ? "La fiche, et un lien qui reconnaît ce numéro : l'intention ne demandera que le code e-mail." : "La fiche de la ligne, en lien.")}</small>
        </label>
      )}
      <div className={styles.outils}>
        {modeles.length > 0 && <Select name="modele" value="" onChange={poserModele} options={[{ value: "", label: t("Modèle") }, ...modeles.map((m) => ({ value: m.key, label: m.label }))]} />}
        {dernierRecu && (
          <button type="button" className="btn sm ghost" onClick={citer}>
            {t("Citer")}
          </button>
        )}
        {parMail && (
          <label className={styles.joindre}>
            <span className="btn sm ghost">{piece ? `${piece.nom} · ${taillePiece(piece.octets)}` : t("Joindre")}</span>
            <input type="file" name="piece" onChange={(e) => choisirPiece(e.target.files?.[0] ?? null)} />
          </label>
        )}
        <span className={styles.outilsVide} />
        {garde0 && <small className="muted">{t("brouillon gardé")}</small>}
        {(body.trim() || subject.trim() || offerId) && (
          <button type="button" className="btn sm ghost" onClick={effacer}>
            {t("Effacer le brouillon")}
          </button>
        )}
      </div>
      {efface && (
        <div className={styles.ruban}>
          <span>{t("Brouillon effacé.")}</span>
          <button type="button" className="btn sm" onClick={reposer}>
            {t("Rétablir")}
          </button>
        </div>
      )}
      <div className={styles.replyRow}>
        {erreur && <span className={styles.err}>{erreur}</span>}
        {refusPiece && <span className={styles.err}>{refusPiece}</span>}
        {!refusPiece && trou && <small className="muted">{t("Remplacez {c} avant d'envoyer.", { c: trou })}</small>}
        {!refusPiece && !trou && manque && <small className="muted">{t(parMail ? "Un objet et un message sont nécessaires." : "Un message est nécessaire.")}</small>}
        <ConfirmPublish
          form={formId}
          label={parMail ? t("Envoyer l'e-mail") : t("Envoyer sur WhatsApp")}
          title={t("Relire avant d'envoyer")}
          lines={relecture}
          corps={enveloppe}
          confirmLabel={parMail ? t("Envoyer l'e-mail") : t("Envoyer sur WhatsApp")}
          disabled={manque}
          pending={pending}
        />
      </div>
    </>
  );
}
