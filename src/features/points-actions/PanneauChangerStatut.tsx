import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Aide } from '@/components/aide/Aide'
import { messageDeRefusPoint, STATUTS_CHOISIS } from '@/data/pointsEcriture'
import type { StatutChoisi } from '@/data/pointsEcriture'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { FenetreAction } from '@/features/points-actions/FenetreAction'
import { CHOIX_STATUT, TEXTES_ACTIONS_POINT } from '@/features/points-actions/textes'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import type { StatutPoint } from '@/lib/base'

interface Props {
  /** Titre du point, rappelé sous le titre de la fenêtre. */
  titre: { texte: string; masque: boolean }
  /** Statut actuel du point : il est choisi à l'ouverture. */
  statut: StatutPoint
  /** Écrit le statut (`changer_statut_point`). */
  envoyer: (statut: StatutChoisi) => Promise<void>
  /** Appelé après un envoi réussi, et par « Annuler », « Retour » et Échap. */
  onFermer: () => void
}

/** Le statut choisi à l'ouverture : l'actuel, « À traiter » si le point n'est pas dans la liste. */
function statutInitial(statut: StatutPoint): StatutChoisi {
  return STATUTS_CHOISIS.find((choisi) => choisi === statut) ?? 'a_traiter'
}

/**
 * Fenêtre « Changer le statut » (BRIEF section 9, dérivée du choix de priorité de 10) : le titre
 * du point, trois vrais boutons radio segmentés (« À traiter », « En cours », « En attente de
 * décision », le statut actuel choisi), le texte visible sur l'effet de « En attente de décision »,
 * puis « Enregistrer le statut » et « Annuler ». Le bouton n'est jamais grisé. Un refus de la base
 * (« Ce point est traité : il ne change plus. ») se dit sous le bouton, tel quel.
 */
export function PanneauChangerStatut({ titre, statut, envoyer, onFermer }: Props) {
  const id = useId()
  const idTitre = `${id}-titre`
  const idNote = `${id}-note`
  const [choisi, setChoisi] = useState<StatutChoisi>(statutInitial(statut))
  const [refus, setRefus] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    if (enCours) return
    setRefus(null)
    setEnCours(true)
    try {
      await envoyer(choisi)
      onFermer()
    } catch (erreur) {
      setRefus(messageDeRefusPoint(erreur) ?? TEXTES_ACTIONS_POINT.statut.erreurConnexion)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <FenetreAction titre={TEXTES_ACTIONS_POINT.statut.titre} point={titre} onFermer={onFermer}>
      <form noValidate className="flex flex-col gap-5" onSubmit={(e) => void soumettre(e)}>
        <fieldset
          aria-labelledby={idTitre}
          aria-describedby={idNote}
          className="flex min-w-0 flex-col gap-1.5"
        >
          <div className="flex min-h-cible flex-wrap items-center">
            <p id={idTitre} className="text-[15px] font-semibold">
              {TEXTES_ACTIONS_POINT.statut.libelle}
            </p>
            <Aide code="point.statut" libelle={TEXTES_ACTIONS_POINT.statut.libelle} />
          </div>
          <div className="grid grid-cols-3">
            {CHOIX_STATUT.map((option) => (
              <label key={option.valeur} className="relative flex not-first:-ml-px">
                <input
                  type="radio"
                  name={`${id}-statut`}
                  value={option.valeur}
                  checked={choisi === option.valeur}
                  onChange={() => setChoisi(option.valeur)}
                  className="peer sr-only"
                />
                <span className="flex min-h-14 w-full cursor-pointer items-center justify-center border border-encre bg-papier px-2 py-1 text-center text-[15px] leading-tight font-medium text-encre peer-checked:bg-encre peer-checked:font-bold peer-checked:text-papier peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-encre">
                  {option.libelle}
                </span>
              </label>
            ))}
          </div>
          <p id={idNote} className="text-sm leading-normal text-encre-3">
            {TEXTES_ACTIONS_POINT.statut.note}
          </p>
        </fieldset>
        <BoutonEnregistrer
          libelle={TEXTES_ACTIONS_POINT.statut.bouton}
          enCours={enCours}
          libelleEnCours={TEXTES_ACTIONS_POINT.statut.boutonEnCours}
        />
        <button
          type="button"
          onClick={onFermer}
          className="min-h-cible w-full border border-encre bg-papier px-4 text-[15px] font-semibold text-encre hover:bg-fond"
        >
          {TEXTES_ACTIONS_POINT.statut.annuler}
        </button>
        {refus ? <ErreurFormulaire message={refus} /> : null}
      </form>
    </FenetreAction>
  )
}
