"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";
import { EcranDeCode } from "@/components/EcranDeCode";
import { CLE_RECONNAISSANCE, codeDeCetAppareil, confianceVoulue, deviceLabel, effacerConfiance, enregistrerLeCode, marquerCodeOublie, newDeviceToken, readDevice } from "@/lib/device-client";
import { CLE_GRACE, CLE_VERROU, faudraitVerrouiller } from "@/lib/verrou";
import { logoutVersLaPorte } from "@/app/connexion/actions";
import { poserLeCode, verifierLeCode } from "@/app/verrou/actions";
import { enrolPin } from "@/app/moi/securite/actions";
import { useVerrouDeDefilement } from "@/components/mobile/verrou-defilement";
import styles from "./VerrouDeLApp.module.css";

/* Une fois par visite, tant que ce navigateur n'a pas de code : l'écran de code se pose de lui-même, et le code saisi enrôle l'appareil. */
const CLE_RECO = CLE_RECONNAISSANCE;
const aReconnaitreIci = (): boolean => {
  try {
    return typeof window !== "undefined" && !codeDeCetAppareil(readDevice()) && sessionStorage.getItem(CLE_RECO) !== "1";
  } catch {
    return false;
  }
};

const noop = () => () => {};
const lireNombre = (cle: string): number | undefined => {
  try {
    const v = Number(sessionStorage.getItem(cle));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  } catch {
    return undefined;
  }
};

/**
 * LE VERROU DE L'APPLICATION (19 novembre 2026, planche « Compte, connexion et textes », 2A prolongée).
 *
 * Un voile posé SUR la page, jamais une navigation : le formulaire à moitié rempli ou la signature en cours se retrouvent intacts après le déverrouillage. Deux seuils fixes (`lib/verrou.ts`) ; dès que l'application quitte l'écran, le voile est posé tout de suite (l'aperçu du sélecteur d'applications du téléphone ne montre ni solde ni titres), et levé au retour si l'absence a duré moins que le seuil.
 *
 * On le lève avec le CODE DU COMPTE, le même sur tout appareil (jamais avec Face ID ni le code d'écran du téléphone : voir `parLeCode`). Cinq codes faux : déconnexion. Un compte SANS code en reçoit un à poser avant tout : « tout compte doit avoir au moins un code ».
 *
 * CE N'EST PAS UNE BARRIÈRE DE SÉCURITÉ : la session reste valable côté serveur, et un autre onglet n'est pas verrouillé. Le verrou protège contre l'œil qui passe ; ce qui protège l'argent, c'est le code reçu qu'il faut pour signer un ordre.
 */
