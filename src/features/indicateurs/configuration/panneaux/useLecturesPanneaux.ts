import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { FiltreTermes } from '@/data/indicateursEcriture'
import { compacter } from '@/data/indicateursEcriture'
import { CLES_CONFIGURATION } from '@/features/indicateurs/configuration/cles'
import type { EcrituresIndicateurs } from '@/features/indicateurs/configuration/panneaux/ecritures'
import type { NatureIndicateur, VerificationLibelle } from '@/lib/base'
import { longueurEnCaracteres } from '@/lib/metier/texte'

/** Délai après la dernière touche avant de demander les contrôles à la base (6.2). */
export const DELAI_CONTROLE_MS = 400

/**
 * Contrôles d'un libellé pendant la frappe (`verifier_libelle`), 400 ms après la dernière touche :
 * ce que la base refuserait (données personnelles, crochets, calcul, période, domaine sensible) et
 * le doublon. Rend la dernière réponse connue pendant que la suivante arrive : la liste ne saute
 * pas à chaque touche. Une erreur de lecture ne dit rien : la base répond de toute façon à l'envoi.
 */
export function useVerificationLibelle(
  ecritures: EcrituresIndicateurs,
  ministereId: string,
  libelle: string,
  nature: NatureIndicateur | '',
): VerificationLibelle[] {
  const compact = compacter(libelle)
  const [differe, setDiffere] = useState(compact)
  useEffect(() => {
    const minuterie = window.setTimeout(() => setDiffere(compact), DELAI_CONTROLE_MS)
    return () => window.clearTimeout(minuterie)
  }, [compact])
  // Sans rythme choisi, la base reçoit « mois » : seule la famille « cumul » dépend du rythme, et
  // elle se rejoue dès que le rythme change.
  const rythme: NatureIndicateur = nature === '' ? 'mois' : nature
  const requete = useQuery({
    queryKey: [...CLES_CONFIGURATION.racine, 'verification', ministereId, rythme, differe],
    queryFn: () => ecritures.verifier(differe, rythme, ministereId),
    enabled: longueurEnCaracteres(differe) >= 2,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 30_000,
  })
  return longueurEnCaracteres(differe) >= 2 ? (requete.data ?? []) : []
}

/** Limites de la fiche (`limites_indicateurs`), relues à l'ouverture de chaque panneau. */
export function useLimites(ecritures: EcrituresIndicateurs, ministereId: string) {
  return useQuery({
    queryKey: [...CLES_CONFIGURATION.racine, 'limites', ministereId],
    queryFn: () => ecritures.limites(ministereId),
    retry: false,
    gcTime: 0,
  })
}

/** Termes d'un calcul, ou calculs qui dépendent d'un indicateur : lus quand le panneau s'ouvre. */
export function useTermes(ecritures: EcrituresIndicateurs, filtre: FiltreTermes, actif = true) {
  const cle = 'calculId' in filtre ? ['calcul', filtre.calculId] : ['source', filtre.sourceId]
  return useQuery({
    queryKey: [...CLES_CONFIGURATION.racine, 'termes', ...cle],
    queryFn: () => ecritures.termes(filtre),
    enabled: actif,
    retry: false,
    gcTime: 0,
  })
}
