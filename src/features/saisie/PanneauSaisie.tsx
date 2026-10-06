import { useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { useLargeurMin } from '@/features/cette-semaine/useLargeurMin'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { LARGEUR_PANNEAU } from '@/features/saisie/textes'
import { usePiegeFocus } from '@/features/saisie/usePiegeFocus'

interface Props {
  /** Titre de la saisie, aussi le titre de l'onglet (« Ajouter un événement »). */
  titre: string
  /** Petit libellé au-dessus du titre (« Chiffres du dimanche »), maquettes 08 à 11. */
  surtitre?: string
  /** « Retour », Échap, le fond du panneau et le bouton Précédent ramènent à la page d'origine. */
  onFermer: () => void
  /** Champs, bouton d'enregistrement, erreur et lien « Signaler une difficulté ». */
  children: ReactNode
}

/**
 * Cadre de toutes les saisies (BRIEF section 9, LISEZMOI) : une page entière sous 600 px, un
 * panneau latéral de 460 px au-dessus de la page d'origine à partir de 600 px. En panneau, c'est
 * une fenêtre modale (focus gardé dedans, Échap ferme, le focus revient à la fermeture). Le
 * contenu est le même aux deux largeurs ; le panneau marque sa colonne (`data-colonne`) pour que
 * les bulles d'aide restent dedans.
 */
export function PanneauSaisie({ titre, surtitre, onFermer, children }: Props) {
  useTitrePage(titre)
  const idTitre = useId()
  const enPanneau = useLargeurMin(LARGEUR_PANNEAU)
  const panneau = useRef<HTMLDivElement>(null)
  usePiegeFocus(panneau, enPanneau, onFermer)

  const contenu = (
    <>
      <div>
        <button
          type="button"
          onClick={onFermer}
          className="inline-flex min-h-cible items-center text-[15px] text-nuit underline underline-offset-4"
        >
          Retour
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {surtitre ? <p className="text-[13px] font-semibold text-encre-3">{surtitre}</p> : null}
        <h1
          id={idTitre}
          className="font-lecture text-[32px] leading-[1.1] font-medium min-[600px]:text-[34px]"
        >
          {titre}
        </h1>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </>
  )

  if (!enPanneau) {
    return (
      <section aria-labelledby={idTitre} data-colonne className="flex flex-col gap-5">
        {contenu}
      </section>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div aria-hidden="true" onClick={onFermer} className="absolute inset-0 bg-encre/50" />
      <div
        ref={panneau}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        tabIndex={-1}
        data-colonne
        className="relative flex h-full w-full max-w-[460px] flex-col gap-5 overflow-y-auto border-l border-filet bg-papier px-6 py-6 outline-hidden"
      >
        {contenu}
      </div>
    </div>
  )
}
