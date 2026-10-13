import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { phraseErreur } from '@/data/messagesBase'
import { TEXTES_FENETRE_EFFACEMENT } from '@/features/personnes/textes'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { usePiegeFocus } from '@/features/saisie/usePiegeFocus'

interface Props {
  /** Un prénom (« Marie D., Ministère Communication »), ou tous ceux de plus de 12 mois. */
  cible: { type: 'un' | 'anciens'; contexte: string }
  /** L'effacement ; un échec s'affiche sous les boutons, la fenêtre reste ouverte. */
  effacer: () => Promise<void>
  onAnnuler: () => void
}

/**
 * Fenêtre « Effacer ce prénom » (T56), sur le modèle de « Masquer le texte » : ce qui sera
 * effacé, la phrase « ... sera remplacé par « [prénom effacé] » partout. Cette action ne peut pas
 * être annulée. », puis « Effacer définitivement ». Fenêtre modale : le focus y reste, Échap
 * annule, le focus revient au bouton d'origine.
 */
export function FenetreEffacement({ cible, effacer, onAnnuler }: Props) {
  const idTitre = useId()
  const idContexte = useId()
  const idAvertissement = useId()
  const fenetre = useRef<HTMLDivElement>(null)
  const [enCours, setEnCours] = useState(false)
  const [echec, setEchec] = useState<string | null>(null)
  usePiegeFocus(fenetre, true, () => {
    if (!enCours) onAnnuler()
  })

  // La page ne défile plus derrière la fenêtre.
  useEffect(() => {
    const avant = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = avant
    }
  }, [])

  const un = cible.type === 'un'

  const soumettre = async () => {
    if (enCours) return
    setEchec(null)
    setEnCours(true)
    try {
      await effacer()
    } catch (erreur) {
      // Par la table de traduction (m270, m271) : seule une coupure dit « La connexion a échoué ».
      // Une action sans formulaire : le repli ne parle pas de saisie gardée.
      setEchec(
        phraseErreur(
          erreur,
          { connexion: TEXTES_FENETRE_EFFACEMENT.erreur },
          { formulaire: false },
        ),
      )
      setEnCours(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-encre/50" />
      <div
        ref={fenetre}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        aria-describedby={`${idContexte} ${idAvertissement}`}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-[520px] flex-col gap-5 overflow-y-auto border border-filet bg-papier p-6 outline-hidden"
      >
        <div className="flex flex-col gap-1">
          <h2 id={idTitre} className="font-lecture text-[28px] leading-tight font-medium">
            {un ? TEXTES_FENETRE_EFFACEMENT.titreUn : TEXTES_FENETRE_EFFACEMENT.titreAnciens}
          </h2>
          <p id={idContexte} className="text-[15px] wrap-anywhere text-encre-2">
            {cible.contexte}
          </p>
        </div>
        <p id={idAvertissement} className="leading-normal text-encre-2">
          {un
            ? TEXTES_FENETRE_EFFACEMENT.avertissementUn
            : TEXTES_FENETRE_EFFACEMENT.avertissementAnciens}
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
            {TEXTES_FENETRE_EFFACEMENT.annuler}
          </button>
          <button
            type="button"
            onClick={() => void soumettre()}
            aria-disabled={enCours ? true : undefined}
            className="inline-flex min-h-cible items-center justify-center bg-encre px-4.5 text-[15px] font-semibold text-papier aria-disabled:cursor-wait"
          >
            {enCours ? TEXTES_FENETRE_EFFACEMENT.boutonEnCours : TEXTES_FENETRE_EFFACEMENT.bouton}
          </button>
        </div>
        {echec !== null ? <ErreurFormulaire message={echec} /> : null}
      </div>
    </div>,
    document.body,
  )
}
