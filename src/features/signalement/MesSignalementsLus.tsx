import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  confirmerSignalement,
  lireMesSignalements,
  lireSuiviDesSignalements,
  repondreAEjpTech,
} from '@/data/signalements'
import { enEchec } from '@/features/evenements/lectures'
import { ContenuMesSignalements } from '@/features/signalement/ContenuMesSignalements'
import type { ContenuSuivi } from '@/features/signalement/ContenuMesSignalements'
import type { GestesMinistere } from '@/features/signalement/ArticleSignalement'
import { useRelireApresGeste } from '@/features/signalement/useRelireApresGeste'

interface Props {
  ministereId: string
  titre: string
}

/**
 * Lectures et gestes de « Mes signalements » (T77), sous la RLS du ministère : ses signalements
 * (`v_signalement`, ouverts et clos des 30 derniers jours), puis leurs lignes de suivi. Un geste
 * passe par sa fonction de la base, puis la liste est relue avant d'annoncer la réussite.
 */
export function MesSignalementsLus({ ministereId, titre }: Props) {
  const relire = useRelireApresGeste()
  const lecture = useQuery({
    queryKey: ['signalements', 'miens', ministereId],
    queryFn: () => lireMesSignalements(ministereId),
  })
  const ids = (lecture.data ?? []).map((ligne) => ligne.id)
  const suivi = useQuery({
    queryKey: ['signalements', 'suivi', ...ids],
    queryFn: () => lireSuiviDesSignalements(ids),
    enabled: lecture.isSuccess,
    // Un signalement de plus dans la liste ne fait pas revenir le chargement.
    placeholderData: keepPreviousData,
  })

  const gestes: GestesMinistere = {
    confirmer: async (id) => {
      await confirmerSignalement(id)
      await relire()
    },
    repondre: async (reponse) => {
      await repondreAEjpTech(reponse)
      await relire()
    },
  }
  const reessayer = () => {
    void lecture.refetch()
    if (lecture.isSuccess) void suivi.refetch()
  }

  let contenu: ContenuSuivi
  if (lecture.data && suivi.data) {
    contenu = {
      etat: 'liste',
      signalements: lecture.data,
      suivi: suivi.data,
      gestes,
      relire: () => void relire(),
    }
  } else if (enEchec([lecture, suivi])) {
    contenu = { etat: 'probleme', reessayer }
  } else {
    contenu = { etat: 'chargement' }
  }
  return <ContenuMesSignalements contenu={contenu} titre={titre} />
}
