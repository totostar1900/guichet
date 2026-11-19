"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { platformAuthenticatorIsAvailable, startRegistration } from "@simplewebauthn/browser";
import { useDates, useT } from "@/i18n/client";
import { deviceLabel, newDeviceToken, readDevice, saveDevice } from "@/lib/device-client";
import { acceptTerms } from "@/app/moi/actions";
import { checkPhoneProof, sendPhoneProof } from "@/app/offres/[id]/actions";
import { beginPasskey, enrolPin, finishPasskey } from "@/app/moi/securite/actions";
import { creerEnvoyerCodeEmail, creerVerifierCodeEmail } from "./actions";
import styles from "./creer.module.css";

export type EtapeDeDepart = "email" | "telephone" | "avant" | "appareil";
type Etape = "email" | "email-code" | "telephone" | "telephone-code" | "avant" | "code" | "code-bis" | "bio" | "bio-fait";

/** Combien de secondes avant de pouvoir demander un nouveau code. */
const ATTENTE = 60;

/**
 * LA CRÉATION D'UN COMPTE, UN ÉCRAN PAR GESTE (19 novembre 2026, planche « Parcours d'inscription », 1A à 7B).
 *
 * L'adresse puis son code, le numéro puis son code, « Avant d'entrer » (les mentions, en trois lignes, une case), un code à quatre chiffres pour cet appareil, puis la biométrie si l'appareil la sait. Le bouton de validation est TOUJOURS en bas de l'écran, au pouce ; une erreur s'écrit sous le champ, jamais dans une fenêtre ; aucune porte Google (le client veut les informations réelles, pas celles d'un profil).
 *
 * Chaque preuve passe par l'action qui existait déjà : rien n'est écrit deux fois.
 */
