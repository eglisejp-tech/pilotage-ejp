import type { LigneVosSaisies } from '@/features/accueil-ministere/types'
import { adresseSaisieSession } from '@/features/saisie-session/session'
import type { TypeSession } from '@/lib/base'
import type { DateIso } from '@/lib/metier/dates'
import { sessionDu } from '@/lib/metier/phrases'
import { accorder, nombre } from '@/lib/metier/texte'

/** Ce que E7 lit pour les lignes des sessions (lot E4 : `src/data/participations.ts`). */
export interface DonneesLignesSessions {
  /** `v_semaine` : lundi de la semaine de référence et jour de Paris. */
  semaine: { lundi: DateIso; aujourdhui: DateIso }
  /** Sessions avec leur type et leur date (`v_session_completude`). */
  sessions: readonly {
    session_id: string
    type: TypeSession
    intitule: string | null
    date: DateIso
  }[]
  /** Sessions où le ministère est attendu (`lireSessionsAttendues`). */
  attendues: readonly string[]
  /** Saisie la plus récente du ministère par session (`lireMesParticipations`). */
  mesParticipations: readonly { session_id: string; valeur: number }[]
}

/**
 * Lignes de « Vos saisies » pour chaque session où le ministère est attendu, datée du lundi de
 * la semaine de référence à aujourd'hui, heure de Paris (BRIEF, section 9, « Accueil du
 * ministère ») : « Bâtir l'Église du 26 sept. », Fait « 13 présents » avec « Corriger », sinon
 * « Saisir ». Dans l'ordre des dates. Une session future n'apparaît pas.
 */
export function lignesSessions({
  semaine,
  sessions,
  attendues,
  mesParticipations,
}: DonneesLignesSessions): readonly LigneVosSaisies[] {
  const attendu = new Set(attendues)
  const saisies = new Map(mesParticipations.map((ligne) => [ligne.session_id, ligne.valeur]))
  return sessions
    .filter(
      (session) =>
        attendu.has(session.session_id) &&
        session.date >= semaine.lundi &&
        session.date <= semaine.aujourdhui,
    )
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1))
    .map((session): LigneVosSaisies => {
      const presents = saisies.get(session.session_id)
      const vers = adresseSaisieSession(session.session_id)
      const libelle = sessionDu(session.type, session.intitule, session.date)
      return presents === undefined
        ? {
            cle: `session:${session.session_id}`,
            libelle,
            etat: 'a_faire',
            detail: null,
            action: { libelle: 'Saisir', vers },
          }
        : {
            cle: `session:${session.session_id}`,
            libelle,
            etat: 'fait',
            detail: `Fait, ${nombre(presents)} ${accorder(presents, 'présent', 'présents')}`,
            action: { libelle: 'Corriger', vers },
          }
    })
}
