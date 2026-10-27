// « Masquer » du bandeau Octobre rose, retenu sur l'appareil pour l'année en cours : il revient
// l'octobre suivant. Chaque accès au stockage est protégé : en navigation privée ou stockage
// bloqué, le bandeau s'affiche normalement et « Masquer » vaut jusqu'au rechargement.

export const CLE_MASQUE = 'pilotage-ejp.octobre-rose.masque'

let enMemoire: string | null = null

/** Vrai si le bandeau a été masqué sur cet appareil pendant l'octobre de cette année. */
export function estMasque(annee: string): boolean {
  try {
    if (window.localStorage.getItem(CLE_MASQUE) === annee) return true
  } catch {
    // Stockage indisponible : on se rabat sur la mémoire.
  }
  return enMemoire === annee
}

export function masquer(annee: string): void {
  enMemoire = annee
  try {
    window.localStorage.setItem(CLE_MASQUE, annee)
  } catch {
    // Stockage indisponible : la mémoire suffit pour cette page.
  }
}

/** Pour les tests : oublie la valeur gardée en mémoire. */
export function oublierMemoire(): void {
  enMemoire = null
}
