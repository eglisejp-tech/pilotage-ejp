import { useQuery } from '@tanstack/react-query'
import { cloreSignalement, lireSignalementsATraiter } from '@/data/signalements'
import { enEchec } from '@/features/evenements/lectures'
import { useApresEcriture } from '@/features/evenements/useApresEcriture'
import { ContenuBlocSignalements } from '@/features/signalement/ContenuBlocSignalements'
import type { ContenuBloc } from '@/features/signalement/ContenuBlocSignalements'
import type { Cloture } from '@/features/signalement/schemas'

/** Clé de la lecture du bloc, relue après chaque clôture. */
const CLE_SIGNALEMENTS_A_TRAITER = ['signalements', 'a-traiter'] as const

/**
 * Lecture du bloc « Signalements » pour EJP Tech : `v_signalement`, ouverts et clos des 30
 * derniers jours (filtres de la base). Une clôture passe par `clore_signalement`, puis la liste
 * est relue.
 */
export function BlocSignalementsLu() {
  const apresEcriture = useApresEcriture()
  const lecture = useQuery({
    queryKey: CLE_SIGNALEMENTS_A_TRAITER,
    queryFn: lireSignalementsATraiter,
  })

  const cloturer = async (cloture: Cloture) => {
    await cloreSignalement(cloture)
    apresEcriture()
  }

  let contenu: ContenuBloc
  if (lecture.data) {
    contenu = {
      etat: 'liste',
      signalements: lecture.data,
      cloturer,
      relire: () => void lecture.refetch(),
    }
  } else if (enEchec([lecture])) {
    contenu = { etat: 'probleme', reessayer: () => void lecture.refetch() }
  } else {
    contenu = { etat: 'chargement' }
  }
  return <ContenuBlocSignalements contenu={contenu} />
}
