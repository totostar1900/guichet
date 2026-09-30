/**
 * Two addresses, one application: the client site (NEXT_PUBLIC_APP_URL) and
 * the desk (NEXT_PUBLIC_DESK_HOST, e.g. desk.purposecapital.africa). With the
 * desk host set, the proxy keeps /desk on the desk host and everything else
 * on the client host, and the client site never shows a desk control, even to
 * staff. Without it (development, previews), one host serves both, gated by
 * role as before.
 */
export const DESK_HOST = (process.env.NEXT_PUBLIC_DESK_HOST ?? "").trim().toLowerCase();

/** The desk is split off: true once the desk host is configured. */
export const deskSplit = (): boolean => Boolean(DESK_HOST);

export function isDeskHost(host: string | null | undefined): boolean {
  return deskSplit() && (host ?? "").split(":")[0].toLowerCase() === DESK_HOST;
}

export const deskOrigin = (): string => (DESK_HOST ? `https://${DESK_HOST}` : "");
export const clientOrigin = (): string => (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

/** Paths the desk host serves besides /desk: sign-in, auth, APIs, the account's security page. */
/**
 * Le Guide entier, et non les seules mentions : les leçons sont citées de
 * partout dans le desk, de la carte de chiffre à la ligne « à couvrir à
 * l'appel » d'un profil client. Les servir ici, c'est lire la page du client
 * sans quitter le domaine ni perdre sa session ; en faire une seconde version
 * serait un second texte à tenir d'accord, ce qu'on refuse.
 *
 * Le contenu est public de toute façon, et le robots.txt du domaine du desk
 * interdit tout : rien n'est exposé qui ne le soit déjà, et rien n'est indexé
 * deux fois.
 */
export const DESK_HOST_ALLOW = ["/desk", "/connexion", "/auth", "/api", "/moi/securite", "/info", "/manifest.webmanifest", "/sw.js", "/icon", "/apple-icon", "/opengraph-image", "/robots.txt", "/sitemap.xml"];

export const deskHostServes = (path: string): boolean => DESK_HOST_ALLOW.some((p) => path === p || path.startsWith(p + "/") || (p.endsWith("icon") && path.startsWith(p)));

/**
 * Cette adresse appartient-elle au desk ?
 *
 * ELLE EXIGE LA BARRE, et c'est une boucle de redirections qui l'a appris.
 * Le proxy lisait `path.startsWith("/desk")` : « /deskonaute » était donc une
 * adresse du desk pour lui, et il l'envoyait sur le hôte du desk. Là,
 * `deskHostServes` la découpait autrement, ne la servait pas, et la renvoyait
 * au hôte client, qui la renvoyait au desk. Un navigateur y tournait jusqu'à
 * rendre les armes, et rien dans le code ne disait que les deux fonctions ne
 * lisaient pas le même chemin.
 *
 * Une adresse du desk est « /desk », ou quelque chose sous « /desk/ ».
 */
export const isDeskPath = (path: string): boolean => path === "/desk" || path.startsWith("/desk/");
