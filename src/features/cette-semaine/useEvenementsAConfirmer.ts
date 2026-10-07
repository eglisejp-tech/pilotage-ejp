import { useQuery } from '@tanstack/react-query'
import { lireEvenementsAConfirmer } from '@/data/evenements'
import { lireMinisteres } from '@/data/ministeres'
import { construireAlerte } from '@/features/cette-semaine/construireAlerte'
import type { EtatAConfirmer } from '@/features/cette-semaine/EvenementsAConfirmer'

/**
 * Lit les événements à confirmer de l'église et les noms des ministères (clés stables : le cache
 * sert la grille, qu'elle soit en chargement ou affichée). Une lecture en échec donne « erreur ».
 */
export function useEvenementsAConfirmer(): EtatAConfirmer {
  const evenements = useQuery({
    queryKey: ['evenements', 'a-confirmer'],
    queryFn: lireEvenementsAConfirmer,
  })
  const ministeres = useQuery({ queryKey: ['ministeres', 'liste'], queryFn: lireMinisteres })
  const lectures = [evenements, ministeres]
  if (lectures.some((lecture) => lecture.isError) && !lectures.some((l) => l.isFetching)) {
    return {
      etat: 'erreur',
      reessayer: () => {
        for (const lecture of lectures) if (lecture.isError) void lecture.refetch()
      },
    }
  }
  if (!evenements.isSuccess || !ministeres.isSuccess) return { etat: 'chargement' }
  return { etat: 'donnees', lignes: construireAlerte(evenements.data, ministeres.data) }
}
