/**
 * What this browser remembers of the device it enrolled: enough to greet the
 * client on the sign-in page and to open with a finger or four digits. The
 * server holds the other half (public key, or the hash of token · code).
 */
export type RememberedDevice = { id: string; kind: "passkey" | "pin"; token?: string; who: string; name: string; since: string };

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
