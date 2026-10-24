import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { TEXTE_MASQUE_AFFICHE } from '@/features/fiche/textesFiche'
import { LIBELLE_RETOUR } from '@/features/saisie/textes'
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
        className="absolute inset-0 hidden bg-encre/50 tablette:block"
      />
      <div
        ref={panneau}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        tabIndex={-1}
        data-colonne
        className="relative flex h-full w-full flex-col gap-5 overflow-y-auto bg-papier px-4 py-6 outline-hidden tablette:max-w-[460px] tablette:border-l tablette:border-filet tablette:px-6"
      >
        <div>
          <button
            type="button"
            onClick={onFermer}
            className="inline-flex min-h-cible items-center text-interface text-nuit underline underline-offset-4"
          >
            {LIBELLE_RETOUR}
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <h2 id={idTitre} className="font-lecture text-titre-panneau">
            {titre}
          </h2>
          <p
            className={
              point.masque
                ? 'text-interface leading-normal text-encre-3'
                : 'text-texte leading-normal font-semibold text-encre-2'
            }
          >
            {point.masque ? TEXTE_MASQUE_AFFICHE : `« ${point.texte} »`}
          </p>
        </div>
        <div className="flex flex-col gap-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
