import { useQuery } from '@tanstack/react-query'
import { lireEvenementsMinistere, lireMentionsDesEvenements } from '@/data/evenements'
import { lireMinisteres } from '@/data/ministeres'
import { construireCalendrier } from '@/features/fiche/construireCalendrier'
import type { EtatCalendrier } from '@/features/fiche/VueCalendrier'
import type { TypeCompte } from '@/lib/base'

/**
 * Lit le calendrier du ministère (`src/data/evenements.ts` : les événements, leurs mentions, puis
 * les noms des ministères) et le construit. Une lecture en échec, sans nouvel essai en cours,
 * donne l'état « erreur » avec son « Réessayer » ; la fiche, elle, reste affichée.
 */
export function useCalendrierMinistere(ministereId: string, profil: TypeCompte): EtatCalendrier {
  const evenements = useQuery({
    queryKey: ['evenements', 'calendrier', ministereId],
    queryFn: () => lireEvenementsMinistere(ministereId),
  })
  const idsEvenements = (evenements.data ?? []).map((evenement) => evenement.id)
  const mentions = useQuery({
    queryKey: ['evenements', 'mentions', ministereId, ...idsEvenements],
    queryFn: () => lireMentionsDesEvenements(idsEvenements),
    enabled: evenements.isSuccess,
  })
  const ministeres = useQuery({ queryKey: ['ministeres', 'liste'], queryFn: lireMinisteres })

  const lectures = [evenements, mentions, ministeres]
  if (lectures.some((lecture) => lecture.isError) && !lectures.some((l) => l.isFetching)) {
    return {
      etat: 'erreur',
      reessayer: () => {
        for (const lecture of lectures) if (lecture.isError) void lecture.refetch()
      },
    }
  }
  if (!evenements.isSuccess || !mentions.isSuccess || !ministeres.isSuccess) {
    return { etat: 'chargement' }
  }
  return {
    etat: 'donnees',
    lignes: construireCalendrier(
      { evenements: evenements.data, mentions: mentions.data, ministeres: ministeres.data },
      { ministereId, profil },
    ),
  }
}
