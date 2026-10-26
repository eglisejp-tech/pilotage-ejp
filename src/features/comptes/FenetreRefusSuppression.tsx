import { FenetreConfirmation } from '@/components/ui/FenetreConfirmation'
import type { TexteRefusSuppression } from '@/features/comptes/textes'

interface Props {
  refus: TexteRefusSuppression
  /** « Désactiver » : la confirmation de la désactivation suit ; null sans compte actif. */
  onDesactiver: (() => void) | null
  onFermer: () => void
}

/**
 * Fenêtre « impossible » d'une suppression (T75) : la fenêtre commune de l'outil, avec le titre
 * (« Communication ne peut pas être supprimé »), la phrase, les raisons chiffrées en liste, puis
 * ce qu'on peut faire à la place. « Fermer » (ou Échap) ne change rien et rend le focus au bouton
 * « Supprimer » ; « Désactiver » ouvre la confirmation de la désactivation.
 */
export function FenetreRefusSuppression({ refus, onDesactiver, onFermer }: Props) {
  const desactiver =
    refus.desactiver !== null && onDesactiver !== null
      ? { confirmer: refus.desactiver, onConfirmer: onDesactiver }
      : {}
  return (
    <FenetreConfirmation
      titre={refus.titre}
      texte={refus.texte}
      annuler={refus.fermer}
      onAnnuler={onFermer}
      {...desactiver}
    >
      {refus.raisons.length > 0 ? (
        <ul className="list-disc pl-5 leading-normal text-encre marker:text-encre-3">
          {refus.raisons.map((raison) => (
            <li key={raison}>{raison}</li>
          ))}
        </ul>
      ) : null}
      {refus.suite === null ? null : <p className="leading-normal text-encre-2">{refus.suite}</p>}
    </FenetreConfirmation>
  )
}
