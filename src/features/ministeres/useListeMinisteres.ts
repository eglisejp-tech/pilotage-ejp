import { useQuery } from '@tanstack/react-query'
import { lireSemaine } from '@/data/eglise'
import { lireListesChoisies } from '@/data/indicateursConfiguration'
import { lireTableauMinisteres } from '@/data/ministeres'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import { CLES_CONFIGURATION } from '@/features/indicateurs/configuration/cles'
import {
  construireListeMinisteres,
  ministeresSansListe,
} from '@/features/ministeres/construireListe'
import type { LigneListeMinistere } from '@/features/ministeres/construireListe'

/**
 * Lit la liste des ministères (`v_tableau_ministeres`, ministères actifs) et le jour de Paris
 * (`v_semaine`), mêmes clés que la vue de l'église : la liste s'affiche sans relire si l'accueil
 * vient d'être ouvert. `gestion` (EJP Tech, T72) : lit aussi la liste choisie de chaque ministère
 * (`v_ministere_modele`, même clé que l'écran Indicateurs) pour le repère « Prévus : à choisir ».
 * Si cette lecture échoue, la liste s'affiche sans repère : il ne bloque pas l'écran.
 */
export function useListeMinisteres(gestion = false): EtatBloc<LigneListeMinistere[]> {
  const semaine = useQuery({ queryKey: ['eglise', 'semaine'], queryFn: lireSemaine })
  const tableau = useQuery({ queryKey: ['ministeres', 'tableau'], queryFn: lireTableauMinisteres })
  const liens = useQuery({
    queryKey: CLES_CONFIGURATION.liens,
    queryFn: lireListesChoisies,
    enabled: gestion,
  })
  const echec = semaine.isError || tableau.isError || (semaine.isSuccess && semaine.data === null)
  if (echec) {
    return {
      etat: 'erreur',
      reessayer: () => {
        void semaine.refetch()
        void tableau.refetch()
      },
    }
  }
  if (
    !semaine.isSuccess ||
    !tableau.isSuccess ||
    semaine.data === null ||
    (gestion && liens.isPending)
  ) {
    return { etat: 'chargement' }
  }
  const sansListe =
    gestion && liens.isSuccess ? ministeresSansListe(liens.data, tableau.data) : new Set<string>()
  return {
    etat: 'donnees',
    donnees: construireListeMinisteres(tableau.data, semaine.data.aujourdhui, sansListe),
  }
}
