/**
 * What this browser remembers of the device it enrolled: enough to greet the
 * client on the sign-in page and to open with a finger or four digits. The
 * server holds the other half (public key, or the hash of token · code).
 */
export type RememberedDevice = {
  id: string;
  /** la méthode PRÉFÉRÉE de ce navigateur : celle que la porte propose d'abord */
  kind: "passkey" | "pin";
  token?: string;
  /** le code de ce navigateur, gardé même quand la clé est préférée : c'est lui qui répond quand le geste est annulé */
  pin?: { id: string; token: string };
  who: string;
  name: string;
  since: string;
};

/** Le code à six chiffres de ce navigateur (identifiant et jeton), qu'il soit la méthode préférée ou la seconde. */
export function codeDeCetAppareil(d: RememberedDevice | null): { id: string; token: string } | null {
  if (!d) return null;
  if (d.kind === "pin" && d.token) return { id: d.id, token: d.token };
  return d.pin ?? null;
}

/** Le code de ce navigateur : la seule méthode d'ouverture. Une clé enregistrée avant le 20 novembre 2026 n'ouvre plus rien. */
export function enregistrerLeCode(code: { id: string; token: string; who: string; name: string; since: string }): void {
  saveDevice({ id: code.id, kind: "pin", token: code.token, who: code.who, name: code.name, since: code.since });
}

const KEY = "guichet_device";

export function readDevice(): RememberedDevice | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as RememberedDevice;
    return d && d.id && (d.kind === "passkey" || d.kind === "pin") ? d : null;
  } catch {
    return null;
  }
}

/** « Oublier cet appareil » est un geste du client : le verrou ne doit pas reconnaître ce navigateur de lui-même juste après. */
const OUBLI_VOULU = "guichet_appareil_oublie";
export function marquerAppareilOublie(): void {
  try {
    localStorage.setItem(OUBLI_VOULU, "1");
  } catch {
    // stockage refusé : rien à retenir
  }
}
export function appareilOublieVoulu(): boolean {
  try {
    return localStorage.getItem(OUBLI_VOULU) === "1";
  } catch {
    return false;
  }
}

/**
 * LA CASE « RECONNAÎTRE CET APPAREIL » DE LA CONNEXION PAR E-MAIL (21 novembre 2026, le client : « lors de la connexion par e-mail, l'application proposera de reconnaître l'appareil par une case à cocher ; les prochaines connexions se feront avec le code seul » ; « l'enregistrement se fait automatiquement »).
 * La case est cochée d'emblée. Son état est gardé ici le temps que le code du compte soit saisi (le code seul permet d'enrôler le navigateur) ; absente, c'est « oui », sauf pour un appareil que le client a lui-même fait oublier.
 */
const CONFIANCE = "guichet_confiance";
export function marquerConfiance(oui: boolean): void {
  try {
    localStorage.setItem(CONFIANCE, oui ? "1" : "0");
  } catch {
    // stockage refusé : la valeur par défaut s'applique
  }
}
/** `true` / `false` si le client a coché ou décoché la case, `null` s'il ne l'a pas vue. */
export function confianceVoulue(): boolean | null {
  try {
    const v = localStorage.getItem(CONFIANCE);
    return v === "1" ? true : v === "0" ? false : null;
  } catch {
    return null;
  }
}
export function effacerConfiance(): void {
  try {
    localStorage.removeItem(CONFIANCE);
  } catch {
    // rien à effacer
  }
}

export function saveDevice(d: RememberedDevice): void {
  try {
    localStorage.removeItem(OUBLI_VOULU);
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // Private window or storage blocked: the device simply is not remembered here.
  }
}

export function clearDevice(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}

/** A readable name for this device, from the user agent: « iPhone », « Android », « Chrome sur Windows ». */
export function deviceLabel(): string {
  if (typeof navigator === "undefined") return "Cet appareil";
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navigateur";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} sur ${os}` : browser;
}

/** A random token for a four-digit code bound to this browser. */
export function newDeviceToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * « CODE OUBLIÉ ? » (19 novembre 2026, planche « Paramètres et connexion », 4A) : le client n'a plus son code, il prouve l'adresse par le code reçu, puis en choisit un nouveau. Le drapeau vit dans l'onglet (sessionStorage) : il dit à la porte d'aller droit au code reçu, et à la création de proposer un NOUVEAU code au lieu de demander l'ancien.
 */
const OUBLI = "guichet_code_oublie";
export function marquerCodeOublie(): void {
  try {
    sessionStorage.setItem(OUBLI, "1");
  } catch {
    // stockage refusé : le parcours demandera l'ancien code
  }
}
export function codeOublie(): boolean {
  try {
    return sessionStorage.getItem(OUBLI) === "1";
  } catch {
    return false;
  }
}
export function effacerCodeOublie(): void {
  try {
    sessionStorage.removeItem(OUBLI);
  } catch {
    // rien à effacer
  }
}