export function VerrouDeLApp({ aUnCode, prenom }: { aUnCode: boolean; /** le prénom du client, pour le mot de bienvenue */ prenom?: string }) {
  const t = useT();
  const chemin = usePathname();
  const surLaPorte = chemin.startsWith("/connexion");
  /* Un verrou posé avant un rechargement tient encore : recharger ne le contourne pas. L'état n'est lu que dans le navigateur, et rien ne se montre avant l'hydratation (`pret`). */
  const [verrouille, setVerrouille] = useState(() => {
    try {
      return typeof window !== "undefined" && sessionStorage.getItem(CLE_VERROU) === "1";
    } catch {
      return false;
    }
  });
  const [masque, setMasque] = useState(false);
  /* UN NAVIGATEUR SANS CODE SE FAIT RECONNAÎTRE DÈS L'OUVERTURE (21 novembre 2026, le client : « rien n'a changé »). Le verrou ne se pose qu'après cinq minutes d'inertie : attendre qu'il tombe pour enrôler l'appareil ne réparait rien, et une clé d'accès d'avant le 20 novembre comptait à tort pour un appareil reconnu. */
  const [aReconnaitre, setAReconnaitre] = useState(aReconnaitreIci);
  /* La propriété vient de la mise en page, qui ne se relit pas à chaque navigation : le code posé ici compte tout de suite, sans attendre qu'elle change. */
  const [codePose, setCodePose] = useState(false);
  const codeDefini = aUnCode || codePose;
  /* Une panne du serveur ne doit pas enfermer un client : « Continuer sans code pour l'instant » repousse la pose jusqu'au prochain chargement. */
  const [reporte, setReporte] = useState(false);
  const pret = useSyncExternalStore(noop, () => true, () => false);
  const activite = useRef(0);
  const quitte = useRef<number | undefined>(undefined);

  useEffect(() => {
    activite.current = Date.now();
  }, []);

  const poser = useCallback(() => {
    try {
      sessionStorage.setItem(CLE_VERROU, "1");
    } catch {
      // stockage refusé
    }
    setVerrouille(true);
  }, []);

  useEffect(() => {
    if (surLaPorte) return;
    const toucher = () => {
      activite.current = Date.now();
    };
    const evenements = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    evenements.forEach((e) => window.addEventListener(e, toucher, { passive: true, capture: true }));
    const quitter = () => {
      quitte.current = Date.now();
      setMasque(true);
    };
    const revenir = () => {
      const maintenant = Date.now();
      if (faudraitVerrouiller({ maintenant, quitteLe: quitte.current, derniereActivite: activite.current, graceJusqua: lireNombre(CLE_GRACE) })) poser();
      quitte.current = undefined;
      activite.current = maintenant;
      setMasque(false);
    };
    const visibilite = () => (document.visibilityState === "hidden" ? quitter() : revenir());
    const retour = (e: PageTransitionEvent) => {
      if (e.persisted) revenir();
    };
    document.addEventListener("visibilitychange", visibilite);
    window.addEventListener("pageshow", retour);
    const veille = window.setInterval(() => {
      if (document.visibilityState === "visible" && faudraitVerrouiller({ maintenant: Date.now(), derniereActivite: activite.current, graceJusqua: lireNombre(CLE_GRACE) })) poser();
    }, 5000);
    return () => {
      evenements.forEach((e) => window.removeEventListener(e, toucher, { capture: true }));
      document.removeEventListener("visibilitychange", visibilite);
      window.removeEventListener("pageshow", retour);
      window.clearInterval(veille);
    };
  }, [surLaPorte, poser]);

  const aPoser = !codeDefini && !reporte && !surLaPorte && pret;
  const reconnaitre = aReconnaitre && codeDefini && !reporte && !aPoser;
  const ouvert = (verrouille || aPoser || reconnaitre) && !surLaPorte;
  useVerrouDeDefilement(ouvert);

  if (surLaPorte || !pret) return null;
  if (!ouvert && !masque) return null;
  if (!ouvert) return <div className={styles.masque} aria-hidden="true" />;
  return (
    <Ecran
      aPoser={aPoser}
      reconnaitre={reconnaitre && !verrouille}
      onLeve={() => {
        setAReconnaitre(false);
        try {
          sessionStorage.setItem(CLE_RECO, "1");
          sessionStorage.removeItem(CLE_VERROU);
          sessionStorage.removeItem(CLE_GRACE);
        } catch {
          // rien à effacer
        }
        activite.current = Date.now();
        setVerrouille(false);
        setMasque(false);
      }}
      onCodePose={() => setCodePose(true)}
      onReporter={() => setReporte(true)}
      prenom={prenom}
      t={t}
    />
  );
}

type Traduire = ReturnType<typeof useT>;

/* L'APPAREIL SE RECONNAÎT SUR DEMANDE, PAR UNE CASE (22 novembre 2026, le client : « décocher la case par défaut »). La case « Reconnaître cet appareil » de la connexion par e-mail est décochée d'emblée : le navigateur n'est enregistré, avec le code saisi, que si le client l'a cochée. Le code est demandé UNE fois après l'e-mail, case cochée ou non. */
const doitReconnaitre = (): boolean => confianceVoulue() === true;

/* CE NAVIGATEUR SE FAIT RECONNAÎTRE QUAND LE CODE EST SAISI ICI (21 novembre 2026, le client : « après la déconnexion de cet appareil, la reconnexion renvoie vers l'inscription »).
   Le verrou posait le code du COMPTE, mais jamais l'appareil : aucun compte qui avait reçu son code par le verrou (tous ceux d'avant le parcours de création à code) n'était reconnu sur son navigateur. La sortie de « cet appareil » menait donc au champ e-mail, puis à « Créer votre compte ». On enrôle ce navigateur avec le MÊME code, une fois, à la pose comme au premier déverrouillage ; si le navigateur est déjà reconnu, ou si le serveur refuse, on ne fait rien (le code reste valable, rien n'est perdu). */
