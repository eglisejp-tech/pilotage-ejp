import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { lireCarteFij, lireSemaine, lireSessionsPassees } from '@/data/eglise'
import { lirePointsMinistere } from '@/data/fiche'
import { CODE_MINISTERE_FIJ, lireCodeMinistere, lireStatistiquesFij } from '@/data/fij'
import { lireMesuresPeriode } from '@/data/indicateurs'
import { lireMinisteres } from '@/data/ministeres'
import { lireMesParticipations, lireSessionsAttendues } from '@/data/participations'
import { lireIndicateursASaisir } from '@/data/saisies'
import { lignesChiffres } from '@/features/accueil-ministere/lignesChiffres'
import { lignesEvenements } from '@/features/accueil-ministere/lignesEvenements'
import { lignesFij } from '@/features/accueil-ministere/lignesFij'
import { lignesReunion } from '@/features/accueil-ministere/lignesReunion'
import { lignesSessions } from '@/features/accueil-ministere/lignesSessions'
import type { DonneesAccueilMinistere } from '@/features/accueil-ministere/types'
import { construireVosPoints } from '@/features/accueil-ministere/vosPoints'
import { construireOuverture, rangerVosSaisies } from '@/features/accueil-ministere/vosSaisies'
import { DELAI_MAX_CHARGEMENT } from '@/features/cette-semaine/useCetteSemaine'
import type { EtatBloc, PointFiche } from '@/features/fiche/modeleFiche'
import { RACINE_SAISIE_CHIFFRES } from '@/features/saisie-chiffres/useSaisieDimanche'
import { CLE_STATISTIQUES_FIJ } from '@/features/saisie-fij/useSaisiesFij'

export type ResultatAccueilMinistere =
  /** Un autre profil qu'un ministère : rien n'est lu. */
  | { etat: 'sans_objet' }
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  | { etat: 'pret'; donnees: DonneesAccueilMinistere }

/**
 * Lit l'accueil du ministère (maquette 07) : les lignes de « Vos saisies » (chiffres, sessions,
 * prochaine réunion, FIJ, événements), la phrase et les boutons, puis « Vos points ». Les clés de
 * requête sont celles des saisies (E3, E4, E5), du calendrier (E6) ou de la vue de l'église : un
 * envoi les relit, et l'accueil se met à jour au retour. Les chiffres FIJ ne sont lus que pour le
 * ministère `fij`. Sans réponse au bout de 10 s, l'accueil passe en erreur (« Réessayer »), comme
 * la vue. Un autre profil (`ministereId` null) ne lit rien. Aucune date du navigateur : le jour de
 * Paris, le lundi et le dimanche de référence viennent de `v_semaine`, les jours d'un événement
 * de `v_evenement`.
 */
