import { useId, useRef, useState } from 'react'
import { lireRefusCompte } from '@/features/comptes/refus'
import { TEXTES_COMPTES } from '@/features/comptes/textes'
import type { TexteConfirmation } from '@/features/comptes/textes'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { usePiegeFocus } from '@/features/saisie/usePiegeFocus'

interface Props {
  confirmation: TexteConfirmation
  /** L'action confirmée ; la fenêtre se ferme par le parent quand elle réussit. */
  onConfirmer: () => Promise<void>
  onAnnuler: () => void
  /** Phrase d'un refus (défaut : refus des fonctions de comptes). L'écran 14 donne la sienne. */
  lireMessage?: (refus: unknown) => string
}

/**
 * Fenêtre de confirmation de l'écran 13 (BRIEF, section 9) : titre en question, texte, « Annuler »
 * et le bouton d'action. Fenêtre modale (`alertdialog`) : le focus y reste, Échap annule, il
 * revient au bouton d'origine à la fermeture. Un refus de la fonction s'affiche sous les boutons,
 * la fenêtre reste ouverte pour réessayer ou annuler.
 */
export function FenetreConfirmation({
  confirmation,
  onConfirmer,
  onAnnuler,
  lireMessage = (refus) => lireRefusCompte(refus).message,
}: Props) {
  const idTitre = useId()
  const idTexte = useId()
  const fenetre = useRef<HTMLDivElement>(null)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  usePiegeFocus(fenetre, true, () => {
    if (!enCours) onAnnuler()
  })

  const confirmer = async () => {
    if (enCours) return
    setEnCours(true)
    setErreur(null)
    try {
      await onConfirmer()
    } catch (refus) {
      setErreur(lireMessage(refus))
      setEnCours(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-encre/50" />
      <div
        ref={fenetre}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        aria-describedby={idTexte}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-[480px] flex-col gap-5 overflow-y-auto border border-filet bg-papier p-6 outline-hidden"
      >
        <h2 id={idTitre} className="font-lecture text-[28px] leading-tight font-medium">
          {confirmation.titre}
        </h2>
        <p id={idTexte} className="leading-normal text-encre-2">
          {confirmation.texte}
        </p>
        <div className="flex flex-col-reverse gap-2 min-[480px]:flex-row min-[480px]:justify-end">
          <button
            type="button"
            onClick={() => {
              if (!enCours) onAnnuler()
            }}
            aria-disabled={enCours ? true : undefined}
            className="inline-flex min-h-cible items-center justify-center border border-encre bg-papier px-4.5 text-[15px] font-semibold text-encre hover:bg-fond"
          >
            {TEXTES_COMPTES.annuler}
          </button>
          <button
            type="button"
            onClick={() => void confirmer()}
            aria-disabled={enCours ? true : undefined}
            className="inline-flex min-h-cible items-center justify-center bg-lumiere px-4.5 text-[15px] font-bold text-encre aria-disabled:cursor-wait"
          >
            {enCours ? TEXTES_COMPTES.enCours : confirmation.bouton}
          </button>
        </div>
        {erreur !== null ? <ErreurFormulaire message={erreur} /> : null}
      </div>
    </div>
  )
}
