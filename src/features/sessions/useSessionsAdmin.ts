import { useQuery, useQueryClient } from '@tanstack/react-query'
import { lireMinisteres } from '@/data/ministeres'
import { lireSemaine } from '@/data/eglise'
import {
  declarerSession,
  lireAttendusDeLaSession,
  lireSessionsDeclarees,
  modifierSession,
  supprimerSession,
} from '@/data/sessionsAdmin'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import { construireLignesSessions } from '@/features/sessions/construire'
import type { ActionsSessions, DonneesSessions } from '@/features/sessions/types'
import { comparerNoms } from '@/lib/metier/texte'

/** Clé des lectures de l'écran 14. */
const CLE_SESSIONS = ['sessions-admin'] as const

/**
 * Lectures de l'écran 14 : les sessions avec leur complétude (`v_session_completude`), les
 * ministères actifs (même clé que les autres écrans) et le jour de Paris (`v_semaine`). Une
 * lecture en échec donne l'erreur de page, avec « Réessayer » qui relance les trois.
 */
export function useSessionsAdmin(): EtatBloc<DonneesSessions> {
  const sessions = useQuery({
    queryKey: [...CLE_SESSIONS, 'liste'],
    queryFn: lireSessionsDeclarees,
  })
  const ministeres = useQuery({ queryKey: ['ministeres', 'liste'], queryFn: lireMinisteres })
  const semaine = useQuery({ queryKey: [...CLE_SESSIONS, 'jour'], queryFn: lireSemaine })
  if (sessions.isError || ministeres.isError || semaine.isError) {
    return {
      etat: 'erreur',
      reessayer: () => {
        void sessions.refetch()
        void ministeres.refetch()
        void semaine.refetch()
      },
    }
  }
  if (!sessions.isSuccess || !ministeres.isSuccess || !semaine.isSuccess) {
    return { etat: 'chargement' }
  }
  if (semaine.data === null) {
    return { etat: 'erreur', reessayer: () => void semaine.refetch() }
  }
  return {
    etat: 'donnees',
    donnees: {
      lignes: construireLignesSessions(sessions.data),
      ministeres: ministeres.data
        .filter((ministere) => ministere.desactive_le === null)
        .map(({ id, nom }) => ({ id, nom }))
        .sort((a, b) => comparerNoms(a.nom, b.nom)),
      aujourdhui: semaine.data.aujourdhui,
    },
  }
}

/**
 * Actions de l'écran 14, branchées sur les fonctions de la base. Après chaque écriture, réussie
 * ou non (une réponse perdue n'empêche pas la fonction d'avoir abouti), la liste est relue, ainsi
 * que les écrans qui montrent les sessions (« Choisir la session », vue de l'église).
 */
export function useActionsSessions(): ActionsSessions {
  const client = useQueryClient()
  const relire = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: CLE_SESSIONS }),
      client.invalidateQueries({ queryKey: ['saisie-session'] }),
      client.invalidateQueries({ queryKey: ['eglise'] }),
    ])
  }
  const puisRelire = async <T>(appel: () => Promise<T>): Promise<T> => {
    try {
      const resultat = await appel()
      await relire()
      return resultat
    } catch (erreur) {
      void relire()
      throw erreur
    }
  }
  return {
    declarer: (valeurs) => puisRelire(() => declarerSession(valeurs)),
    modifier: (sessionId, ministeres) => puisRelire(() => modifierSession(sessionId, ministeres)),
    supprimer: (sessionId) => puisRelire(() => supprimerSession(sessionId)),
    lireAttendus: lireAttendusDeLaSession,
  }
}
