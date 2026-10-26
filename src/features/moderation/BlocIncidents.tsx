import { useInfiniteQuery } from '@tanstack/react-query'
import { lireIncidentsRecents } from '@/data/incidents'
import { ListeIncidents } from '@/features/moderation/ListeIncidents'
import type { ContenuIncidents } from '@/features/moderation/ListeIncidents'

/** Taille d'une page de `incidents_recents`. */
const PAGE = 50

/**
 * Les incidents d'envoi, lus par EJP Tech (`incidents_recents`, 50 à la fois, du plus récent au
 * plus ancien ; la page suivante part de l'heure de réception du plus ancien déjà lu).
 */
export function BlocIncidents() {
  const lecture = useInfiniteQuery({
    queryKey: ['moderation', 'incidents'],
    queryFn: ({ pageParam }) => lireIncidentsRecents(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (derniere) =>
      derniere.length === PAGE ? derniere[derniere.length - 1]?.recu_le : undefined,
  })
  let contenu: ContenuIncidents
  if (lecture.data) {
    const lignes = lecture.data.pages.flat()
    contenu = {
      etat: 'liste',
      lignes,
      total: lignes[0]?.total ?? 0,
      plus: lecture.hasNextPage ? () => void lecture.fetchNextPage() : null,
      plusEnCours: lecture.isFetchingNextPage,
    }
  } else if (lecture.isError) {
    contenu = { etat: 'probleme', reessayer: () => void lecture.refetch() }
  } else {
    contenu = { etat: 'chargement' }
  }
  return <ListeIncidents contenu={contenu} />
}
