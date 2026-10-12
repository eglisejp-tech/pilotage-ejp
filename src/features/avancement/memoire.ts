// Fermeture du bandeau retenue sur l'appareil. Chaque accès au stockage est protégé : en
// navigation privée ou stockage bloqué, la valeur reste en mémoire jusqu'au rechargement.

export const CLE_FERMETURE = 'pilotage-ejp.avancement.ferme'

let enMemoire: string | null = null

/** Version du contenu dont le bandeau a été fermé, ou null. */
export function lireFermeture(): string | null {
  try {
    const valeur = window.localStorage.getItem(CLE_FERMETURE)
    if (valeur !== null) return valeur
  } catch {
    // Stockage indisponible : on se rabat sur la mémoire.
  }
  return enMemoire
}

export function ecrireFermeture(version: string): void {
  enMemoire = version
  try {
    window.localStorage.setItem(CLE_FERMETURE, version)
  } catch {
    // Stockage indisponible : la mémoire suffit pour cette page.
  }
}

/** Pour les tests : oublie la valeur gardée en mémoire. */
export function oublierMemoire(): void {
  enMemoire = null
}
