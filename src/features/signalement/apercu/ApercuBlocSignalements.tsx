import type { VueApercu } from '@/features/signalement/apercu/exemples'
import { useBlocSimule } from '@/features/signalement/apercu/useBlocSimule'
import { ContenuBlocSignalements } from '@/features/signalement/ContenuBlocSignalements'
import type { ContenuBloc } from '@/features/signalement/ContenuBlocSignalements'
import { EcranModeration } from '@/features/moderation/EcranModeration'

interface Props {
  vue: VueApercu
  /** `envoi=echec` : connexion perdue ; `envoi=deja` : déjà pris en charge par une autre personne. */
  envoi: string | null
}

const reessayer = () => undefined

/**
 * L'écran `/moderation` d'EJP Tech dans l'aperçu : le vrai bloc « Signalements » (T77), avec des
 * signalements d'exemple et des gestes simulés comme la base (`useBlocSimule`).
 */
export function ApercuBlocSignalements({ vue, envoi }: Props) {
  const { etat, gestes, masquer } = useBlocSimule(vue, envoi)

  let contenu: ContenuBloc
  if (vue === 'bloc-chargement') contenu = { etat: 'chargement' }
  else if (vue === 'bloc-probleme') contenu = { etat: 'probleme', reessayer }
  else contenu = { etat: 'liste', ...etat, gestes, relire: () => undefined, masquer }

  return (
    <EcranModeration
      titre="Modération"
      signalements={<ContenuBlocSignalements contenu={contenu} />}
    />
  )
}
