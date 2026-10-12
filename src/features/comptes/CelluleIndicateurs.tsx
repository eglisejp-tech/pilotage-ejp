import { Link } from 'react-router'
import { libelleIndicateurs, TEXTES_COMPTES } from '@/features/comptes/textes'
import type { LigneCompte } from '@/features/comptes/types'

interface Props {
  ligne: LigneCompte
}

/**
 * Colonne « Indicateurs » d'un ministère (configuration-indicateurs.md, 7.1) : le nombre de ses
 * indicateurs propres, en lien vers son écran d'indicateurs, où ils s'ajoutent et se retirent.
 * Le ministère FIJ saisit aussi ses chiffres par département. Aucune valeur saisie n'y figure.
 */
export function CelluleIndicateurs({ ligne }: Props) {
  if (ligne.ministereId === null || ligne.indicateurs === null) return null
  const visible = libelleIndicateurs(ligne.indicateurs)
  // « Aucun indicateur pour Coordination », « 2 indicateurs pour Communication » (WCAG 2.5.3).
  const nom = `${visible}${ligne.indicateurs === 0 ? ' indicateur' : ''} pour ${ligne.nom}`
  return (
    <span>
      <Link
        to={`/indicateurs/${ligne.ministereId}`}
        aria-label={nom}
        className="-my-3 inline-flex min-h-cible items-center underline decoration-encre-3 underline-offset-4 hover:decoration-encre"
      >
        {visible}
      </Link>
      {ligne.fij ? <span className="text-encre-2"> {TEXTES_COMPTES.fijParDepartement}</span> : null}
    </span>
  )
}
