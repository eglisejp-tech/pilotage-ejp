import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { ApresChargement } from '@/components/etats/ApresChargement'
import { EtatVide } from '@/components/etats/EtatVide'
import { messageDeRefusPoint } from '@/data/pointsEcriture'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { ChargementSaisie } from '@/features/evenements/ChargementSaisie'
import { ChoixMentionsPoint } from '@/features/nouveau-point/ChoixMentionsPoint'
import { memesMentions, ministeresDeLaFenetre } from '@/features/points-actions/choixMentions'
import { useEcrituresPoint } from '@/features/points-actions/ecritures'
import { FenetreAction } from '@/features/points-actions/FenetreAction'
import { TEXTES_ACTIONS_POINT } from '@/features/points-actions/textes'
import { DejaEnregistre } from '@/features/saisie/DejaEnregistre'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'

interface Props {
  /** Titre du point, rappelé sous le titre de la fenêtre. */
  titre: { texte: string; masque: boolean }
  /** Ministère créateur : il ne se mentionne pas lui-même. */
  createurId: string
  /** Ministères mentionnés en ce moment (`v_point_mention`) : cochés à l'ouverture. */
  mentions: readonly string[]
  /** Écrit la liste voulue (`modifier_mentions_point`). */
  envoyer: (mentions: string[]) => Promise<void>
  /** Appelé après un envoi réussi, et par « Annuler », « Retour » et Échap. */
  onFermer: () => void
}

/**
 * Fenêtre « Modifier les mentions » (T54, dérivée de la maquette 10) : le titre du point, une case
 * par ministère actif autre que le créateur (les mentions actuelles cochées, un ministère mentionné
 * puis désactivé reste coché et se retire), la note sur ce que voit chacun, puis « Enregistrer les
 * mentions » et « Annuler ». Le bouton n'est jamais grisé (BRIEF, section 9). Enregistrer la liste
 * actuelle n'écrit rien : la fenêtre reste ouverte et le dit sous le bouton (m155), jusqu'à la
 * prochaine case cochée ou décochée. Un refus de la base (« Ce point est traité : ses mentions ne
 * changent plus. ») se dit sous le bouton, tel quel ; une connexion perdue garde les cases.
 */
export function PanneauModifierMentions({ titre, createurId, mentions, envoyer, onFermer }: Props) {
  const id = useId()
  const ecritures = useEcrituresPoint()
  const ministeres = useQuery({
    queryKey: ['ministeres', 'liste'],
    queryFn: ecritures.lireMinisteres,
  })
  const [coches, setCoches] = useState<string[]>([...mentions])
  const [refus, setRefus] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  // Appuis sur « Enregistrer » sans changement (0 : aucun depuis la dernière case touchée).
  const [inchange, setInchange] = useState(0)

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    if (enCours) return
    // Rien n'a changé : la base n'écrirait rien ; la fenêtre le dit et reste ouverte.
    if (memesMentions(coches, mentions)) {
      setRefus(null)
      setInchange((essais) => essais + 1)
      return
    }
    setInchange(0)
    setRefus(null)
    setEnCours(true)
    try {
      await envoyer(coches)
      onFermer()
    } catch (erreur) {
      setRefus(messageDeRefusPoint(erreur) ?? TEXTES_ACTIONS_POINT.mentions.erreurConnexion)
    } finally {
      setEnCours(false)
    }
  }

  let contenu
  if (ministeres.data) {
    contenu = (
      <form noValidate className="flex flex-col gap-5" onSubmit={(e) => void soumettre(e)}>
        <ChoixMentionsPoint
          id={`${id}-mentions`}
          ministeres={ministeresDeLaFenetre(ministeres.data, createurId, mentions)}
          valeur={coches}
          onChange={(ids) => {
            setCoches(ids)
            setRefus(null)
            setInchange(0)
          }}
          titre={TEXTES_ACTIONS_POINT.mentions.libelle}
          notes={TEXTES_ACTIONS_POINT.mentions.notes}
        />
        <BoutonEnregistrer
          libelle={TEXTES_ACTIONS_POINT.mentions.bouton}
          enCours={enCours}
          libelleEnCours={TEXTES_ACTIONS_POINT.mentions.boutonEnCours}
        />
        <DejaEnregistre
          message={inchange > 0 ? TEXTES_ACTIONS_POINT.mentions.dejaEnregistrees : null}
          essai={inchange}
        />
        {refus ? <ErreurFormulaire message={refus} /> : null}
        <button
          type="button"
          onClick={onFermer}
          className="min-h-cible w-full border border-encre bg-papier px-4 text-[15px] font-semibold text-encre hover:bg-fond"
        >
          {TEXTES_ACTIONS_POINT.mentions.annuler}
        </button>
      </form>
    )
  } else if (ministeres.isError && !ministeres.isFetching) {
    contenu = (
      <EtatVide
        situation="probleme_passager"
        action={{ libelle: TEXTES_VIDES.page.reessayer, surClic: () => void ministeres.refetch() }}
      >
        {TEXTES_VIDES.page.erreur}
      </EtatVide>
    )
  } else {
    contenu = null
  }

  // T65 : la flamme reste au moins 600 ms une fois montrée, puis les cases arrivent en fondu.
  return (
    <FenetreAction titre={TEXTES_ACTIONS_POINT.mentions.titre} point={titre} onFermer={onFermer}>
      <ApresChargement enChargement={contenu === null} indicateur={<ChargementSaisie />}>
        {contenu}
      </ApresChargement>
    </FenetreAction>
  )
}
