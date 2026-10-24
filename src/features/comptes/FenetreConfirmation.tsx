import { FenetreConfirmation as Fenetre } from '@/components/ui/FenetreConfirmation'
import { lireRefusCompte } from '@/features/comptes/refus'
import { TEXTES_COMPTES } from '@/features/comptes/textes'
import type { TexteConfirmation } from '@/features/comptes/textes'

interface Props {
  confirmation: TexteConfirmation
  /** L'action confirmée ; la fenêtre se ferme par le parent quand elle réussit. */
  onConfirmer: () => Promise<void>
  onAnnuler: () => void
  /** Phrase d'un refus (défaut : refus des fonctions de comptes). L'écran 14 donne la sienne. */
  lireMessage?: (refus: unknown) => string
}

/**
 * Fenêtre de confirmation des écrans 13 et 14 (BRIEF, section 9) : la fenêtre commune
 * (src/components/ui/FenetreConfirmation.tsx, T69) avec les textes des comptes. Un refus de la
 * fonction s'affiche sous les boutons, la fenêtre reste ouverte pour réessayer ou annuler.
 */
export function FenetreConfirmation({
  confirmation,
  onConfirmer,
  onAnnuler,
  lireMessage = (refus) => lireRefusCompte(refus, 'fenetre').message,
}: Props) {
  return (
    <Fenetre
      titre={confirmation.titre}
      texte={confirmation.texte}
      confirmer={confirmation.bouton}
      libelleEnCours={confirmation.enCours}
      annuler={TEXTES_COMPTES.annuler}
      onConfirmer={onConfirmer}
      onAnnuler={onAnnuler}
      lireMessage={lireMessage}
    />
  )
}
