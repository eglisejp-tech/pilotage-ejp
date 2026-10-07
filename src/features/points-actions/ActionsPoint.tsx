import { useEffect, useId, useRef, useState } from 'react'
import type { FunctionComponent, MouseEvent } from 'react'
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
 * Vrai pour un refus de la base qui dit que la page est périmée : point déjà traité (`P0001`,
 * messages de la base) ou point hors de portée (`42501`). Une connexion perdue n'en est pas un :
 * supabase-js la rend sous la forme `{ message: 'FetchError: ...', code: '' }`, avec une propriété
 * `code` vide. Le texte tapé reste alors dans la fenêtre et rien n'est relu.
 */
function refusDePagePerimee(erreur: unknown): boolean {
  if (typeof erreur !== 'object' || erreur === null) return false
  const { code, message } = erreur as { code?: unknown; message?: unknown }
  if (code === '42501') return true
  return (
    code === 'P0001' &&
    (message === MESSAGES_POINT.refus.pointDejaTraite ||
      message === MESSAGES_POINT.refus.pointTraiteStatut)
  )
}

/**
 * Repère stable où poser le focus quand le bouton « Marquer traité » disparaît avec la relecture :
 * l'ancêtre marqué `data-repli-focus` (un bloc de la page, au choix du lot qui pose les boutons),
 * sinon le contenu de la page (`#contenu`, WCAG 2.4.3 : l'ordre du focus reste logique).
 */
function repliPour(depart: HTMLElement): HTMLElement | null {
  return depart.closest<HTMLElement>('[data-repli-focus]') ?? document.getElementById('contenu')
}

/** Pose le focus sur le repli seulement si la page l'a perdu (il est tombé sur le corps). */
function rendreLeFocusSiPerdu(repli: HTMLElement | null): void {
  const actif = document.activeElement
  if (actif !== null && actif !== document.body) return
  const cible = repli?.isConnected ? repli : document.getElementById('contenu')
  if (cible === null) return
  if (!cible.hasAttribute('tabindex')) {
    // Un conteneur n'est pas un contrôle : le focus y est posé par le code, sans cadre.
    cible.setAttribute('tabindex', '-1')
    cible.style.outline = 'none'
  }
  cible.focus({ preventScroll: true })
}

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

  // Ce qui reste à faire quand la fenêtre se ferme : le message de réussite et la relecture de la
  // page. Tant que la fenêtre est ouverte, rien ne bouge sous elle : un refus de la base y reste
  // dit, même si la relecture retire les boutons ou la ligne du point.
  const suite = useRef<(() => void) | null>(null)
  // Repli du focus : posé à l'ouverture d'une fenêtre, utilisé si « Marquer traité » réussit.
  const repli = useRef<HTMLElement | null>(null)
  const focusARendre = useRef(false)

  const droits = { statut: point.statut, ministereId: point.ministereId, mentions: point.mentions }
  const peutStatut = peutChangerStatut(compte, droits)
  const peutTraiter = peutMarquerTraite(compte, droits)
  const avecBoutons = peutStatut || peutTraiter

  // Les deux boutons disparaissent après la relecture d'un point traité, et avec eux le focus :
  // il passe au repli de la page (le bloc marqué `data-repli-focus`, sinon le contenu).
  useEffect(() => {
    if (avecBoutons || !focusARendre.current) return
    focusARendre.current = false
    rendreLeFocusSiPerdu(repli.current)
  }, [avecBoutons])
  // La ligne entière peut aussi disparaître (le composant est démonté avec elle).
  useEffect(
    () => () => {
      if (focusARendre.current) rendreLeFocusSiPerdu(repli.current)
    },
    [],
  )

  if (!avecBoutons && fenetre === null) return null

  const ouvrir = (cible: Fenetre, evenement: MouseEvent<HTMLButtonElement>) => {
    repli.current = repliPour(evenement.currentTarget)
    setFenetre(cible)
  }

  // Un refus de la base (point déjà traité, point hors de portée) veut dire que la page est
  // périmée : elle sera relue à la fermeture de la fenêtre. Une connexion perdue ne relit rien.
  const gererRefus = (erreur: unknown) => {
    if (!refusDePagePerimee(erreur)) return
    suite.current = apresEcriture
    // Le bouton qui a ouvert la fenêtre disparaîtra avec la relecture : le focus aura un repli.
    focusARendre.current = true
  }

  const envoyerStatut = async (statut: StatutChoisi) => {
    try {
      await ecritures.changerStatut(point.id, statut)
    } catch (erreur) {
      gererRefus(erreur)
      throw erreur
    }
    suite.current = () => {
      annoncerReussite(MESSAGES_POINT.reussite.statut(LIBELLE_STATUT[statut]))
      apresEcriture()
    }
  }

  const envoyerTraite = async (commentaire: string | null) => {
    try {
      await ecritures.marquerTraite(point.id, commentaire)
    } catch (erreur) {
      gererRefus(erreur)
      throw erreur
    }
    focusARendre.current = true
    suite.current = () => {
      annoncerReussite(MESSAGES_POINT.reussite.traite)
      apresEcriture()
      rendreLeFocusSiPerdu(repli.current)
    }
  }

  // Fermer, c'est aussi lancer la suite. Elle part après la fermeture de la fenêtre modale : un
  // lecteur d'écran n'annonce pas un message arrivé pendant qu'elle est encore ouverte.
  const fermer = () => {
    setFenetre(null)
    const aFaire = suite.current
    suite.current = null
    if (aFaire !== null) window.setTimeout(aFaire, 0)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <span id={idTitre} hidden>
        {point.titre.texte}
      </span>
      {peutStatut ? (
        <button
          type="button"
          aria-describedby={idTitre}
          onClick={(evenement) => ouvrir('statut', evenement)}
          className={CLASSE_BOUTON}
        >
          {TEXTES_ACTIONS_POINT.boutonStatut}
        </button>
      ) : null}
      {peutTraiter ? (
        <button
          type="button"
          aria-describedby={idTitre}
          onClick={(evenement) => ouvrir('traite', evenement)}
          className={CLASSE_BOUTON}
        >
          {TEXTES_ACTIONS_POINT.boutonTraite}
        </button>
      ) : null}
      {fenetre === 'statut' ? (
        <PanneauChangerStatut
          titre={point.titre}
          statut={point.statut}
          envoyer={envoyerStatut}
          onFermer={fermer}
        />
      ) : null}
      {fenetre === 'traite' ? (
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
