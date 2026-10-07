import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import {
  enregistrerParticipation,
  lireMesParticipations,
  lireSession,
  lireSessionPrecedente,
  lireSessionsRecentes,
} from '@/data/participations'
import type { ParticipationCourante, SessionCompletude } from '@/data/participations'
import type { SaisieParticipation } from '@/features/saisie-session/schemas'
import type { PresencePrecedente, SessionAChoisir } from '@/features/saisie-session/session'

/** Premier élément des clés de requête des saisies de session. */
const RACINE = 'saisie-session'

/** Après un envoi : la saisie, et la vue de l'église qui montre la session, se relisent. */
function useRelire() {
  const client = useQueryClient()
  return useCallback(async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: [RACINE] }),
      client.invalidateQueries({ queryKey: ['eglise'] }),
    ])
  }, [client])
}

export type EtatSaisieSession =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  /** Aucune session lisible avec cet identifiant (adresse fausse ou ancienne). */
  | { etat: 'introuvable' }
  /** Session future : aucune saisie avant son jour (heure de Paris, BRIEF règle 5). */
  | { etat: 'future'; session: SessionCompletude }
  | {
      etat: 'pret'
      session: SessionCompletude
      precedente: PresencePrecedente | null
      dejaSaisi: ParticipationCourante | null
      enregistrer: (saisie: SaisieParticipation) => Promise<void>
    }

/**
 * Lectures de la saisie d'une session : la session et sa complétude, la session précédente du
 * même type, puis la saisie du ministère pour ces deux sessions. Un envoi relit tout.
 */
export function useSaisieSession(sessionId: string, ministereId: string): EtatSaisieSession {
  const relire = useRelire()
  const session = useQuery({
    queryKey: [RACINE, 'session', sessionId],
    queryFn: () => lireSession(sessionId),
  })
  const donnees = session.data
  const passee = donnees?.a_eu_lieu === true
  const precedente = useQuery({
    queryKey: [RACINE, 'precedente', donnees?.type, donnees?.date],
    queryFn: () => (donnees ? lireSessionPrecedente(donnees.type, donnees.date) : null),
    enabled: passee,
  })
  const ids = [sessionId, precedente.data?.session_id].filter(
    (id): id is string => id !== undefined,
  )
  const participations = useQuery({
    queryKey: [RACINE, 'participations', ministereId, ids],
    queryFn: () => lireMesParticipations(ministereId, ids),
    enabled: passee && precedente.isSuccess,
  })

  const enregistrer = useCallback(
    async (saisie: SaisieParticipation) => {
      await enregistrerParticipation(saisie)
      await relire()
    },
    [relire],
  )

  if (session.isError || precedente.isError || participations.isError) {
    return {
      etat: 'erreur',
      reessayer: () => {
        void session.refetch()
        if (precedente.isError) void precedente.refetch()
        if (participations.isError) void participations.refetch()
      },
    }
  }
  if (session.isPending) return { etat: 'chargement' }
  if (donnees === null || donnees === undefined) return { etat: 'introuvable' }
  if (!donnees.a_eu_lieu) return { etat: 'future', session: donnees }
  if (precedente.isPending || participations.isPending) return { etat: 'chargement' }

  const mesSaisies = participations.data
  const precedenteId = precedente.data?.session_id
  return {
    etat: 'pret',
    session: donnees,
    precedente:
      precedenteId === undefined
        ? null
        : {
            presents: mesSaisies.find((ligne) => ligne.session_id === precedenteId)?.valeur ?? null,
          },
    dejaSaisi: mesSaisies.find((ligne) => ligne.session_id === sessionId) ?? null,
    enregistrer,
  }
}

export type EtatChoixSession =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  | { etat: 'pret'; sessions: SessionAChoisir[] }

/** Lectures de « Choisir la session » : les 8 dernières sessions passées et la saisie du ministère. */
export function useChoixSession(ministereId: string): EtatChoixSession {
  const sessions = useQuery({ queryKey: [RACINE, 'recentes'], queryFn: lireSessionsRecentes })
  const ids = (sessions.data ?? []).map((session) => session.session_id)
  const participations = useQuery({
    queryKey: [RACINE, 'participations', ministereId, ids],
    queryFn: () => lireMesParticipations(ministereId, ids),
    enabled: sessions.isSuccess,
  })

  if (sessions.isError || participations.isError) {
    return {
      etat: 'erreur',
      reessayer: () => {
        void sessions.refetch()
        if (participations.isError) void participations.refetch()
      },
    }
  }
  if (sessions.isPending || participations.isPending) return { etat: 'chargement' }
  const saisies = new Map(participations.data.map((ligne) => [ligne.session_id, ligne.valeur]))
  return {
    etat: 'pret',
    sessions: sessions.data.map((session) => ({
      sessionId: session.session_id,
      type: session.type,
      intitule: session.intitule,
      date: session.date,
      presentsSaisis: saisies.get(session.session_id) ?? null,
    })),
  }
}
