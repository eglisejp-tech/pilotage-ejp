// Changement d'écran dit aux lecteurs d'écran (m254) : seul le titre de l'onglet changeait, et un
// lecteur d'écran ne l'annonce pas. Chaque écran se signale par `useTitrePage` ; la région
// `AnnonceDePage` dit alors son nom (« Ma fiche »). Le premier écran ouvert ne s'annonce pas : le
// lecteur d'écran lit déjà le titre de la page qui se charge. Une fenêtre (panneau de saisie en
// fenêtre) ne s'annonce pas non plus : le focus y entre et son titre est lu avec elle.
//
// Les écrans ouverts forment une pile : un panneau s'ouvre au-dessus de sa page, qui reste montée.
// Quand ce qui la couvrait se ferme, la page redevient l'écran courant et s'annonce de nouveau,
// même si son nom est celui de la dernière annonce : chaque annonce porte un numéro, et la région
// remplace son texte à chaque numéro. La pile suit l'ordre d'ouverture : un panneau s'ouvre
// toujours après sa page (un geste de la personne).

/** Un écran ouvert : son nom (une fois signalé) et s'il s'annonce (faux pour une fenêtre). */
export interface EcranOuvert {
  nom: string | null
  annoncer: boolean
}

/** Ce que dit la région : le nom de l'écran, et le numéro de l'annonce. */
export interface Annonce {
  texte: string
  numero: number
}

const pile: EcranOuvert[] = []
let ecranCourant: string | null = null
let annonce: Annonce = { texte: '', numero: 0 }
const abonnes = new Set<() => void>()

function annoncerEcran(texte: string) {
  annonce = { texte, numero: annonce.numero + 1 }
  for (const abonne of abonnes) abonne()
}

/** Un écran se monte : il prend place au-dessus des écrans déjà ouverts. */
export function ouvrirEcran(): EcranOuvert {
  const ecran: EcranOuvert = { nom: null, annoncer: true }
  pile.push(ecran)
  return ecran
}

/**
 * Un écran s'affiche, ou change de nom. `annoncer` : faux pour une fenêtre, qui note seulement son
 * nom. Un écran couvert par un autre (une page sous son panneau) ne change pas l'écran courant.
 */
export function signalerEcran(ecran: EcranOuvert, nom: string, annoncer: boolean) {
  ecran.nom = nom
  ecran.annoncer = annoncer
  if (pile.at(-1) !== ecran) return
  const premier = ecranCourant === null
  if (nom === ecranCourant) return
  ecranCourant = nom
  if (premier || !annoncer) return
  annoncerEcran(nom)
}

/**
 * Un écran se démonte. S'il était au-dessus, l'écran qu'il couvrait (resté monté) redevient
 * l'écran courant et s'annonce de nouveau : la personne sait où elle revient.
 */
export function fermerEcran(ecran: EcranOuvert) {
  const etaitDessus = pile.at(-1) === ecran
  const place = pile.indexOf(ecran)
  if (place >= 0) pile.splice(place, 1)
  const dessous = pile.at(-1)
  if (!etaitDessus || dessous === undefined || dessous.nom === null) return
  ecranCourant = dessous.nom
  if (dessous.annoncer) annoncerEcran(dessous.nom)
}

/** Dernière annonce : le nom du dernier écran annoncé (vide au départ) et son numéro. */
export function lireAnnonceDePage(): Annonce {
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
  pile.length = 0
  ecranCourant = null
  annonce = { texte: '', numero: 0 }
  for (const abonne of abonnes) abonne()
}
