/**
 * LE RETOUR AU DOIGT (17 novembre 2026) : un tic court quand on touche la barre du bas, comme celui de l'astuce de glissement et du pager.
 * Là où le téléphone ne sait pas vibrer (iPhone, ordinateur), rien ne se passe et rien ne casse.
 */
export function tic(ms = 10): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // haptics unavailable
  }
}
