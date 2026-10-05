import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  lireCarteFij,
  lireEcartsDimanche,
  lireEcartsSessions,
  lireIndicateursCommuns,
  lireParticipations,
  lirePourcentageFij,
  lireSemaine,
  lireSessionsPassees,
  lireTotauxACeJour,
  lireTotauxDimanche,
} from '@/data/eglise'
import { lireMinisteres, lireTableauMinisteres } from '@/data/ministeres'
import { lirePointsOuverts } from '@/data/points'
import type { TypeSession } from '@/lib/metier/phrases'
import { choisirSession, construireCetteSemaine, type LecturesCetteSemaine } from './construire'
import type { DonneesCetteSemaine, Lecteur } from './types'

/** Sans réponse au bout de ce délai, l'écran affiche son erreur (LISEZMOI, « États »). */
export const DELAI_MAX_CHARGEMENT = 10_000

/** Premier élément des clés de requête de la vue : « Réessayer » ne relance que celles-ci. */
const RACINES_CLES = ['eglise', 'ministeres', 'points']

/**
 * État de la vue pour l'écran. Les trois cas s'excluent : on teste `donnees`, `erreur` ou
 * `enChargement`, et TypeScript resserre les deux autres.
 */
export type ResultatCetteSemaine = {
  /** Relance les lectures en échec ; l'état repasse à `enChargement`. */
  reessayer: () => void
} & (
  | {
      /** Première lecture, ou nouvel essai après une erreur : « Chargement » après 300 ms. */
      enChargement: true
      erreur: false
      donnees: null
    }
  | {
      /**
       * Une lecture a échoué (après la nouvelle tentative de TanStack Query), aucune réponse
       * après 10 s, ou v_semaine sans ligne : bandeau « La connexion a échoué. Réessayez. ».
       */
      enChargement: false
      erreur: true
      donnees: null
    }
  | { enChargement: false; erreur: false; donnees: DonneesCetteSemaine }
)

/**
 * Lit la vue « Cette semaine » (une requête par clé de LecturesCetteSemaine) et la construit avec
 * construireCetteSemaine. Les points ne sont lus que pour le berger et le conseil ; les
 * participations, pour la session affichée seulement. Les écarts du dimanche attendent la
 * semaine (leur clé porte le dimanche de référence : un nouveau dimanche relit tout seul).
 */
