import type { SessionDeclaree } from '@/data/sessionsAdmin'
import { phraseManquants, phraseSaisies } from '@/features/sessions/textes'
import type { ValeursDeclaration } from '@/features/sessions/schemas'
import type { TypeSession } from '@/lib/base'
import { formaterJourAbrege } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { nomSession, sessionDu } from '@/lib/metier/phrases'
import { nombre } from '@/lib/metier/texte'

/** Colonne « Saisies » : « Pas encore eu lieu », ou la complétude et les ministères qui manquent. */
export type SaisiesDeLaSession =
  | { genre: 'a_venir' }
  | { genre: 'saisies'; libelle: string; complet: boolean; manquants: string | null }

/** Une ligne de la liste des sessions déclarées. */
export interface LigneSession {
  id: string
  type: TypeSession
  date: DateIso
  /** « Sam. 3 oct. » */
  dateCourte: string
  /** « Bâtir l'Église », « Anti-Dispersion », ou le nom du rassemblement. */
  nom: string
  /** « Bâtir l'Église du 3 oct. » : titre des fenêtres, nom accessible des boutons, réussites. */
  designation: string
  /** Nombre de ministères attendus, tel que la vue le compte. */
  attendus: string
  saisies: SaisiesDeLaSession
  /** Une session que personne n'a saisie peut être supprimée ; la base le refuse sinon. */
  supprimable: boolean
}

/**
 * Lignes de la liste à partir de `v_session_completude` : rien n'est recompté ici. Une session
 * qui n'a pas encore eu lieu (jour de Paris, calculé par la vue) n'affiche pas de complétude : ses
 * attendus ne peuvent pas avoir saisi.
 */
export function construireLignesSessions(sessions: readonly SessionDeclaree[]): LigneSession[] {
  return sessions.map((session) => ({
    id: session.session_id,
    type: session.type,
    date: session.date,
    dateCourte: formaterJourAbrege(session.date),
    nom: nomSession(session.type, session.intitule),
    designation: sessionDu(session.type, session.intitule, session.date),
    attendus: nombre(session.nb_attendus),
    saisies: session.a_eu_lieu
      ? {
          genre: 'saisies',
          libelle: phraseSaisies(session.nb_saisis, session.nb_attendus),
          complet: session.nb_attendus > 0 && session.nb_saisis >= session.nb_attendus,
          manquants: phraseManquants(session.manquants),
        }
      : { genre: 'a_venir' },
    supprimable: session.nb_saisis === 0,
  }))
}

/** « Bâtir l'Église du 10 oct. » pour la session qu'on vient de déclarer (message de réussite). */
export function designationDeclaration(valeurs: ValeursDeclaration): string {
  return sessionDu(valeurs.type, valeurs.type === 'autre' ? valeurs.nom.trim() : null, valeurs.date)
}
