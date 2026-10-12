import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePiegeFocus } from '@/features/saisie/usePiegeFocus'

interface Props {
  /** Titre de la fenêtre (« Marquer traité », « Changer le statut »), aussi son nom accessible. */
  titre: string
  /** Rappel du point sous le titre : son titre entre guillemets. */
  point: { texte: string; masque: boolean }
  /** « Retour », Échap et le fond ferment la fenêtre sans rien écrire. */
  onFermer: () => void
  children: ReactNode
}

/**
 * Cadre des fenêtres d'action sur un point (LISEZMOI, « Écrans non dessinés » ; BRIEF section 9) :
 * plein écran sous 600 px, panneau latéral de 460 px au-delà, dérivés de 10. C'est toujours une
 * fenêtre modale : focus gardé dedans, Échap ferme, le focus revient au bouton qui l'a ouverte.
 * Elle se pose sur le corps de la page (`createPortal`), hors de la ligne du point, pour qu'aucune
 * ligne, carte ou tableau ne la rogne, et la page ne défile plus derrière.
 */
export function FenetreAction({ titre, point, onFermer, children }: Props) {
  const idTitre = useId()
  const panneau = useRef<HTMLDivElement>(null)
  usePiegeFocus(panneau, true, onFermer)

  useEffect(() => {
    const avant = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = avant
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        aria-hidden="true"
        onClick={onFermer}
        className="absolute inset-0 hidden bg-encre/50 min-[600px]:block"
      />
      <div
        ref={panneau}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        tabIndex={-1}
        data-colonne
        className="relative flex h-full w-full flex-col gap-5 overflow-y-auto bg-papier px-4 py-6 outline-hidden min-[600px]:max-w-[460px] min-[600px]:border-l min-[600px]:border-filet min-[600px]:px-6"
      >
        <div>
          <button
            type="button"
            onClick={onFermer}
            className="inline-flex min-h-cible items-center text-[15px] text-nuit underline underline-offset-4"
          >
            Retour
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <h2
            id={idTitre}
            className="font-lecture text-[32px] leading-[1.1] font-medium min-[600px]:text-[34px]"
          >
            {titre}
          </h2>
          <p
            className={
              point.masque
                ? 'text-[15px] leading-normal text-encre-3'
                : 'text-[17px] leading-normal font-semibold text-encre-2'
            }
          >
            {point.masque ? point.texte : `« ${point.texte} »`}
          </p>
        </div>
        <div className="flex flex-col gap-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