export function useAccueilMinistere(ministereId: string | null): ResultatAccueilMinistere {
  const actif = ministereId !== null
  const id = ministereId ?? ''

  const semaine = useQuery({
    queryKey: ['eglise', 'semaine'],
    queryFn: lireSemaine,
    enabled: actif,
  })
  const indicateurs = useQuery({
    queryKey: [RACINE_SAISIE_CHIFFRES, 'indicateurs', id],
    queryFn: () => lireIndicateursASaisir(id),
    enabled: actif,
  })
  const mesuresDimanche = useQuery({
    queryKey: [RACINE_SAISIE_CHIFFRES, 'mesures', id, 'dimanche'],
    queryFn: () => lireMesuresPeriode(id, 'dimanche'),
    enabled: actif,
  })
  const mesuresMois = useQuery({
    queryKey: [RACINE_SAISIE_CHIFFRES, 'mesures', id, 'mois'],
    queryFn: () => lireMesuresPeriode(id, 'mois'),
    enabled: actif,
  })
  const sessions = useQuery({
    queryKey: ['eglise', 'sessions'],
    queryFn: lireSessionsPassees,
    enabled: actif,
  })
  const attendues = useQuery({
    queryKey: ['eglise', 'accueil', 'sessions-attendues', id],
    queryFn: () => lireSessionsAttendues(id),
    enabled: actif,
  })
  // Présences du ministère pour les seules sessions de la semaine où il est attendu.
  const lundi = semaine.data?.lundi
  const attendu = new Set(attendues.data ?? [])
  const idsSemaine =
    lundi === undefined
      ? []
      : (sessions.data ?? [])
          .filter((session) => attendu.has(session.session_id) && session.date >= lundi)
          .map((session) => session.session_id)
          .sort()
  const participations = useQuery({
    queryKey: ['eglise', 'accueil', 'mes-participations', id, ...idsSemaine],
    queryFn: () => lireMesParticipations(id, idsSemaine),
    enabled: actif && semaine.isSuccess && sessions.isSuccess && attendues.isSuccess,
  })
  const code = useQuery({
    queryKey: ['eglise', 'accueil', 'code', id],
    queryFn: () => lireCodeMinistere(id),
    enabled: actif,
  })
  const estFij = code.data === CODE_MINISTERE_FIJ
  const carte = useQuery({
    queryKey: ['eglise', 'carte-fij'],
    queryFn: lireCarteFij,
    enabled: actif && estFij,
  })
  const statistiques = useQuery({
    queryKey: CLE_STATISTIQUES_FIJ,
    queryFn: lireStatistiquesFij,
    enabled: actif && estFij,
  })
  const points = useQuery({
    queryKey: ['points', 'accueil', id],
    queryFn: () => lirePointsMinistere(id),
    enabled: actif,
  })
  const ministeres = useQuery({
    queryKey: ['ministeres', 'liste'],
    queryFn: lireMinisteres,
    enabled: actif,
  })

  const necessaires: UseQueryResult[] = [
    semaine,
    indicateurs,
    mesuresDimanche,
    mesuresMois,
    sessions,
    attendues,
    participations,
    code,
    ministeres,
  ]
  if (estFij) necessaires.push(carte, statistiques)
  const enEchec =
    necessaires.some((requete) => requete.isError) || (semaine.isSuccess && semaine.data === null)
  const pret = !enEchec && necessaires.every((requete) => requete.isSuccess)

  // Délai de 10 s par essai, comme useCetteSemaine : sans réponse, l'accueil passe en erreur.
  const [essai, setEssai] = useState(0)
  const [essaiEnDelai, setEssaiEnDelai] = useState<number | null>(null)
  const enAttente = actif && !pret && !enEchec
  if (!enAttente && essaiEnDelai !== null) setEssaiEnDelai(null)
  useEffect(() => {
    if (!enAttente) return
    const minuteur = setTimeout(() => setEssaiEnDelai(essai), DELAI_MAX_CHARGEMENT)
    return () => clearTimeout(minuteur)
  }, [enAttente, essai])

  if (!actif) return { etat: 'sans_objet' }

  const reessayer = () => {
    setEssai((precedent) => precedent + 1)
    // Comme la vue : une lecture en échec, ou sans réponse, est annulée et relancée ; les
    // réussies gardent leurs données. `v_semaine` sans ligne est relue aussi.
    for (const requete of [...necessaires, points]) {
      if (requete.isError || requete.isFetching || requete.data === null) {
        void requete.refetch({ cancelRefetch: true })
      }
    }
  }

  if (enEchec || essaiEnDelai === essai) return { etat: 'erreur', reessayer }
  if (!pret || !semaine.data || !indicateurs.data || !sessions.data || !ministeres.data) {
    return { etat: 'chargement' }
  }

  const jour = semaine.data
  const sessionsLues = sessions.data.map((session) => ({
    session_id: session.session_id,
    type: session.type,
    intitule: session.intitule,
    date: session.date,
  }))
  const vosSaisies = rangerVosSaisies({
    chiffres: lignesChiffres({
      semaine: { aujourdhui: jour.aujourdhui, dimanche: jour.dimanche },
      indicateurs: indicateurs.data,
      mesuresDimanche: mesuresDimanche.data ?? [],
      mesuresMois: mesuresMois.data ?? [],
    }),
    sessions: lignesSessions({
      semaine: { lundi: jour.lundi, aujourdhui: jour.aujourdhui },
      sessions: sessionsLues,
      attendues: attendues.data ?? [],
      mesParticipations: participations.data ?? [],
    }),
    // Lot E6, à sa fusion : `lignesReunion(reunion)` (lue par `lireProchaineReunion(id)`, clé
    // « reunions / prochaine / id ») et `lignesEvenements(evenements, id, noms)` (lus par
    // `lireEvenementsMinistere(id)`, clé « evenements / calendrier / id »). D'ici là, les
    // amorces de W0 ne rendent aucune ligne.
    reunion: lignesReunion(),
    fij: lignesFij({
      estFij,
      semaine: { aujourdhui: jour.aujourdhui, dimanche: jour.dimanche },
      carte: carte.data ?? [],
      statistiques: statistiques.data ?? [],
    }),
    evenements: lignesEvenements(),
  })

  const vosPoints: EtatBloc<PointFiche[]> = points.isError
    ? { etat: 'erreur', reessayer: () => void points.refetch() }
    : points.data
      ? {
          etat: 'donnees',
          donnees: construireVosPoints({
            ministereId: id,
            aujourdhui: jour.aujourdhui,
            points: points.data,
            ministeres: ministeres.data,
          }),
        }
      : { etat: 'chargement' }

  return {
    etat: 'pret',
    donnees: {
      ouverture: construireOuverture(vosSaisies, {
        semaine: { aujourdhui: jour.aujourdhui, dimanche: jour.dimanche, numero: jour.numero },
        sessions: sessionsLues,
        estFij,
      }),
      vosSaisies,
      vosPoints,
    },
  }
}
