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

/** Face ID ou l'empreinte devient la méthode préférée ; le code de ce navigateur, s'il existe, reste la seconde. */
export function enregistrerLaCle(cle: { id: string; who: string; name: string; since: string }): void {
  const avant = readDevice();
  const code = codeDeCetAppareil(avant);
  saveDevice({ id: cle.id, kind: "passkey", who: cle.who, name: cle.name, since: cle.since, ...(code ? { pin: code } : {}) });
}

/** Le code devient la seule méthode : la clé, s'il y en avait une, n'est plus proposée. */
export function enregistrerLeCode(code: { id: string; token: string; who: string; name: string; since: string }): void {
  saveDevice({ id: code.id, kind: "pin", token: code.token, who: code.who, name: code.name, since: code.since });
}

const KEY = "guichet_device";
const NUDGE = "guichet_device_nudge";

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

export function saveDevice(d: RememberedDevice): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
    localStorage.removeItem(NUDGE);
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

/** The « un doigt la prochaine fois ? » nudge, shown once until dismissed or until a device is enrolled. */
export function nudgeDismissed(): boolean {
  try {
    return Boolean(localStorage.getItem(NUDGE));
  } catch {
    return true;
  }
}
export function dismissNudge(): void {
  try {
    localStorage.setItem(NUDGE, new Date().toISOString());
  } catch {
    // nothing
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
