import type { EvenementLu } from '@/data/evenements'
import type { MinistereListe } from '@/data/ministeres'
import { TEXTE_MASQUE } from '@/features/fiche/textesFiche'
import type { TexteLibre } from '@/features/cette-semaine/types'
import { formaterJourSemaine } from '@/lib/metier/dates'
import { evenementsAConfirmer } from '@/lib/metier/alerteEvenements'
import { texteDesJours, tonDesJours } from '@/lib/metier/evenements'

/** Une ligne du bloc « Événements à confirmer » : « Soirée de louange », Communication : ... */
export interface LigneAlerte {
  id: string
  titre: TexteLibre
  ministereId: string
  ministere: string
  /** « samedi 10 oct. ». */
  jour: string
  /** « dans 3 jours », « demain », « date passée depuis 10 jours ». */
  texteDate: string
  ton: 'attention' | 'alerte'
}

/**
 * Lignes du bloc, la date la plus ancienne d'abord, à partir des lignes que la base marque
 * `a_confirmer` et de leur `jours` (heure de Paris). Liste vide : le bloc disparaît.
 */
export function construireAlerte(
  evenements: readonly EvenementLu[],
  ministeres: readonly MinistereListe[],
): LigneAlerte[] {
  const noms = new Map(ministeres.map((m) => [m.id, m.nom]))
  return evenementsAConfirmer(evenements).map((evenement) => ({
    id: evenement.id,
    titre: { texte: evenement.titre, masque: evenement.titre === TEXTE_MASQUE },
    ministereId: evenement.ministere_id,
    ministere: noms.get(evenement.ministere_id) ?? 'Ministère',
    jour: formaterJourSemaine(evenement.date),
    texteDate: texteDesJours(evenement.jours),
    ton: tonDesJours(evenement.jours),
  }))
}