async function reconnaitreCeNavigateur(code: string, prenom?: string): Promise<void> {
  try {
    if (codeDeCetAppareil(readDevice()) || !doitReconnaitre()) return;
    const token = newDeviceToken();
    const r = await enrolPin(token, code, deviceLabel());
    if (r.ok) enregistrerLeCode({ id: r.device.id, token, who: prenom?.trim().split(/\s+/)[0] ?? "", name: r.device.name, since: r.device.createdAt });
  } catch {
    /* un échec ne doit jamais empêcher d'entrer */
  } finally {
    /* la case ne vaut que pour CETTE connexion */
    effacerConfiance();
  }
}

function Ecran({ aPoser, reconnaitre, onLeve, onCodePose, onReporter, prenom, t }: { aPoser: boolean; reconnaitre: boolean; onLeve: () => void; onCodePose: () => void; onReporter: () => void; prenom?: string; t: Traduire }) {
  const [premier, setPremier] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [panne, setPanne] = useState(false);
  const [enCours, start] = useTransition();

  const sortir = () =>
    start(async () => {
      try {
        sessionStorage.removeItem(CLE_VERROU);
      } catch {
        // rien à effacer
      }
      await logoutVersLaPorte();
    });
  const oublie = () => {
    marquerCodeOublie();
    sortir();
  };
  /* LE CODE GUICHET OUVRE, ET LUI SEUL (20 novembre 2026, le client : « le password de l'écran ne devrait pas pouvoir ouvrir l'application »). Le prompt d'empreinte est parti : le navigateur y accepte aussi le code d'écran du téléphone, connu des proches, et n'offre aucun réglage pour ne garder que la biométrie. L'empreinte reviendra avec une application native. */
  const parLeCode = (code: string) =>
    start(async () => {
      setErreur(null);
      if (aPoser) {
        if (premier === null) {
          setPremier(code);
          return;
        }
        if (premier !== code) {
          setPremier(null);
          return setErreur("Les deux codes ne sont pas identiques. Recommencez.");
        }
        try {
          const r = await poserLeCode(code);
          if (!r.ok) {
            setPremier(null);
            return setErreur(r.error);
          }
          await reconnaitreCeNavigateur(code, prenom);
          onCodePose();
          onLeve();
        } catch {
          /* UNE PANNE NE DOIT PAS ENFERMER UN CLIENT : si le serveur ne peut pas écrire le code, on le dit, et l'on laisse continuer jusqu'au prochain chargement. */
          setPremier(null);
          setPanne(true);
          setErreur("Le code n'a pas pu être enregistré pour l'instant. Réessayez dans un moment.");
        }
        return;
      }
      const r = await verifierLeCode(code);
      if (r.ok) {
        if (reconnaitre) await reconnaitreCeNavigateur(code, prenom);
        return onLeve();
      }
      setErreur(r.error);
      if (r.bloque) await logoutVersLaPorte();
    });

  /* « Bonjour {prénom} » pour la reconnaissance comme pour le verrou (le client : « Reconnaître cet appareil a remplacé le bonjour prénom, le remettre ») : seul le choix du code porte un titre. */
  const titre = aPoser ? (premier === null ? "Choisissez votre code" : "Saisissez-le encore") : undefined;
  return (
    <div className={styles.verrou} role="dialog" aria-modal="true" aria-label={t(titre ?? "Guichet est verrouillé")}>
      <div className={styles.corps}>
        <EcranDeCode titre={titre} prenom={prenom?.trim().split(/\s+/)[0]} onFini={parLeCode} occupe={enCours} cle={aPoser ? `poser${premier === null ? 1 : 2}` : "lever"} erreur={erreur} onOubli={aPoser ? undefined : oublie} />
        {aPoser && panne && (
          <button
            type="button"
            className={styles.lien}
            onClick={() => {
              onReporter();
              onLeve();
            }}
          >
            {t("Continuer sans code pour l'instant")}
          </button>
        )}
      </div>
    </div>
  );
}
