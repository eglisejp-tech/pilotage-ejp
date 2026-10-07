import type { ReactNode } from 'react'
import type { RendreEmplacement } from '@/features/fiche/VueFiche'
import type { EmplacementFiche } from '@/features/fiche/types'

interface Cadre {
  nom: string
  /** Hauteur approchée du bloc rempli, pour juger l'équilibre de la page. */
  classeHauteur: string
}

/**
 * Les emplacements de W0 qui doivent se voir sur la maquette 04 et 12. Les comptages et les
 * graphiques arrivent dans les 4 semaines après la mise en service : ils n'ont pas de cadre.
 */
const CADRES: Partial<Record<EmplacementFiche, Cadre>> = {
  reunion: { nom: 'Prochaine réunion', classeHauteur: 'min-h-11' },
  statistiquesFij: { nom: 'Chiffres par département', classeHauteur: 'min-h-64' },
  calendrier: { nom: 'Calendrier prévisionnel', classeHauteur: 'min-h-40' },
}

/**
 * Cadre visible posé par l'aperçu à la place d'un emplacement (la fiche réelle y pose le bloc d'un
 * autre lot, qui lit ses propres données). Il montre où le bloc viendra, pour relire l'ordre et
 * l'alignement de la page sur les trois formats. Jamais affiché hors de l'aperçu.
 */
export const rendreCadreEmplacement: RendreEmplacement = (emplacement): ReactNode => {
  const cadre = CADRES[emplacement]
  if (cadre === undefined) return null
  return (
    <p
      data-emplacement-apercu={emplacement}
      className={`flex items-center justify-center border border-dashed border-encre-3 px-4 py-3 text-center text-note text-encre-3 ${cadre.classeHauteur}`}
    >
      {cadre.nom} : emplacement rempli par un autre lot.
    </p>
  )
}
