// Changement d'écran dit aux lecteurs d'écran (m254) : seul le titre de l'onglet changeait, et un
// lecteur d'écran ne l'annonce pas. Chaque écran se signale par `useTitrePage` ; la région
// `AnnonceDePage` dit alors son nom (« Ma fiche »). Le premier écran ouvert ne s'annonce pas : le
// lecteur d'écran lit déjà le titre de la page qui se charge. Une fenêtre (panneau de saisie en
// fenêtre) ne s'annonce pas non plus : le focus y entre et son titre est lu avec elle.

let ecranCourant: string | null = null
let annonce = ''
const abonnes = new Set<() => void>()

/**
 * Un écran s'affiche. `annoncer` : faux pour une fenêtre, qui note seulement son nom (l'écran
 * d'origine s'annoncera de nouveau s'il revient après elle).
 */
export function signalerEcran(ecran: string, annoncer: boolean) {
  const premier = ecranCourant === null
  if (ecran === ecranCourant) return
  ecranCourant = ecran
  if (premier || !annoncer) return
  annonce = ecran
  for (const abonne of abonnes) abonne()
}

/** Nom du dernier écran annoncé, ou une chaîne vide. */
export function lireAnnonceDePage(): string {
  return annonce
}

export function abonnerAnnonceDePage(abonne: () => void): () => void {
  abonnes.add(abonne)
  return () => {
    abonnes.delete(abonne)
  }
}

/** Pour les tests : comme à l'ouverture de l'application. */
export function reinitialiserAnnonceDePage() {
  ecranCourant = null
  annonce = ''
  for (const abonne of abonnes) abonne()
}