export function useCetteSemaine(
  lecteur: Lecteur,
  typeSession: TypeSession | null,
): ResultatCetteSemaine {
  const queryClient = useQueryClient()
  const lirePoints = lecteur.profil === 'berger' || lecteur.profil === 'conseil'

  const semaine = useQuery({ queryKey: ['eglise', 'semaine'], queryFn: lireSemaine })
  const dimanche = semaine.data?.dimanche
  const indicateurs = useQuery({
    queryKey: ['eglise', 'indicateurs'],
    queryFn: lireIndicateursCommuns,
  })
  const totauxDimanche = useQuery({
    queryKey: ['eglise', 'totaux-dimanche'],
    queryFn: lireTotauxDimanche,
  })
  const ecartsDimanche = useQuery({
    queryKey: ['eglise', 'ecarts-dimanche', dimanche],
    queryFn: () => lireEcartsDimanche(dimanche ?? ''),
    enabled: dimanche !== undefined,
  })
  const totauxACeJour = useQuery({ queryKey: ['eglise', 'a-ce-jour'], queryFn: lireTotauxACeJour })
  const pourcentageFij = useQuery({
    queryKey: ['eglise', 'pourcentage-fij'],
    queryFn: lirePourcentageFij,
  })
  const carteFij = useQuery({ queryKey: ['eglise', 'carte-fij'], queryFn: lireCarteFij })
  const sessions = useQuery({ queryKey: ['eglise', 'sessions'], queryFn: lireSessionsPassees })
  const ecartsSessions = useQuery({
    queryKey: ['eglise', 'ecarts-sessions'],
    queryFn: lireEcartsSessions,
  })
  const sessionAffichee =
    sessions.data === undefined ? undefined : choisirSession(sessions.data, typeSession)
  const idSession = sessionAffichee?.session_id
  const participations = useQuery({
    queryKey: ['eglise', 'participations', idSession],
    queryFn: () => lireParticipations(idSession ?? ''),
    enabled: idSession !== undefined,
  })
  const tableauMinisteres = useQuery({
    queryKey: ['ministeres', 'tableau'],
    queryFn: lireTableauMinisteres,
  })
  const ministeres = useQuery({ queryKey: ['ministeres', 'liste'], queryFn: lireMinisteres })
  const points = useQuery({
    queryKey: ['points', 'ouverts'],
    queryFn: lirePointsOuverts,
    enabled: lirePoints,
  })

  // Les lectures dont l'écran a besoin pour ce lecteur et cette session.
  const necessaires: UseQueryResult[] = [
    semaine,
    indicateurs,
    totauxDimanche,
    ecartsDimanche,
    totauxACeJour,
    pourcentageFij,
    carteFij,
    sessions,
    ecartsSessions,
    tableauMinisteres,
    ministeres,
  ]
  // Sans session à afficher, il n'y a pas de participations à lire (liste vide).
  if (idSession !== undefined) necessaires.push(participations)
  if (lirePoints) necessaires.push(points)

  const enEchec =
    necessaires.some((requete) => requete.isError) || (semaine.isSuccess && semaine.data === null)
  const pret = !enEchec && necessaires.every((requete) => requete.isSuccess)

  // Délai de 10 s : sans réponse, l'essai en cours passe en erreur. Chaque essai a le sien.
  const [essai, setEssai] = useState(0)
  const [essaiEnDelai, setEssaiEnDelai] = useState<number | null>(null)
  const enAttente = !pret && !enEchec
  useEffect(() => {
    if (!enAttente) return
    const minuteur = setTimeout(() => setEssaiEnDelai(essai), DELAI_MAX_CHARGEMENT)
    return () => clearTimeout(minuteur)
  }, [enAttente, essai])

  const reessayer = () => {
    setEssai((precedent) => precedent + 1)
    // Une lecture sans réponse reste en cours : un simple refetch la rendrait telle quelle.
    // resetQueries l'annule et la relance ; les lectures réussies gardent leurs données. Une
    // lecture réussie sans ligne (v_semaine vide) est relue aussi : c'est elle qui fait l'erreur.
    void queryClient.resetQueries({
      predicate: (requete) =>
        RACINES_CLES.includes(String(requete.queryKey[0])) &&
        (requete.state.status !== 'success' || requete.state.data === null),
    })
  }

  if (pret && semaine.data && indicateurs.data) {
    const lectures: LecturesCetteSemaine = {
      semaine: semaine.data,
      indicateurs: indicateurs.data,
      totauxDimanche: totauxDimanche.data ?? [],
      ecartsDimanche: ecartsDimanche.data ?? [],
      totauxACeJour: totauxACeJour.data ?? [],
      pourcentageFij: pourcentageFij.data ?? null,
      carteFij: carteFij.data ?? [],
      sessions: sessions.data ?? [],
      ecartsSessions: ecartsSessions.data ?? [],
      participations: idSession === undefined ? [] : (participations.data ?? []),
      tableauMinisteres: tableauMinisteres.data ?? [],
      ministeres: ministeres.data ?? [],
      points: lirePoints ? (points.data ?? { points: [], mentions: [] }) : null,
    }
    return {
      enChargement: false,
      erreur: false,
      donnees: construireCetteSemaine(lectures, lecteur, typeSession),
      reessayer,
    }
  }
  if (enEchec || essaiEnDelai === essai) {
    return { enChargement: false, erreur: true, donnees: null, reessayer }
  }
  return { enChargement: true, erreur: false, donnees: null, reessayer }
}
