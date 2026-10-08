import { Link } from 'react-router'
import type { IndicateursAValider } from '@/features/moderation/indicateurs'
import { TEXTES_INDICATEURS_A_VALIDER } from '@/features/moderation/textes'

interface Props {
  indicateurs: IndicateursAValider
}

/**
 * En tête de l'écran Modération, s'il y a lieu (conception des indicateurs, 7.6) : « 2 indicateurs
 * attendent votre validation, le plus ancien depuis 4 jours. » et le lien « Ouvrir les
 * indicateurs à valider ». Ni nom d'indicateur ni « Pourquoi » : le nombre seulement. La
 * validation d'un indicateur vaut relecture : il n'entre pas dans la file des textes.
 */
export function BandeauIndicateurs({ indicateurs }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border border-filet bg-papier px-4 py-2">
      <p className="text-[15px] leading-normal">
        {TEXTES_INDICATEURS_A_VALIDER.phrase(indicateurs.nombre, indicateurs.plusAncienJours)}
      </p>
      <Link
        to="/indicateurs"
        className="inline-flex min-h-cible items-center text-[15px] font-semibold text-nuit underline underline-offset-4"
      >
        {TEXTES_INDICATEURS_A_VALIDER.lien}
      </Link>
    </div>
  )
}
