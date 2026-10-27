import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  lireCarteFij,
  lireIndicateursCommuns,
  lireSemaine,
  lireTotauxDimanche,
  lireTotauxSessionsPassees,
} from '@/data/eglise'
import { lireMesuresCommunsMinistere } from '@/data/fiche'
import { CODE_MINISTERE_FIJ, lireCodeMinistere, lireStatistiquesFij } from '@/data/fij'
import { lireCommunsFiche, lireSuiviIndicateurs } from '@/data/indicateurs'
import { lireMesParticipations, lireSessionsAttendues } from '@/data/participations'
import { lireMesSignalementsOuverts } from '@/data/signalements'
import {
  CLE_SESSIONS_TOTAUX,
  cleMesParticipations,
  useAccueilMinistere,
} from '@/features/accueil-ministere/useAccueilMinistere'
import { DELAI_MAX_CHARGEMENT } from '@/features/cette-semaine/useCetteSemaine'
import { CLE_STATISTIQUES_FIJ } from '@/features/saisie-fij/useSaisiesFij'
import { suiviDeLaSemaine } from '@/features/signalement/suivi'
import { libellePeriode } from '@/lib/metier/semaine'
import {
  construireChiffres,
  construireDansLEglise,
  construireFij,
  sessionsALire,
  versSessionLue,
} from './construireMaSemaine'
import type { LecturesMaSemaine, SessionLue } from './construireMaSemaine'
import type { DonneesMaSemaine } from './types'

export type ResultatMaSemaine =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  | { etat: 'pret'; donnees: DonneesMaSemaine }

/**
 * Lit « Ma semaine » d'un ministère : l'accueil de 07 (`useAccueilMinistere` : « Vos saisies » et
 * « Vos points »), puis ce que le ministère lit déjà pour ses chiffres : ses mesures, son suivi,
 * ses présences aux sessions de la semaine (et à la session précédente de chaque type, pour
 * l'écart), deux totaux de l'église, et sa carte FIJ s'il est FIJ. Aucune des lectures propres au
 * berger n'est faite (tableau des ministères, apports de chaque ministère, écarts, totaux « à ce
 * jour », pourcentage de l'église, points ouverts de l'église). Les sessions passées sont lues sans
 * la colonne `manquants` : le navigateur du ministère ne reçoit le nom d'aucun autre ministère. Les
 * autres lectures (semaine, indicateurs communs, totaux du dimanche, carte FIJ) ne portent aucun
 * nom. Toutes les clés sont sous `eglise` (une saisie les relit) ; celles de l'accueil sont
 * partagées, rien n'est lu deux fois. Sans réponse au bout de 10 s, ou lecture en échec :
 * « Réessayer ». Aucune date du navigateur : le jour de Paris vient de `v_semaine`. Le suivi
 * des signalements (T77, ses ouverts) se lit avec le reste, pour que le bandeau ou la ligne
 * arrivent avec la page, sans saut ; si cette lecture échoue (ou tarde au-delà de 10 s), la page
 * s'affiche sans bandeau ni ligne.
 */
