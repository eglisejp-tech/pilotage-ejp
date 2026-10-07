import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  lireChangementsConfiguration,
  lireCreationsPrevus,
  lireIndicateursPropres,
  lireMinisteresConfiguration,
  lireUsageConfiguration,
} from '@/data/indicateursConfiguration'
import { lireCatalogue } from '@/data/indicateurs'
import { CLES_CONFIGURATION } from '@/features/indicateurs/configuration/cles'
import {
  construireConfiguration,
  construireMinistere,
} from '@/features/indicateurs/configuration/construire'
import type {
  ConfigurationIndicateurs,
  ConfigurationMinistere,
  LecturesConfiguration,
} from '@/features/indicateurs/configuration/construire'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import type { TypeCompte } from '@/lib/base'

/**
 * Les six lectures des deux écrans de configuration (ministères, indicateurs propres, usage,
 * catalogue, créations de prévus, gestes du journal). Les deux écrans partagent les mêmes clés :
 * de `/indicateurs` à `/indicateurs/:id`, rien n'est relu. `activer` à faux : aucune requête (un
 * profil qui n'a pas la page ne lit rien).
 */
function useLectures(activer: boolean): EtatBloc<LecturesConfiguration> {
  const ministeres = useQuery({
    queryKey: CLES_CONFIGURATION.ministeres,
    queryFn: lireMinisteresConfiguration,
    enabled: activer,
  })
  const indicateurs = useQuery({
    queryKey: CLES_CONFIGURATION.indicateurs,
    queryFn: lireIndicateursPropres,
    enabled: activer,
  })
  const usage = useQuery({
    queryKey: CLES_CONFIGURATION.usage,
    queryFn: lireUsageConfiguration,
    enabled: activer,
  })
  const catalogue = useQuery({
    queryKey: CLES_CONFIGURATION.catalogue,
    queryFn: lireCatalogue,
    enabled: activer,
  })
  const creations = useQuery({
    queryKey: CLES_CONFIGURATION.creations,
    queryFn: lireCreationsPrevus,
    enabled: activer,
  })
  const changements = useQuery({
    queryKey: CLES_CONFIGURATION.changements,
    queryFn: lireChangementsConfiguration,
    enabled: activer,
  })
  const requetes = [ministeres, indicateurs, usage, catalogue, creations, changements]
  const echec = requetes.some((requete) => requete.isError)
  return useMemo((): EtatBloc<LecturesConfiguration> => {
    if (echec) {
      return {
        etat: 'erreur',
        reessayer: () => {
          for (const requete of requetes) if (requete.isError) void requete.refetch()
        },
      }
    }
    if (
      ministeres.data === undefined ||
      indicateurs.data === undefined ||
      usage.data === undefined ||
      catalogue.data === undefined ||
      creations.data === undefined ||
      changements.data === undefined
    ) {
      return { etat: 'chargement' }
    }
    return {
      etat: 'donnees',
      donnees: {
        ministeres: ministeres.data,
        indicateurs: indicateurs.data,
        usage: usage.data,
        catalogue: catalogue.data,
        creations: creations.data,
        changements: changements.data,
      },
    }
    // Les requêtes TanStack changent de référence à chaque rendu : seules leurs données comptent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    echec,
    ministeres.data,
    indicateurs.data,
    usage.data,
    catalogue.data,
    creations.data,
    changements.data,
  ])
}

/** `/indicateurs` : phrases et tableau des ministères. */
export function useConfigurationIndicateurs(
  profil: TypeCompte,
  activer = true,
): EtatBloc<ConfigurationIndicateurs> {
  const lectures = useLectures(activer)
  return useMemo((): EtatBloc<ConfigurationIndicateurs> => {
    if (lectures.etat !== 'donnees') return lectures
    return { etat: 'donnees', donnees: construireConfiguration(lectures.donnees, profil) }
  }, [lectures, profil])
}

export type ResultatConfigurationMinistere =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  /** Ministère inconnu ou désactivé. */
  | { etat: 'introuvable' }
  | { etat: 'pret'; donnees: ConfigurationMinistere }

/** `/indicateurs/:id` : l'écran d'un ministère. */
export function useConfigurationMinistere(
  ministereId: string,
  activer = true,
): ResultatConfigurationMinistere {
  const lectures = useLectures(activer)
  return useMemo((): ResultatConfigurationMinistere => {
    if (lectures.etat !== 'donnees') return lectures
    const donnees = construireMinistere(ministereId, lectures.donnees)
    return donnees === null ? { etat: 'introuvable' } : { etat: 'pret', donnees }
  }, [lectures, ministereId])
}