export function CreerCompte({ depart, adresse, next, demo, legalVersion }: { depart: EtapeDeDepart; adresse: string; next: string; demo?: string; legalVersion: string }) {
  const t = useT();
  const { fmtDate } = useDates();
  const router = useRouter();
  const [etape, setEtape] = useState<Etape>(depart === "appareil" ? "code" : depart);
  const [email, setEmail] = useState(adresse);
  const [telephone, setTelephone] = useState("+237 ");
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [montre, setMontre] = useState<string | undefined>(undefined);
  const [lu, setLu] = useState(false);
  const [attente, setAttente] = useState(0);
  const [canal, setCanal] = useState<"whatsapp" | "sms">("whatsapp");
  const [enCours, start] = useTransition();
  const [codeA, setCodeA] = useState("");
  const [peutBio, setPeutBio] = useState(false);

  useEffect(() => {
    platformAuthenticatorIsAvailable().then(setPeutBio, () => setPeutBio(false));
  }, []);
  /* Un appareil déjà reconnu n'a pas besoin qu'on lui repose la question. */
  useEffect(() => {
    if (depart === "appareil" && readDevice()) router.replace(next);
  }, [depart, next, router]);
  useEffect(() => {
    if (attente <= 0) return;
    const id = setTimeout(() => setAttente((a) => a - 1), 1000);
    return () => clearTimeout(id);
  }, [attente]);

  const vers = useCallback((e: Etape) => {
    setErreur(null);
    setCode("");
    setEtape(e);
  }, []);
  const fin = useCallback(() => {
    router.replace(next);
    router.refresh();
  }, [next, router]);

  const envoyerEmail = () =>
    start(async () => {
      const r = await creerEnvoyerCodeEmail(email, next);
      if (!r.ok) return setErreur(r.error);
      setMontre(r.demo);
      setAttente(ATTENTE);
      vers("email-code");
    });
  const verifierEmail = () =>
    start(async () => {
      const r = await creerVerifierCodeEmail(email, code);
      if (!r.ok) return setErreur(r.error);
      router.refresh();
      vers("telephone");
    });
  const envoyerTelephone = () =>
    start(async () => {
      const r = await sendPhoneProof(telephone);
      if (!r.ok) {
        /* Aucun fournisseur d'envoi : on ne bloque pas la personne, le desk confirmera le numéro. */
        if ("unavailable" in r && r.unavailable) return vers("avant");
        return setErreur(r.error);
      }
      if ("channel" in r && r.channel) setCanal(r.channel === "sms" ? "sms" : "whatsapp");
      setMontre("demoCode" in r ? r.demoCode : undefined);
      setAttente(ATTENTE);
      vers("telephone-code");
    });
  const verifierTelephone = () =>
    start(async () => {
      const r = await checkPhoneProof(telephone, code);
      if (!r.ok) return setErreur(r.error);
      vers("avant");
    });
  const accepter = () =>
    start(async () => {
      const r = await acceptTerms(legalVersion);
      if (!r.ok) return setErreur(r.error);
      vers("code");
    });

  const fixerCode = (c: string) => {
    if (etape === "code") {
      setCodeA(c);
      setCode("");
      vers("code-bis");
      return;
    }
    if (c !== codeA) {
      setCodeA("");
      setCode("");
      setEtape("code");
      setErreur("Les deux codes ne sont pas identiques. Recommencez.");
      return;
    }
    start(async () => {
      const token = newDeviceToken();
      const r = await enrolPin(token, c, deviceLabel());
      if (!r.ok) {
        setCodeA("");
        setCode("");
        setEtape("code");
        setErreur(r.error);
        return;
      }
      saveDevice({ id: r.device.id, kind: "pin", token, who: email, name: r.device.name, since: r.device.createdAt });
      if (peutBio) vers("bio");
      else fin();
    });
  };
  const activerBio = () =>
    start(async () => {
      try {
        const options = await beginPasskey();
        const reponse = await startRegistration({ optionsJSON: options });
        const r = await finishPasskey(reponse, deviceLabel());
        if (!r.ok) return setErreur(r.error);
        saveDevice({ id: r.device.id, kind: "passkey", who: email, name: r.device.name, since: r.device.createdAt });
        vers("bio-fait");
      } catch (e) {
        const nom = (e as Error).name;
        setErreur(nom === "NotAllowedError" ? "Annulé. Vous pourrez l'activer plus tard, dans Mon compte, Sécurité." : nom === "InvalidStateError" ? "Cet appareil est déjà enregistré." : `Impossible : ${(e as Error).message}`);
      }
    });

  const decompte = attente > 0 ? `${Math.floor(attente / 60)}:${String(attente % 60).padStart(2, "0")}` : null;
  const champErreur = erreur ? <p className={styles.erreur} role="alert">{t(erreur)}</p> : null;
  const demoLigne = montre ? <p className={styles.demo}>{t("Serveur de démonstration, code :")} <b>{montre}</b></p> : demo && etape === "email" ? <p className={styles.demo}>{t("Serveur de démonstration : le code sera {code}.", { code: demo })}</p> : null;

  return (
    <div className={styles.ecran} data-etape={etape}>
      {etape === "email" && (
        <form className={styles.corps} onSubmit={(e) => { e.preventDefault(); envoyerEmail(); }}>
          <header className={styles.tete}>
            <h1 className="display">{t("Créer votre compte")}</h1>
            <p>{t("Un code, une minute, et vous voyez le marché. Aucun document n'est demandé à ce stade, et créer un compte ne vous engage à rien.")}</p>
          </header>
          <label className={styles.champ}>
            {t("Adresse e-mail")}
            <input type="email" autoComplete="email" inputMode="email" placeholder={t("vous@exemple.com")} value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
          </label>
          {champErreur}
          {demoLigne}
          <div className={styles.bas}>
            <button className={styles.valider} type="submit" disabled={enCours || !email}>{t(enCours ? "Envoi…" : "Recevoir un code")}</button>
            <p className={styles.pied}>{t("Déjà un compte ?")} <Link href={`/connexion?next=${encodeURIComponent(next)}`}>{t("Se connecter")}</Link></p>
          </div>
        </form>
      )}

      {(etape === "email-code" || etape === "telephone-code") && (
        <form className={styles.corps} onSubmit={(e) => { e.preventDefault(); if (etape === "email-code") verifierEmail(); else verifierTelephone(); }}>
          <header className={styles.tete}>
            <h1 className="display">{t(etape === "email-code" ? "Code reçu par e-mail" : canal === "sms" ? "Code reçu par SMS" : "Code reçu sur WhatsApp")}</h1>
            <p>{t("Envoyé à")} <b>{etape === "email-code" ? email : telephone.trim()}</b></p>
          </header>
          <label className={styles.champ}>
            {t("Code à six chiffres")}
            <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={8} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))} autoFocus required />
          </label>
          {champErreur}
          {demoLigne}
          <p className={styles.aide}>
            {decompte ? <>{t("Renvoyer le code dans")} <b>{decompte}</b></> : <button type="button" className={styles.lien} onClick={etape === "email-code" ? envoyerEmail : envoyerTelephone} disabled={enCours}>{t("Renvoyer le code")}</button>}
            {" · "}
            <button type="button" className={styles.lien} onClick={() => vers(etape === "email-code" ? "email" : "telephone")}>{t(etape === "email-code" ? "Changer d'adresse" : "Ce n'est pas votre numéro ? Le changer")}</button>
          </p>
          <div className={styles.bas}>
            <button className={styles.valider} type="submit" disabled={enCours || code.replace(/\s/g, "").length < 6}>{t(enCours ? "Vérification…" : "Continuer")}</button>
          </div>
        </form>
      )}

      {etape === "telephone" && (
        <form className={styles.corps} onSubmit={(e) => { e.preventDefault(); envoyerTelephone(); }}>
          <header className={styles.tete}>
            <h1 className="display">{t("Votre numéro")}</h1>
            <p>{t("Votre adresse est prouvée. Il reste votre numéro : un code arrive par message sur ce téléphone, une seule fois.")}</p>
          </header>
          <label className={styles.champ}>
            {t("Numéro de téléphone")}
            <input type="tel" inputMode="tel" autoComplete="tel" placeholder="+237 6 87 67 67 67" value={telephone} onChange={(e) => setTelephone(e.target.value)} autoFocus required />
          </label>
          {champErreur}
          <div className={styles.bas}>
            <button className={styles.valider} type="submit" disabled={enCours || telephone.replace(/\D/g, "").length < 8}>{t(enCours ? "Envoi…" : "Recevoir le code")}</button>
          </div>
        </form>
      )}

      {etape === "avant" && (
        <form className={styles.corps} onSubmit={(e) => { e.preventDefault(); accepter(); }}>
          <header className={styles.tete}>
            <h1 className="display">{t("Avant d'entrer")}</h1>
            <p>{t("Trois choses à savoir. Vous lisez tout, quand vous voulez.")}</p>
          </header>
          <ol className={styles.trois}>
            <li><b>{t("Qui nous sommes")}</b><span>{t("Purpose Capital S.A., société de bourse agréée par la COSUMAF.")}</span></li>
            <li><b>{t("Ce que vous risquez")}</b><span>{t("Un placement peut perdre de la valeur, y compris tout son capital.")}</span></li>
            <li><b>{t("Vos données")}</b><span>{t("Elles ne sont ni vendues ni cédées, et vous les consultez sur demande.")}</span></li>
          </ol>
          <p className={styles.aide}><Link href="/info/textes" target="_blank">{t("Lire les textes complets")}</Link></p>
          <label className={styles.case}>
            <input type="checkbox" checked={lu} onChange={(e) => setLu(e.target.checked)} />
            <span>{t("J'ai lu et j'accepte les mentions et responsabilités (version du {date}).", { date: fmtDate(legalVersion) })}</span>
          </label>
          {champErreur}
          <div className={styles.bas}>
            <button className={styles.valider} type="submit" disabled={enCours || !lu}>{t(enCours ? "Un instant…" : "Continuer")}</button>
          </div>
        </form>
      )}

      {(etape === "code" || etape === "code-bis") && <Clavier titre={t(etape === "code" ? "Protégez votre compte" : "Saisissez-le encore")} phrase={t(etape === "code" ? "Un code à quatre chiffres protège l'accès à votre compte sur cet appareil." : "Pour éviter toute faute de frappe.")} erreur={champErreur} onFini={fixerCode} onPlusTard={() => (peutBio ? vers("bio") : fin())} occupe={enCours} cle={etape} />}

      {etape === "bio" && (
        <div className={styles.corps}>
          <header className={`${styles.tete} ${styles.centre}`}>
            <Empreinte />
            <h1 className="display">{t("La connexion biométrique est disponible")}</h1>
            <p>{t("Connectez-vous à Guichet avec Face ID, votre empreinte ou le code de l'appareil.")}</p>
          </header>
          {champErreur}
          <div className={styles.bas}>
            <button className={styles.valider} type="button" disabled={enCours} onClick={activerBio}>{t(enCours ? "Un instant…" : "Activer la connexion biométrique")}</button>
            <button className={styles.secondaire} type="button" onClick={fin}>{t("Plus tard")}</button>
          </div>
        </div>
      )}

      {etape === "bio-fait" && (
        <div className={styles.corps}>
          <header className={`${styles.tete} ${styles.centre}`}>
            <Empreinte ok />
            <h1 className="display">{t("La connexion biométrique est activée")}</h1>
            <p>{t("Vous pouvez la désactiver à tout moment dans Mon compte, Sécurité.")}</p>
          </header>
          <div className={styles.bas}>
            <button className={styles.valider} type="button" onClick={fin}>{t("Continuer")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Empreinte({ ok }: { ok?: boolean }) {
  return (
    <svg className={ok ? styles.empreinteOk : styles.empreinte} viewBox="0 0 24 24" width="88" height="88" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M21.8 16c.2-2 .131-5.354 0-6" />
      <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
      <path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
    </svg>
  );
}

/** Quatre ronds et un clavier à chiffres : le code de l'appareil se tape au pouce, sans champ à viser. */
function Clavier({ titre, phrase, erreur, onFini, onPlusTard, occupe, cle }: { titre: string; phrase: string; erreur: React.ReactNode; onFini: (c: string) => void; onPlusTard: () => void; occupe: boolean; cle: string }) {
  const t = useT();
  const [saisi, setSaisi] = useState("");
  const dernier = useRef("");
  /* LA FONCTION CHANGE À CHAQUE RENDU DU PARENT : l'attendre dans les dépendances annulait la minuterie quand une erreur ou un état s'affichait entre-temps, et le code complet n'était jamais rendu. */
  const rendre = useRef(onFini);
  useEffect(() => {
    rendre.current = onFini;
  }, [onFini]);
  const ajouter = useCallback(
    (c: string) =>
      setSaisi((s) => {
        if (s.length >= 4) return s;
        return s + c;
      }),
    [],
  );
  /* Le code est complet : on le rend une fois, puis le clavier se vide pour le pas suivant. */
  useEffect(() => {
    if (saisi.length === 4 && dernier.current !== `${cle}${saisi}`) {
      dernier.current = `${cle}${saisi}`;
      const c = saisi;
      const id = setTimeout(() => {
        setSaisi("");
        rendre.current(c);
      }, 160);
      return () => clearTimeout(id);
    }
  }, [saisi, cle]);
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) ajouter(e.key);
      else if (e.key === "Backspace") setSaisi((s) => s.slice(0, -1));
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [ajouter]);
  return (
    <div className={styles.corps}>
      <header className={styles.tete}>
        <h1 className="display">{titre}</h1>
        <p>{phrase}</p>
      </header>
      <div className={styles.ronds} aria-label={t("{n} chiffres saisis sur 4", { n: saisi.length })}>
        {[0, 1, 2, 3].map((i) => <i key={i} data-plein={i < saisi.length ? "1" : "0"} />)}
      </div>
      {erreur}
      <div className={styles.clavier}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((c) => <button key={c} type="button" disabled={occupe} onClick={() => ajouter(c)}>{c}</button>)}
        <span />
        <button type="button" disabled={occupe} onClick={() => ajouter("0")}>0</button>
        <button type="button" aria-label={t("Effacer")} onClick={() => setSaisi((s) => s.slice(0, -1))}>⌫</button>
      </div>
      <div className={styles.bas}>
        <button className={styles.secondaire} type="button" onClick={onPlusTard}>{t("Plus tard")}</button>
      </div>
    </div>
  );
}
