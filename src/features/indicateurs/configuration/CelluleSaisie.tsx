import type { LigneMinistereConfiguration } from '@/features/indicateurs/configuration/construire'
import { TEXTES_CONFIGURATION } from '@/features/indicateurs/configuration/textes'
import { textePeuSaisis } from '@/features/indicateurs/configuration/usage'

const textes = TEXTES_CONFIGURATION.liste

/**
 * Colonne « Saisie » (7.1) : « 2 peu saisis » en orange avec le mot (jamais la couleur seule),
 * sinon « Régulière », ou « Rien à suivre » quand le ministère ne suit aucun indicateur propre.
 * Jamais une valeur : seulement l'usage.
 */
export function CelluleSaisie({ ligne }: { ligne: LigneMinistereConfiguration }) {
  if (ligne.peuSaisis > 0) {
    return <span className="font-semibold text-attention">{textePeuSaisis(ligne.peuSaisis)}</span>
  }
  return <>{ligne.suivis > 0 ? textes.saisieReguliere : textes.aucuneSaisieASuivre}</>
}
