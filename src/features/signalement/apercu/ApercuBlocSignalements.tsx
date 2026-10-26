import { useState } from 'react'
import {
  attendre,
  cloreSimule,
  ECHEC_CONNEXION,
  masquerSimule,
  prendreSimule,
  refusDeLaBase,
  refuseParLaBase,
  repondreAuMinistereSimule,
  signalementsDuBloc,
} from '@/features/signalement/apercu/exemples'
import type { VueApercu } from '@/features/signalement/apercu/exemples'
import { ContenuBlocSignalements } from '@/features/signalement/ContenuBlocSignalements'
import type { ContenuBloc } from '@/features/signalement/ContenuBlocSignalements'
import type { GestesEjpTech } from '@/features/signalement/LigneSignalementBloc'
import { EcranModeration } from '@/features/moderation/EcranModeration'
import { MESSAGES_BASE_SIGNALEMENT } from '@/features/signalement/textes'

interface Props {
  vue: VueApercu
  /** `envoi=echec` : connexion perdue ; `envoi=deja` : déjà pris en charge par une autre personne. */
  envoi: string | null
}

const reessayer = () => undefined

/**
 * L'écran `/moderation` d'EJP Tech dans l'aperçu : le vrai bloc « Signalements » (T77), avec des
 * signalements d'exemple. Prendre en charge, répondre, clore et masquer font passer la ligne
 * dans son nouveau groupe, comme la base ; une réponse avec « @ » ou un numéro est refusée avec le
 * message de la base.
 */
export function ApercuBlocSignalements({ vue, envoi }: Props) {
  const [etat, setEtat] = useState(() => signalementsDuBloc(vue))

  const essayer = async (texte?: string) => {
    await attendre()
    if (envoi === 'echec') throw ECHEC_CONNEXION
    if (envoi === 'deja') throw refusDeLaBase(MESSAGES_BASE_SIGNALEMENT.dejaPrisEnCharge)
    if (texte !== undefined && refuseParLaBase(texte)) {
      throw refusDeLaBase(MESSAGES_BASE_SIGNALEMENT.donneesPersonnelles)
    }
  }
  const gestes: GestesEjpTech = {
    prendre: async (id) => {
      await essayer()
      setEtat((avant) => prendreSimule(avant, id))
    },
    repondre: async ({ signalementId, texte }) => {
      await essayer(texte)
      setEtat((avant) => repondreAuMinistereSimule(avant, signalementId, texte))
    },
    clore: async ({ signalementId, commentaire }) => {
      await essayer(commentaire)
      setEtat((avant) => cloreSimule(avant, signalementId, commentaire))
    },
  }

  let contenu: ContenuBloc
  if (vue === 'bloc-chargement') contenu = { etat: 'chargement' }
  else if (vue === 'bloc-probleme') contenu = { etat: 'probleme', reessayer }
  else
    contenu = {
      etat: 'liste',
      ...etat,
      gestes,
      relire: () => undefined,
      masquer: async (masquage) => {
        await attendre()
        setEtat((avant) => masquerSimule(avant, masquage))
      },
    }

  return (
    <EcranModeration
      titre="Modération"
      signalements={<ContenuBlocSignalements contenu={contenu} />}
    />
  )
}
