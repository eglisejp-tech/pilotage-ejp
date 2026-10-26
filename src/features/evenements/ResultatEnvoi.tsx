import type { Refus } from '@/features/evenements/refus'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { MessageReussite } from '@/features/saisie/MessageReussite'

interface Props {
  /** Refus à dire sous le bouton (un refus de date se dit sous le champ date). */
  refus: Refus | null
  /** Message de réussite du dernier envoi, ou null. */
  reussite: string | null
  /** Numéro de l'envoi réussi : deux envois de suite affichent chacun leur message. */
  envoi: number
}

/**
 * Sous le bouton d'enregistrement : l'échec de l'envoi (refus traduit, sans lien, ou phrase de
 * connexion avec sa référence, T76 ; valeurs gardées), ou le message de réussite pendant 6 secondes
 * (`role="status"`, toujours présent pour être annoncé).
 */
export function ResultatEnvoi({ refus, reussite, envoi }: Props) {
  return (
    <>
      {refus?.ou === 'bouton' ? (
        <ErreurFormulaire message={refus.message} reference={refus.reference} />
      ) : null}
      <MessageReussite message={reussite} envoi={envoi} />
    </>
  )
}
