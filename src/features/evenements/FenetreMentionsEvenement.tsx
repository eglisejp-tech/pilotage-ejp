import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Bouton } from '@/components/ui/Bouton'
import { lireEchecCorrection } from '@/data/evenementsCorrections'
import type { EchecLu } from '@/data/echecEnvoi'
import type { MinistereListe } from '@/data/ministeres'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { TEXTES_CORRECTIONS } from '@/features/evenements/textesCorrections'
import { ChoixMentionsPoint } from '@/features/nouveau-point/ChoixMentionsPoint'
import { memesMentions, ministeresDeLaFenetre } from '@/features/points-actions/choixMentions'
import { FenetreAction } from '@/features/points-actions/FenetreAction'
import { DejaEnregistre } from '@/features/saisie/DejaEnregistre'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'

interface Props {
  /** Nom de l'événement, rappelé sous le titre de la fenêtre. */
  nom: { texte: string; masque: boolean }
  /** Ministère porteur : il ne se mentionne pas lui-même. */
  porteurId: string
  /** Ministères mentionnés en ce moment (`v_evenement_mention`) : cochés à l'ouverture. */
  mentions: readonly string[]
  /** Tous les ministères, désactivés compris (un mentionné désactivé reste coché). */
  ministeres: readonly MinistereListe[]
  /** Écrit la liste voulue (`modifier_mentions_evenement`). */
  envoyer: (mentions: string[]) => Promise<void>
  /** Après un envoi réussi : le panneau dit « Mentions enregistrées. ». */
  onReussite: () => void
  /** « Annuler », « Retour », Échap et le fond ferment sans rien écrire. */
  onFermer: () => void
}

/**
 * Fenêtre « Modifier les mentions » d'un événement (T78, modèle de T54) : le nom de l'événement,
 * une case par ministère actif autre que le porteur (les mentions actuelles cochées ; un ministère
 * mentionné puis désactivé reste coché avec « (désactivé) » et se retire), la note sur ce que voit
 * chacun, puis « Enregistrer les mentions » et « Annuler ». La liste actuelle ne part pas : la
 * phrase le dit sous le bouton. Un refus de la base (date passée entre-temps, ministère désactivé)
 * se dit sous le bouton, les cases gardées.
 */
export function FenetreMentionsEvenement({
  nom,
  porteurId,
  mentions,
  ministeres,
  envoyer,
  onReussite,
  onFermer,
}: Props) {
  const id = useId()
  const [coches, setCoches] = useState<string[]>([...mentions])
  const [refus, setRefus] = useState<EchecLu | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [inchange, setInchange] = useState(0)

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    if (enCours) return
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
      onReussite()
    } catch (erreur) {
      setRefus(lireEchecCorrection(erreur))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <FenetreAction titre={TEXTES_CORRECTIONS.modifierMentions} point={nom} onFermer={onFermer}>
      <form noValidate className="flex flex-col gap-5" onSubmit={(e) => void soumettre(e)}>
        <ChoixMentionsPoint
          id={`${id}-mentions`}
          ministeres={ministeresDeLaFenetre(ministeres, porteurId, mentions)}
          valeur={coches}
          onChange={(ids) => {
            setCoches(ids)
            setRefus(null)
            setInchange(0)
          }}
          titre={TEXTES_CORRECTIONS.libelleMentions}
          notes={[TEXTES_CORRECTIONS.noteMentions]}
        />
        <BoutonEnregistrer
          libelle={TEXTES_CORRECTIONS.boutonMentions}
          enCours={enCours}
          libelleEnCours={TEXTES_CORRECTIONS.enCours}
        />
        <DejaEnregistre
          message={inchange > 0 ? TEXTES_CORRECTIONS.mentionsDejaEnregistrees : null}
          essai={inchange}
        />
        {refus ? <ErreurFormulaire message={refus.message} reference={refus.reference} /> : null}
        <Bouton pleineLargeur onClick={onFermer}>
          {TEXTES_CORRECTIONS.annuler}
        </Bouton>
      </form>
    </FenetreAction>
  )
}
