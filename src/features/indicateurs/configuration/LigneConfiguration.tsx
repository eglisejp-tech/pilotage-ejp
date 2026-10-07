import { Link } from 'react-router'
import { Aide } from '@/components/aide/Aide'
import { ActionsLigne } from '@/features/indicateurs/configuration/ActionsLigne'
import type { LigneConfiguration as Ligne } from '@/features/indicateurs/configuration/lignes'
import { TEXTES_CONFIGURATION } from '@/features/indicateurs/configuration/textes'
import { ANCRE_A_VALIDER } from '@/features/indicateurs/validation/BlocAValider'
import type { TypeCompte } from '@/lib/base'
import { cn } from '@/lib/utils'

interface Props {
  ligne: Ligne
  ministereId: string
  ministereNom: string
  profil: TypeCompte
  /** Première ligne qui a un usage : elle porte l'aide « Saisi 4 mois sur 5 » de l'écran. */
  aideUsage: boolean
}

const textes = TEXTES_CONFIGURATION.ministere

/**
 * Une ligne d'indicateur de `/indicateurs/:id` (7.2) : libellé, définition, mentions
 * (« grand compte », « ajouté par Kumi le 12 oct. »), « à valider par EJP Tech depuis 2 jours » avec
 * le lien « Voir dans À valider », et l'usage (« Saisi 4 mois sur 5, dernier le 2 oct. »), jamais
 * une valeur. Les actions (L3b) viennent de l'emplacement `ActionsLigne`.
 */
export function LigneConfiguration({ ligne, ministereId, ministereNom, profil, aideUsage }: Props) {
  const usage = ligne.usage ?? (ligne.calcul !== null ? textes.calculSansSaisie : null)
  return (
    <li className="flex flex-col gap-x-6 gap-y-2 border-b border-filet py-3 min-[600px]:flex-row min-[600px]:items-start min-[600px]:justify-between">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-semibold break-words">{ligne.libelle}</span>
        <span className="text-[15px] break-words text-encre-2">{ligne.definition}</span>
        {ligne.mentions.length > 0 ? (
          <span className="text-note text-encre-3">{ligne.mentions.join(' · ')}</span>
        ) : null}
        {ligne.aValider !== null ? (
          <span className="text-note font-semibold text-attention">
            {ligne.aValider}
            {' · '}
            <Link
              to={`/indicateurs#${ANCRE_A_VALIDER}`}
              className="inline-flex min-h-cible items-center font-semibold underline underline-offset-4"
            >
              {textes.voirAValider}
            </Link>
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1 min-[600px]:items-end min-[600px]:text-right">
        {usage !== null ? (
          <span className="inline-flex flex-wrap items-center">
            <span
              className={cn(
                'text-[15px]',
                ligne.peuSaisi ? 'font-semibold text-attention' : 'text-encre-2',
              )}
            >
              {usage}
            </span>
            {aideUsage && ligne.usage !== null ? (
              <Aide code="indicateurs.usage" libelle="Usage" placement="flottante" />
            ) : null}
          </span>
        ) : null}
        <ActionsLigne
          ministereId={ministereId}
          ministereNom={ministereNom}
          indicateurId={ligne.id}
          libelle={ligne.libelle}
          estCalcul={ligne.calcul !== null}
          enAttente={ligne.enAttente}
          profil={profil}
        />
      </div>
    </li>
  )
}
