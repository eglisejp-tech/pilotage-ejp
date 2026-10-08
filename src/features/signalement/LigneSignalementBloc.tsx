import { useId, useRef, useState } from 'react'
import type { LigneSignalement } from '@/data/signalements'
import { TEXTE_MASQUE } from '@/features/cette-semaine/textesVides'
import { FenetreMasquage } from '@/features/moderation/FenetreMasquage'
import type { ChampMasquable } from '@/features/moderation/FenetreMasquage'
import type { ChoixMasquage, Masquage } from '@/features/moderation/schemas'
import { libelleChamp, TEXTES_MODERATION } from '@/features/moderation/textes'
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
  /** « Masquer le texte » (lot L6) : sans lui, le bouton n'existe pas. */
  masquage?: {
    masquer: (masquage: Masquage) => Promise<void>
    /** Texte masqué : le bloc annonce « Texte masqué. » et rend le focus à son titre. */
    surMasque: () => void
  }
}

const boutonSecondaire =
  'inline-flex min-h-cible items-center border border-encre bg-papier px-4 text-[15px] font-semibold whitespace-nowrap text-encre hover:bg-fond'

/**
 * Les champs libres d'un signalement que « Masquer le texte » peut encore remplacer : son texte
 * (cible `signalement`) et, s'il est clos avec un commentaire, ce commentaire (cible
 * `signalement_suivi`). Un champ déjà masqué n'est plus proposé.
 */
function champsMasquables(signalement: LigneSignalement): ChampMasquable[] {
  const champs: ChampMasquable[] = [
    { code: 'texte', libelle: libelleChamp('signalement', 'texte'), texte: signalement.texte },
  ]
  if (signalement.suivi_id !== null && signalement.commentaire !== null) {
    champs.push({
      code: 'commentaire',
      libelle: libelleChamp('signalement_suivi', 'commentaire'),
      texte: signalement.commentaire,
    })
  }
  return champs.filter((champ) => champ.texte.trim() !== '' && champ.texte !== TEXTE_MASQUE)
}

/**
 * Une ligne du bloc « Signalements » (maquette 15, rythme de « À relire ») : le ministère, puis
 * l'écran et la date d'envoi ; le texte entre guillemets ; à droite, « Clore le signalement »
 * pour un ouvert, ou « Clos le 8 oct. » et le commentaire d'EJP Tech pour un clos, et « Masquer
 * le texte » (ouvert ou clos, tant qu'un champ n'est pas masqué). Le bouton de clôture déplie
 * sous la ligne le petit panneau de clôture ; « Annuler » le replie et rend le focus. « Masquer
 * le texte » ouvre la fenêtre de l'écran Modération (`masquer_texte`).
 */
export function LigneSignalementBloc({ signalement, cloture, masquage }: Props) {
  const idTitre = useId()
  const idPanneau = useId()
  const [ouvert, setOuvert] = useState(false)
  const [fenetre, setFenetre] = useState(false)
  const bouton = useRef<HTMLButtonElement>(null)

  const replier = () => {
    setOuvert(false)
    bouton.current?.focus()
  }

  const masquables = masquage ? champsMasquables(signalement) : []
  // Le commentaire de clôture est un autre objet (signalement_suivi) que le texte (signalement).
  const masquer = (choix: ChoixMasquage): Promise<void> => {
    if (!masquage) return Promise.resolve()
    if (choix.champ === 'commentaire' && signalement.suivi_id !== null) {
      return masquage.masquer({
        cible: 'signalement_suivi',
        cibleId: signalement.suivi_id,
        champ: 'commentaire',
        motif: choix.motif,
      })
    }
    return masquage.masquer({
      cible: 'signalement',
      cibleId: signalement.id,
      champ: 'texte',
      motif: choix.motif,
    })
  }
  const boutonMasquer =
    masquage && masquables.length > 0 ? (
      <button
        type="button"
        aria-describedby={idTitre}
        aria-haspopup="dialog"
        onClick={() => setFenetre(true)}
        className={boutonSecondaire}
      >
        {TEXTES_MODERATION.boutonMasquer}
      </button>
    ) : null

  const peutClore = (signalement.ouvert || signalement.clos_le === null) && cloture

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
        <div className="flex min-w-0 flex-col items-start gap-2 min-[1024px]:items-end min-[1024px]:text-right">
          {signalement.ouvert || signalement.clos_le === null ? null : (
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
          {peutClore || boutonMasquer ? (
            <div className="flex flex-wrap gap-3 max-[599px]:w-full max-[599px]:flex-col min-[1024px]:justify-end">
              {peutClore ? (
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
                  className={boutonSecondaire}
                >
                  {TEXTES_BLOC_SIGNALEMENTS.boutonClore}
                </button>
              ) : null}
              {boutonMasquer}
            </div>
          ) : null}
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
      {fenetre && masquage ? (
        <FenetreMasquage
          contexte={`Signalement, ${signalement.ministere_nom}`}
          champs={masquables}
          masquer={masquer}
          onFait={() => {
            setFenetre(false)
            masquage.surMasque()
          }}
          onAnnuler={() => setFenetre(false)}
        />
      ) : null}
    </article>
  )
}
