import { useId, useRef, useState } from 'react'
import type { LigneSignalement } from '@/data/signalements'
import { FormulaireCloture } from '@/features/signalement/FormulaireCloture'
import type { ProprietesFormulaireCloture } from '@/features/signalement/FormulaireCloture'
import { TexteSignale } from '@/features/signalement/TexteSignale'
import { TEXTES_BLOC_SIGNALEMENTS } from '@/features/signalement/textes'

interface Props {
  signalement: LigneSignalement
  /** Pour un signalement ouvert : la clôture et ses suites (bloc « Signalements »). */
  cloture?: Pick<ProprietesFormulaireCloture, 'cloturer' | 'surClos' | 'surDejaClos'> & {
    /** Le panneau de clôture s'ouvre : le bloc efface son ancien message de refus. */
    surOuverture?: () => void
  }
}

/**
 * Une ligne du bloc « Signalements » (maquette 15, rythme de « À relire ») : le ministère, puis
 * l'écran et la date d'envoi ; le texte entre guillemets ; à droite, « Clore le signalement »
 * pour un ouvert, ou « Clos le 8 oct. » et le commentaire d'EJP Tech pour un clos. Le bouton
 * déplie sous la ligne le petit panneau de clôture ; « Annuler » le replie et rend le focus.
 */
export function LigneSignalementBloc({ signalement, cloture }: Props) {
  const idTitre = useId()
  const idPanneau = useId()
  const [ouvert, setOuvert] = useState(false)
  const bouton = useRef<HTMLButtonElement>(null)

  const replier = () => {
    setOuvert(false)
    bouton.current?.focus()
  }

  return (
    <article aria-labelledby={idTitre} className="flex flex-col gap-3 py-[18px]">
      <div className="grid gap-x-8 gap-y-2 min-[1024px]:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,16rem)]">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p id={idTitre} className="text-[15px] font-semibold wrap-anywhere">
            {signalement.ministere_nom}
          </p>
          <p className="text-note text-encre-3">
            {TEXTES_BLOC_SIGNALEMENTS.ligne(signalement.ecran, signalement.saisi_le)}
          </p>
        </div>
        <p className="min-w-0 font-lecture text-[19px] leading-snug wrap-anywhere">
          «&nbsp;
          <TexteSignale texte={signalement.texte} />
          &nbsp;»
        </p>
        <div className="flex min-w-0 flex-col items-start gap-1 min-[1024px]:items-end min-[1024px]:text-right">
          {signalement.ouvert || signalement.clos_le === null ? (
            cloture ? (
              <button
                ref={bouton}
                type="button"
                aria-expanded={ouvert}
                aria-controls={ouvert ? idPanneau : undefined}
                aria-describedby={idTitre}
                onClick={() => {
                  if (!ouvert) cloture.surOuverture?.()
                  setOuvert((precedent) => !precedent)
                }}
                className="inline-flex min-h-cible items-center border border-encre bg-papier px-4 text-[15px] font-semibold whitespace-nowrap text-encre hover:bg-fond"
              >
                {TEXTES_BLOC_SIGNALEMENTS.boutonClore}
              </button>
            ) : null
          ) : (
            <>
              <p className="text-note text-encre-3">
                {TEXTES_BLOC_SIGNALEMENTS.clos(signalement.clos_le)}
              </p>
              {signalement.commentaire ? (
                <p className="text-sm leading-normal wrap-anywhere text-encre-2">
                  {TEXTES_BLOC_SIGNALEMENTS.commentaireClos}{' '}
                  <TexteSignale texte={signalement.commentaire} />
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
      {ouvert && cloture ? (
        <div id={idPanneau} className="min-[1024px]:ml-auto min-[1024px]:w-[32rem]">
          <FormulaireCloture
            id={`${idPanneau}-commentaire`}
            signalementId={signalement.id}
            cloturer={cloture.cloturer}
            surClos={cloture.surClos}
            surDejaClos={cloture.surDejaClos}
            onAnnuler={replier}
          />
        </div>
      ) : null}
    </article>
  )
}
