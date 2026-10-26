import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Bouton } from '@/components/ui/Bouton'
import { lireEchecPoint, STATUTS_CHOISIS } from '@/data/pointsEcriture'
import type { EchecLu } from '@/data/echecEnvoi'
import type { StatutChoisi } from '@/data/pointsEcriture'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { FenetreAction } from '@/features/points-actions/FenetreAction'
import { CHOIX_STATUT, TEXTES_ACTIONS_POINT } from '@/features/points-actions/textes'
import { ChoixSegmente } from '@/features/saisie/ChoixSegmente'
import { DejaEnregistre } from '@/features/saisie/DejaEnregistre'
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
 * décision », le statut actuel choisi ; les uns sous les autres quand un libellé ne tient plus sur
 * une ligne, proposition 9, T69), le texte visible qui dit qui tranche « En attente de
 * décision » (sans bulle, T66), puis « Enregistrer le statut » et « Annuler ». Le bouton n'est
 * jamais grisé (BRIEF, section 9). Un refus de la base (« Ce point est traité : il ne change plus. ») se dit sous le bouton
 * d'enregistrement, avant « Annuler », tel quel. Enregistrer le statut déjà en place n'écrit rien :
 * la fenêtre reste ouverte et le dit sous le bouton (m146), jusqu'au choix d'un autre statut.
 */
export function PanneauChangerStatut({ titre, statut, envoyer, onFermer }: Props) {
  const id = useId()
  const idTitre = `${id}-titre`
  const idNote = `${id}-note`
  const [choisi, setChoisi] = useState<StatutChoisi>(statutInitial(statut))
  const [refus, setRefus] = useState<EchecLu | null>(null)
  const [enCours, setEnCours] = useState(false)
  // Appuis sur « Enregistrer » avec le statut déjà en place (0 : aucun depuis le dernier choix).
  const [inchange, setInchange] = useState(0)

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    if (enCours) return
    // Le statut n'a pas changé : la base n'écrirait rien ; la fenêtre le dit et reste ouverte.
    if (choisi === statut) {
      setRefus(null)
      setInchange((essais) => essais + 1)
      return
    }
    setInchange(0)
    setRefus(null)
    setEnCours(true)
    try {
      await envoyer(choisi)
      onFermer()
    } catch (erreur) {
      setRefus(lireEchecPoint(erreur))
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
          <p id={idTitre} className="text-interface font-semibold">
            {TEXTES_ACTIONS_POINT.statut.libelle}
          </p>
          <ChoixSegmente
            nom={`${id}-statut`}
            choix={CHOIX_STATUT}
            valeur={choisi}
            onChange={(statutChoisi) => {
              setChoisi(statutChoisi)
              setInchange(0)
            }}
          />
          <p id={idNote} className="text-detail leading-normal text-encre-3">
            {TEXTES_ACTIONS_POINT.statut.note}
          </p>
        </fieldset>
        <BoutonEnregistrer
          libelle={TEXTES_ACTIONS_POINT.statut.bouton}
          enCours={enCours}
          libelleEnCours={TEXTES_ACTIONS_POINT.statut.boutonEnCours}
        />
        <DejaEnregistre
          message={inchange > 0 ? TEXTES_ACTIONS_POINT.statut.dejaEnregistre : null}
          essai={inchange}
        />
        {refus ? <ErreurFormulaire message={refus.message} reference={refus.reference} /> : null}
        <Bouton pleineLargeur onClick={onFermer}>
          {TEXTES_ACTIONS_POINT.statut.annuler}
        </Bouton>
      </form>
    </FenetreAction>
  )
}
