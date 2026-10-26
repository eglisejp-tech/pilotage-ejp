import { useState } from 'react'
import {
  attendre,
  confirmerSimule,
  ECHEC_CONNEXION,
  mesSignalements,
  refusDeLaBase,
  refuseParLaBase,
  repondreAEjpTechSimule,
} from '@/features/signalement/apercu/exemples'
import type { VueApercu } from '@/features/signalement/apercu/exemples'
import { ContenuMesSignalements } from '@/features/signalement/ContenuMesSignalements'
import type { ContenuSuivi } from '@/features/signalement/ContenuMesSignalements'
import type { GestesMinistere } from '@/features/signalement/ArticleSignalement'
import { MESSAGES_BASE_SIGNALEMENT, TEXTES_SUIVI } from '@/features/signalement/textes'

interface Props {
  vue: VueApercu
  /** `envoi=echec` : connexion perdue ; `envoi=clos` : la date limite est passée entre-temps. */
  envoi: string | null
}

const reessayer = () => undefined

/**
 * « Mes signalements » de Coordination dans l'aperçu (T77) : la vraie page, avec des signalements
 * d'exemple. « Oui, c'est réglé » et « Répondre à EJP Tech » font passer le signalement dans son
 * nouveau groupe, comme la base ; une réponse avec « @ » ou un numéro est refusée avec le message
 * de la base.
 */
export function ApercuMesSignalements({ vue, envoi }: Props) {
  const [etat, setEtat] = useState(() => mesSignalements(vue))

  const refuser = async () => {
    await attendre()
    if (envoi === 'echec') throw ECHEC_CONNEXION
    if (envoi === 'clos') throw refusDeLaBase(MESSAGES_BASE_SIGNALEMENT.dejaClos)
  }
  const gestes: GestesMinistere = {
    confirmer: async (id) => {
      await refuser()
      setEtat((avant) => confirmerSimule(avant, id))
    },
    repondre: async ({ signalementId, texte }) => {
      await refuser()
      if (refuseParLaBase(texte)) {
        throw refusDeLaBase(MESSAGES_BASE_SIGNALEMENT.donneesPersonnelles)
      }
      setEtat((avant) => repondreAEjpTechSimule(avant, signalementId, texte))
    },
  }

  let contenu: ContenuSuivi
  if (vue === 'suivi-chargement') contenu = { etat: 'chargement' }
  else if (vue === 'suivi-probleme') contenu = { etat: 'probleme', reessayer }
  else contenu = { etat: 'liste', ...etat, gestes, relire: () => undefined }

  return <ContenuMesSignalements contenu={contenu} titre={TEXTES_SUIVI.titre} />
}
