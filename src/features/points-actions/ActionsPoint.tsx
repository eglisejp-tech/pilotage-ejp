import { useId, useState } from 'react'
import type { FunctionComponent } from 'react'
import { MESSAGES_POINT } from '@/data/pointsEcriture'
import type { StatutChoisi } from '@/data/pointsEcriture'
import { useApresEcriture } from '@/features/evenements/useApresEcriture'
import { annoncerReussite } from '@/features/points-actions/annonce'
import { useEcrituresPoint } from '@/features/points-actions/ecritures'
import { PanneauChangerStatut } from '@/features/points-actions/PanneauChangerStatut'
import { PanneauMarquerTraite } from '@/features/points-actions/PanneauMarquerTraite'
import { TEXTES_ACTIONS_POINT } from '@/features/points-actions/textes'
import type { StatutPoint, TypeCompte } from '@/lib/base'
import {
  commentaireTraiteObligatoire,
  peutChangerStatut,
  peutMarquerTraite,
} from '@/lib/metier/droitsPoint'
import { LIBELLE_STATUT } from '@/lib/metier/points'

/**
 * Ce que les boutons d'un point lisent du point. Les identifiants viennent de `v_point` et de
 * `point_mention`, jamais des noms affichés : deux ministères peuvent changer de nom, pas d'id.
 */
export interface PointDesActions {
  id: string
  /** Titre du point, rappelé en tête du panneau « Changer le statut » et de « Marquer traité ». */
  titre: { texte: string; masque: boolean }
  statut: StatutPoint
  /** Ministère créateur (`point_attention.ministere_id`). */
  ministereId: string
  /** Identifiants des ministères mentionnés (`point_mention.ministere_id`). */
  mentions: readonly string[]
}

/** Ce que les boutons lisent du compte connecté (`compte.type` et `compte.ministere_id`). */
export interface CompteDesActions {
  type: TypeCompte
  /** Ministère du compte, pour un compte de ministère seulement ; null pour les autres profils. */
  ministereId: string | null
}

export interface ProprietesActionsPoint {
  point: PointDesActions
  compte: CompteDesActions
}

type Fenetre = 'statut' | 'traite'

const CLASSE_BOUTON =
  'inline-flex min-h-cible items-center justify-center border border-encre bg-papier px-4 text-[15px] font-semibold text-encre hover:bg-fond'

/**
 * Boutons « Changer le statut » et « Marquer traité » d'un point (étape 5, BRIEF section 9 ;
 * plan des étapes 5 à 8, P1). Propriétés figées par le lot C0 : le lot P4 pose ce composant sur
 * « À décider » (`PointADecider.tsx`), sur la fiche (`CartePointFiche.tsx`) et sur « Vos points »
 * de l'accueil du ministère, sans changer ces propriétés.
 *
 * Règle des boutons (`droitsPoint.ts`) : ils se montrent au ministère créateur et aux ministères
 * mentionnés (les deux boutons), au berger et au conseil (« Marquer traité » seulement) ; jamais à
 * EJP Tech ni à l'administration de l'église (T29) ; plus aucun sur un point traité. Quand aucun
 * bouton ne se montre, le composant ne rend rien.
 *
 * Chaque bouton ouvre sa fenêtre (plein écran sous 600 px, panneau de 460 px au-delà). Après une
 * écriture, toutes les lectures de la page sont relues (`useApresEcriture` : « Cette semaine »,
 * fiche, points, accueil) et le message de réussite s'affiche en bas de la page (`annonce.tsx`),
 * même si la ligne du point disparaît.
 */
export const ActionsPoint: FunctionComponent<ProprietesActionsPoint> = ({ point, compte }) => {
  const [fenetre, setFenetre] = useState<Fenetre | null>(null)
  const idTitre = useId()
  const apresEcriture = useApresEcriture()
  const ecritures = useEcrituresPoint()

  const droits = { statut: point.statut, ministereId: point.ministereId, mentions: point.mentions }
  const peutStatut = peutChangerStatut(compte, droits)
  const peutTraiter = peutMarquerTraite(compte, droits)
  if (!peutStatut && !peutTraiter) return null

  // Un refus de la base (point déjà traité, point hors de portée) veut dire que la page est
  // périmée : elle est relue, et le bouton disparaît ou le point change.
  const relireSiRefus = async (ecriture: () => Promise<void>) => {
    try {
      await ecriture()
    } catch (erreur) {
      if (typeof erreur === 'object' && erreur !== null && 'code' in erreur) apresEcriture()
      throw erreur
    }
  }

  const envoyerStatut = (statut: StatutChoisi) =>
    relireSiRefus(async () => {
      await ecritures.changerStatut(point.id, statut)
      annoncerReussite(MESSAGES_POINT.reussite.statut(LIBELLE_STATUT[statut]))
      apresEcriture()
    })

  const envoyerTraite = (commentaire: string | null) =>
    relireSiRefus(async () => {
      await ecritures.marquerTraite(point.id, commentaire)
      annoncerReussite(MESSAGES_POINT.reussite.traite)
      apresEcriture()
    })

  const fermer = () => setFenetre(null)

  return (
    <div className="flex flex-wrap gap-2">
      {point.titre.masque ? null : (
        <span id={idTitre} className="sr-only">
          {point.titre.texte}
        </span>
      )}
      {peutStatut ? (
        <button
          type="button"
          aria-describedby={point.titre.masque ? undefined : idTitre}
          onClick={() => setFenetre('statut')}
          className={CLASSE_BOUTON}
        >
          {TEXTES_ACTIONS_POINT.boutonStatut}
        </button>
      ) : null}
      {peutTraiter ? (
        <button
          type="button"
          aria-describedby={point.titre.masque ? undefined : idTitre}
          onClick={() => setFenetre('traite')}
          className={CLASSE_BOUTON}
        >
          {TEXTES_ACTIONS_POINT.boutonTraite}
        </button>
      ) : null}
      {fenetre === 'statut' && peutStatut ? (
        <PanneauChangerStatut
          titre={point.titre}
          statut={point.statut}
          envoyer={envoyerStatut}
          onFermer={fermer}
        />
      ) : null}
      {fenetre === 'traite' && peutTraiter ? (
        <PanneauMarquerTraite
          titre={point.titre}
          commentaireObligatoire={commentaireTraiteObligatoire(compte, droits)}
          envoyer={envoyerTraite}
          onFermer={fermer}
        />
      ) : null}
    </div>
  )
}
