import { COLONNES_POINTS } from '@/features/points/colonnesPoints'
import { LignePoint } from '@/features/points/LignePoint'
import type { LignePoint as DonneesLigne } from '@/features/points/modelePoints'
import { TEXTES_POINTS } from '@/features/points/textesPoints'
import type { CompteDesActions } from '@/features/points-actions/ActionsPoint'
import { cn } from '@/lib/utils'

interface Props {
  lignes: readonly DonneesLigne[]
  compte: CompteDesActions
}

/**
 * Tableau des points (maquette 05) : en-têtes Priorité, Point, Statut, Échéance à partir de
 * 1024 px, puis une rangée par point. En dessous, chaque rangée est une carte qui porte ses
 * propres mots (« Statut : », « Priorité »), l'en-tête disparaît. L'en-tête est décoratif pour les
 * lecteurs d'écran : chaque rangée dit ce qu'elle contient.
 */
export function ListePoints({ lignes, compte }: Props) {
  return (
    <div>
      <div
        aria-hidden="true"
        className={cn('hidden pt-3 pb-2 text-note text-encre-3 lg:grid', COLONNES_POINTS)}
      >
        <span>{TEXTES_POINTS.entetes.priorite}</span>
        <span>{TEXTES_POINTS.entetes.point}</span>
        <span>{TEXTES_POINTS.entetes.statut}</span>
        <span>{TEXTES_POINTS.entetes.echeance}</span>
        <span />
      </div>
      <ol className="flex flex-col">
        {lignes.map((ligne) => (
          <li key={ligne.id} className="border-t border-filet">
            <LignePoint ligne={ligne} compte={compte} />
          </li>
        ))}
      </ol>
    </div>
  )
}
