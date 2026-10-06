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
 * Sous le bouton d'enregistrement : l'erreur de formulaire (connexion, valeurs gardées), le refus
 * de la base tel quel (« Rien n'a changé : ... », sans lien), ou le message de réussite pendant
 * 6 secondes (`role="status"`, toujours présent pour être annoncé).
 */
export function ResultatEnvoi({ refus, reussite, envoi }: Props) {
  return (
    <>
      {refus?.ou === 'connexion' ? <ErreurFormulaire objet="message" /> : null}
      {refus?.ou === 'bouton' ? <ErreurFormulaire message={refus.message} /> : null}
      <MessageReussite message={reussite} envoi={envoi} />
    </>
  )
}
