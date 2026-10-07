// Position d'une bulle d'aide (aides-contextuelles.md, section 3). Seule la flèche est calculée
// pour une bulle « flux » (elle reste dans le flux, sous le libellé). Une bulle « flottante »
// choisit en plus dessous ou dessus, sa largeur et son décalage pour rester dans sa colonne.
// Les mesures se font à l'ouverture et au changement de taille de la fenêtre, jamais au survol.

import type { PlacementAide } from './placementAide'

/** Largeur d'écran à partir de laquelle la bulle plafonne à `--aide-largeur` (280 px). */
const LARGEUR_PLAFONNEE = 600
const LARGEUR_MAX = 280
const MARGE_FENETRE = 8
const ECART = 8
const MARGE_FLECHE = 10

type Colonne = { gauche: number; droite: number }

/** Colonne de contenu autour du bouton : la zone de saisie, sinon la page, moins sa marge. */
function colonneDe(bouton: HTMLElement): Colonne {
  const conteneur =
    bouton.closest<HTMLElement>('[data-colonne]') ??
    bouton.closest<HTMLElement>('main > div') ??
    document.body
  const rect = conteneur.getBoundingClientRect()
  const style = getComputedStyle(conteneur)
  return {
    gauche: rect.left + (parseFloat(style.paddingLeft) || 0),
    droite: rect.right - (parseFloat(style.paddingRight) || 0),
  }
}

function placerFleche(bulle: HTMLElement, bouton: HTMLElement) {
  const rect = bulle.getBoundingClientRect()
  const centre = bouton.getBoundingClientRect()
  const x = centre.left + centre.width / 2 - rect.left
  const borne = Math.max(MARGE_FLECHE, rect.width - MARGE_FLECHE)
  bulle.style.setProperty('--fleche', `${Math.min(Math.max(x, MARGE_FLECHE), borne)}px`)
}

/**
 * Place la bulle ouverte. `bouton` est la zone cliquable de 44 px ; en placement flottant, la
 * bulle est positionnée par rapport à son parent (la racine de l'aide), qui enveloppe le bouton.
 */
export function positionnerBulle(
  bulle: HTMLElement,
  bouton: HTMLElement,
  placement: PlacementAide,
) {
  const largeurFenetre = document.documentElement.clientWidth
  // Sans mise en page (jsdom), rien à mesurer.
  if (largeurFenetre === 0) return

  if (placement === 'flottante') {
    const colonne = colonneDe(bouton)
    const gauche = Math.max(colonne.gauche, MARGE_FENETRE)
    const droite = Math.min(colonne.droite, largeurFenetre - MARGE_FENETRE)
    const largeurColonne = Math.max(droite - gauche, 0)
    const largeur =
      largeurFenetre >= LARGEUR_PLAFONNEE ? Math.min(LARGEUR_MAX, largeurColonne) : largeurColonne
    bulle.style.width = `${largeur}px`

    // Alignée sur le début du libellé (le parent de la racine de l'aide), puis ramenée dans la
    // colonne. La bulle est positionnée par rapport à la racine.
    const racine = bulle.parentElement?.parentElement ?? bouton
    const libelle = racine.parentElement ?? racine
    const rectRacine = racine.getBoundingClientRect()
    const voulu = Math.min(
      Math.max(libelle.getBoundingClientRect().left, gauche),
      Math.max(droite - largeur, gauche),
    )
    bulle.style.left = `${voulu - rectRacine.left}px`

    // Sous la ligne entière (ligne de liste ou de tableau), ou au-dessus d'elle : jamais sur le
    // chiffre qu'elle explique, même quand la ligne passe sur deux lignes au téléphone.
    const ligne = racine.closest<HTMLElement>('li, tr, [data-ligne-aide]') ?? racine
    const rectLigne = ligne.getBoundingClientRect()
    const dessous = window.innerHeight - rectLigne.bottom
    const dessus = rectLigne.top
    const hauteur = bulle.offsetHeight
    const auDessus = dessous < hauteur + ECART * 2 && dessus > dessous
    bulle.dataset.cote = auDessus ? 'haut' : 'bas'
    if (auDessus) {
      bulle.style.top = 'auto'
      bulle.style.bottom = `${rectRacine.bottom - rectLigne.top + ECART}px`
    } else {
      bulle.style.bottom = 'auto'
      bulle.style.top = `${rectLigne.bottom - rectRacine.top + ECART}px`
    }
  }

  placerFleche(bulle, bouton)
}