export function useMaSemaine(ministereId: string): ResultatMaSemaine {
  const accueil = useAccueilMinistere(ministereId)
  const semaine = useQuery({ queryKey: ['eglise', 'semaine'], queryFn: lireSemaine })
  const communs = useQuery({ queryKey: ['eglise', 'indicateurs'], queryFn: lireIndicateursCommuns })
  const idsCommuns = (communs.data ?? []).map((commun) => commun.id)
  const libellesCommuns = useQuery({
    queryKey: ['eglise', 'ma-semaine', 'libelles-communs', ministereId],
    queryFn: () => lireCommunsFiche(ministereId),
  })
  const mesuresCommuns = useQuery({
    queryKey: ['eglise', 'ma-semaine', 'mesures-communs', ministereId, ...idsCommuns],
    queryFn: () => lireMesuresCommunsMinistere(ministereId, idsCommuns),
    enabled: communs.isSuccess,
  })
  const suivi = useQuery({
    queryKey: ['eglise', 'ma-semaine', 'suivi', ministereId],
    queryFn: () => lireSuiviIndicateurs(ministereId),
  })
  // Mêmes clés que l'accueil du ministère : la lecture est partagée.
  const sessions = useQuery({ queryKey: CLE_SESSIONS_TOTAUX, queryFn: lireTotauxSessionsPassees })
  const attendues = useQuery({
    queryKey: ['eglise', 'accueil', 'sessions-attendues', ministereId],
    queryFn: () => lireSessionsAttendues(ministereId),
  })
  const code = useQuery({
    queryKey: ['eglise', 'accueil', 'code', ministereId],
    queryFn: () => lireCodeMinistere(ministereId),
  })
  const totauxDimanche = useQuery({
    queryKey: ['eglise', 'totaux-dimanche'],
    queryFn: lireTotauxDimanche,
  })
  const estFij = code.data === CODE_MINISTERE_FIJ
  const carte = useQuery({
    queryKey: ['eglise', 'carte-fij'],
    queryFn: lireCarteFij,
    enabled: estFij,
  })
  const statistiques = useQuery({
    queryKey: CLE_STATISTIQUES_FIJ,
    queryFn: lireStatistiquesFij,
    enabled: estFij,
  })
  const signalements = useQuery({
    queryKey: ['signalements', 'ouverts', ministereId],
    queryFn: () => lireMesSignalementsOuverts(ministereId),
  })

  const sessionsLues: SessionLue[] = (sessions.data ?? []).map(versSessionLue)
  const idsSessions =
    semaine.data && sessions.data && attendues.data
      ? sessionsALire({
          semaine: semaine.data,
          sessions: sessionsLues,
          attendues: attendues.data,
        })
      : []
  const participations = useQuery({
    // Même clé que l'accueil : une seule lecture des présences.
    queryKey: cleMesParticipations(ministereId, idsSessions),
    queryFn: () => lireMesParticipations(ministereId, idsSessions),
    enabled: semaine.isSuccess && sessions.isSuccess && attendues.isSuccess,
  })

  const necessaires: UseQueryResult[] = [
    semaine,
    communs,
    libellesCommuns,
    mesuresCommuns,
    suivi,
    sessions,
    attendues,
    code,
    totauxDimanche,
    participations,
  ]
  if (estFij) necessaires.push(carte, statistiques)
  const enEchec =
    necessaires.some((requete) => requete.isError) || (semaine.isSuccess && semaine.data === null)
  const pretSansSuivi = !enEchec && necessaires.every((requete) => requete.isSuccess)
  // Le suivi des signalements n'empêche jamais la page : réussi ou en échec, il est réglé.
  const suiviRegle = signalements.isSuccess || signalements.isError
  const pret = pretSansSuivi && suiviRegle

  // 10 s par essai, comme l'accueil : sans réponse, la page passe en erreur.
  const [essai, setEssai] = useState(0)
  const [essaiEnDelai, setEssaiEnDelai] = useState<number | null>(null)
  const enAttente = !pret && !enEchec
  if (!enAttente && essaiEnDelai !== null) setEssaiEnDelai(null)
  useEffect(() => {
    if (!enAttente) return
    const minuteur = setTimeout(() => setEssaiEnDelai(essai), DELAI_MAX_CHARGEMENT)
    return () => clearTimeout(minuteur)
  }, [enAttente, essai])

  const reessayer = () => {
    setEssai((precedent) => precedent + 1)
    if (accueil.etat === 'erreur') accueil.reessayer()
    for (const requete of [...necessaires, signalements]) {
      if (requete.isError || requete.isFetching || requete.data === null) {
        void requete.refetch({ cancelRefetch: true })
      }
    }
  }

  // 10 s dépassées alors que seul le suivi des signalements manque : la page, sans lui.
  const sansSuivi = essaiEnDelai === essai && pretSansSuivi && !suiviRegle
  if (accueil.etat === 'erreur' || enEchec || (essaiEnDelai === essai && !sansSuivi)) {
    return { etat: 'erreur', reessayer }
  }
  if (
    accueil.etat !== 'pret' ||
    !(pret || sansSuivi) ||
    !semaine.data ||
    !communs.data ||
    !libellesCommuns.data ||
    !mesuresCommuns.data ||
    !suivi.data ||
    !attendues.data ||
    !totauxDimanche.data ||
    !participations.data
  ) {
    return { etat: 'chargement' }
  }

  const lectures: LecturesMaSemaine = {
    ministereId,
    semaine: semaine.data,
    estFij,
    communs: communs.data,
    libellesCommuns: libellesCommuns.data,
    mesuresCommuns: mesuresCommuns.data,
    suivi: suivi.data,
    sessions: sessionsLues,
    attendues: attendues.data,
    mesParticipations: participations.data,
    totauxDimanche: totauxDimanche.data,
    carte: carte.data ?? [],
    statistiques: statistiques.data ?? [],
  }
  return {
    etat: 'pret',
    donnees: {
      accueil: accueil.donnees,
      semaine: {
        numero: semaine.data.numero,
        periode: libellePeriode(semaine.data.lundi, semaine.data.dimanche),
      },
      chiffres: construireChiffres(lectures),
      fij: construireFij(lectures),
      eglise: construireDansLEglise(lectures),
      signalements: signalements.data ? suiviDeLaSemaine(signalements.data) : null,
    },
  }
}
