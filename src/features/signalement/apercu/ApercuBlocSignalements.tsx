import { useState } from 'react'
import {
  attendre,
  clore,
  ECHEC_CONNEXION,
  refusDeLaBase,
  refuseParLaBase,
  signalementsDuBloc,
} from '@/features/signalement/apercu/exemples'
import type { VueApercu } from '@/features/signalement/apercu/exemples'
import { ContenuBlocSignalements } from '@/features/signalement/ContenuBlocSignalements'
import type { ContenuBloc } from '@/features/signalement/ContenuBlocSignalements'
import { EcranModeration } from '@/features/signalement/EcranModeration'
import type { Cloture } from '@/features/signalement/schemas'
import { MESSAGES_BASE_SIGNALEMENT } from '@/features/signalement/textes'

interface Props {
  vue: VueApercu
  /** `envoi=echec` : la clôture échoue comme une connexion perdue. */
  echec: boolean
}

const reessayer = () => undefined

/**
 * L'écran `/moderation` d'EJP Tech dans l'aperçu : le vrai bloc « Signalements », avec des
 * signalements d'exemple. Une clôture simulée fait passer la ligne dans les clos, comme la base ;
 * un commentaire avec « @ » est refusé avec le message de la base.
 */
export function ApercuBlocSignalements({ vue, echec }: Props) {
  const [signalements, setSignalements] = useState(() => signalementsDuBloc(vue))

  const cloturer = async ({ signalementId, commentaire }: Cloture) => {
    await attendre()
    if (echec) throw ECHEC_CONNEXION
    if (commentaire !== null && refuseParLaBase(commentaire)) {
      throw refusDeLaBase(MESSAGES_BASE_SIGNALEMENT.donneesPersonnelles)
    }
    const ligne = signalements.find((signalement) => signalement.id === signalementId)
    if (!ligne?.ouvert) throw refusDeLaBase(MESSAGES_BASE_SIGNALEMENT.dejaClos)
    setSignalements((avant) =>
      avant.map((signalement) =>
        signalement.id === signalementId ? clore(signalement, commentaire) : signalement,
      ),
    )
  }

  let contenu: ContenuBloc
  if (vue === 'bloc-chargement') contenu = { etat: 'chargement' }
  else if (vue === 'bloc-probleme') contenu = { etat: 'probleme', reessayer }
  else contenu = { etat: 'liste', signalements, cloturer, relire: () => undefined }

  return (
    <EcranModeration titre="Modération">
      <ContenuBlocSignalements contenu={contenu} />
    </EcranModeration>
  )
}
