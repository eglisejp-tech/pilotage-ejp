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
import type { EtatSimule, VueApercu } from '@/features/signalement/apercu/exemples'
import type { GestesEjpTech } from '@/features/signalement/LigneSignalementBloc'
import type { Masquage } from '@/features/moderation/schemas'
import { MESSAGES_BASE_SIGNALEMENT } from '@/features/signalement/textes'

/** Le bloc « Signalements » d'EJP Tech simulé : sa liste, ses gestes et « Masquer ». */
export interface BlocSimule {
  etat: EtatSimule
  gestes: GestesEjpTech
  masquer: (masquage: Masquage) => Promise<void>
}

/**
 * Le bloc « Signalements » de l'aperçu (T77), partagé par `/apercu/signalements` et
 * `/apercu/moderation` : prendre en charge, répondre, clore et masquer font passer la ligne dans
 * son nouveau groupe, comme la base ; une réponse avec « @ » ou un numéro est refusée avec le
 * message de la base. `envoi=echec` simule une connexion perdue à chaque geste, `envoi=deja` un
 * signalement déjà pris en charge par une autre personne.
 */
export function useBlocSimule(vue: VueApercu, envoi: string | null): BlocSimule {
  const [etat, setEtat] = useState(() => signalementsDuBloc(vue))

  const essayer = async (texte?: string) => {
    await attendre()
    if (envoi === 'echec') throw ECHEC_CONNEXION
    if (envoi === 'deja') throw refusDeLaBase(MESSAGES_BASE_SIGNALEMENT.dejaPrisEnCharge)
    if (texte !== undefined && refuseParLaBase(texte)) {
      throw refusDeLaBase(MESSAGES_BASE_SIGNALEMENT.donneesPersonnelles)
    }
  }

  return {
    etat,
    gestes: {
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
    },
    masquer: async (masquage) => {
      await attendre()
      if (envoi === 'echec') throw ECHEC_CONNEXION
      setEtat((avant) => masquerSimule(avant, masquage))
    },
  }
}
