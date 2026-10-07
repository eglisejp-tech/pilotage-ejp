import { useQuery } from '@tanstack/react-query'
import { lireSemaine } from '@/data/eglise'
import { lireTableauMinisteres } from '@/data/ministeres'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import { construireListeMinisteres } from '@/features/ministeres/construireListe'
import type { LigneListeMinistere } from '@/features/ministeres/construireListe'

/**
 * Lit la liste des ministères (`v_tableau_ministeres`, ministères actifs) et le jour de Paris
 * (`v_semaine`), mêmes clés que la vue de l'église : la liste s'affiche sans relire si l'accueil
 * vient d'être ouvert.
 */
export function useListeMinisteres(): EtatBloc<LigneListeMinistere[]> {
  const semaine = useQuery({ queryKey: ['eglise', 'semaine'], queryFn: lireSemaine })
  const tableau = useQuery({ queryKey: ['ministeres', 'tableau'], queryFn: lireTableauMinisteres })
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
  if (!semaine.isSuccess || !tableau.isSuccess || semaine.data === null) {
    return { etat: 'chargement' }
  }
  return {
    etat: 'donnees',
    donnees: construireListeMinisteres(tableau.data, semaine.data.aujourdhui),
  }
}
