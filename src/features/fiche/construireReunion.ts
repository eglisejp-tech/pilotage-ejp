import type { TexteLibre } from '@/features/cette-semaine/types'
import { TEXTE_MASQUE } from '@/features/fiche/textesFiche'
import type { LigneVue } from '@/lib/base'
import { formaterRendezVous } from '@/lib/metier/dates'

/** Prochaine réunion telle que la fiche l'écrit (maquettes 04 et 12). */
export interface ReunionFiche {
  /** « lundi 5 oct., 20 h », ou « lundi 5 oct. » sans heure. */
  quand: string
  objet: TexteLibre | null
  decision: TexteLibre | null
}

function texteLibreOuNull(texte: string | null): TexteLibre | null {
  return texte === null || texte.trim() === '' ? null : { texte, masque: texte === TEXTE_MASQUE }
}

/**
 * Prochaine réunion déclarée, ou null : `v_prochaine_reunion` ne rend déjà que la dernière
 * déclaration dont la date n'est pas passée (règle 15, jour de Paris).
 */
export function construireReunion(
  reunion: Pick<
    LigneVue<'v_prochaine_reunion'>,
    'date' | 'heure' | 'objet' | 'decision_attendue'
  > | null,
): ReunionFiche | null {
  if (reunion === null) return null
  return {
    quand: formaterRendezVous(reunion.date, reunion.heure),
    objet: texteLibreOuNull(reunion.objet),
    decision: texteLibreOuNull(reunion.decision_attendue),
  }
}
