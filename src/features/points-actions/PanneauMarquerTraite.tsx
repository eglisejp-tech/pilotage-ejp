import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  messageDeRefusPoint,
  schemaBaseCommentaireTraite,
  schemaCommentaireTraiteMinistere,
} from '@/data/pointsEcriture'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { FenetreAction } from '@/features/points-actions/FenetreAction'
import { TEXTES_ACTIONS_POINT } from '@/features/points-actions/textes'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { ChampTexteLibre } from '@/features/signalement/ChampTexteLibre'
import { longueurEnCaracteres } from '@/lib/metier/texte'

interface Props {
  /** Titre du point, rappelé sous le titre de la fenêtre. */
  titre: { texte: string; masque: boolean }
  /**
   * Vrai pour un ministère lié au point : le commentaire est obligatoire (10 à 280 caractères).
   * Faux pour le berger et le conseil : facultatif (280 au plus).
   */
  commentaireObligatoire: boolean
  /** Écrit le traitement (`marquer_traite`) : `null` quand le berger ou le conseil n'écrit rien. */
  envoyer: (commentaire: string | null) => Promise<void>
  /** Appelé après un envoi réussi, et par « Annuler », « Retour » et Échap. */
  onFermer: () => void
}

/**
 * Fenêtre « Marquer traité » (BRIEF section 9, dérivée de 10) : titre du point entre guillemets,
 * champ « Ce qui a été traité, et comment » (ministère, obligatoire) ou « Commentaire
 * (facultatif) » (berger, conseil), rappel sur les données personnelles sous le champ, compteur
 * « 0 sur 280 », « Un point traité ne se rouvre pas. », puis « Marquer traité » (principal) et
 * « Annuler ». Le bouton n'est jamais grisé : un commentaire trop court se dit sous le champ. Un
 * refus de la base se dit sous le bouton d'enregistrement, avant « Annuler », tel quel ; une
 * connexion perdue garde le texte.
 */
export function PanneauMarquerTraite({ titre, commentaireObligatoire, envoyer, onFermer }: Props) {
  const [texte, setTexte] = useState('')
  const [erreurChamp, setErreurChamp] = useState<string | null>(null)
  const [refus, setRefus] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const champ = useRef<HTMLTextAreaElement>(null)

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    if (enCours) return
    setRefus(null)
    const lu = commentaireObligatoire
      ? schemaCommentaireTraiteMinistere.safeParse(texte)
      : schemaBaseCommentaireTraite.safeParse(texte)
    if (!lu.success) {
      setErreurChamp(lu.error.issues[0]?.message ?? null)
      champ.current?.focus()
      return
    }
    setErreurChamp(null)
    setEnCours(true)
    try {
      await envoyer(lu.data)
      onFermer()
    } catch (erreur) {
      setRefus(messageDeRefusPoint(erreur) ?? TEXTES_ACTIONS_POINT.traite.erreurConnexion)
    } finally {
      setEnCours(false)
    }
  }

  const libelle = commentaireObligatoire
    ? TEXTES_ACTIONS_POINT.traite.libelleMinistere
    : TEXTES_ACTIONS_POINT.traite.libelleDecideur

  return (
    <FenetreAction titre={TEXTES_ACTIONS_POINT.traite.titre} point={titre} onFermer={onFermer}>
      <form noValidate className="flex flex-col gap-5" onSubmit={(e) => void soumettre(e)}>
        <ChampTexteLibre
          ref={champ}
          id="traite-commentaire"
          libelle={libelle}
          note={TEXTES_ACTIONS_POINT.traite.noteLecteurs}
          longueur={longueurEnCaracteres(texte)}
          avecRappel
          autoComplete="off"
          value={texte}
          onChange={(evenement) => {
            setTexte(evenement.target.value)
            setErreurChamp(null)
          }}
          erreur={erreurChamp ?? undefined}
        />
        <p className="text-[15px] leading-normal font-semibold text-encre-2">
          {TEXTES_ACTIONS_POINT.traite.nonRouvert}
        </p>
        <BoutonEnregistrer
          libelle={TEXTES_ACTIONS_POINT.traite.bouton}
          enCours={enCours}
          libelleEnCours={TEXTES_ACTIONS_POINT.traite.boutonEnCours}
        />
        {refus ? <ErreurFormulaire message={refus} /> : null}
        <button
          type="button"
          onClick={onFermer}
          className="min-h-cible w-full border border-encre bg-papier px-4 text-[15px] font-semibold text-encre hover:bg-fond"
        >
          {TEXTES_ACTIONS_POINT.traite.annuler}
        </button>
      </form>
    </FenetreAction>
  )
}
