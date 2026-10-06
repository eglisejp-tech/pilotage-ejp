import { Aide } from '@/components/aide/Aide'
import { Courbe } from '@/features/cette-semaine/Courbe'
import { PAS_DE_SAISIE } from '@/features/fiche/donneesChiffresParDepartement'
import type { RubriqueDuBloc } from '@/features/fiche/donneesChiffresParDepartement'
import { nombre } from '@/lib/metier/texte'

interface Props {
  rubrique: RubriqueDuBloc
  /** L'aide « 6 dép. sur 8 » ne paraît qu'une fois par écran, sur la première rubrique. */
  avecAide: boolean
}

/**
 * Ligne d'une rubrique du bloc « Chiffres par département » (fiche 04) : libellé, total du
 * dimanche de référence (« Pas de saisie », jamais 0), complétude « 6 dép. sur 8 » et petite
 * courbe des 10 dimanches, avec un cercle vide pour une semaine incomplète.
 */
export function LigneRubriqueFij({ rubrique, avecAide }: Props) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-filet py-3 min-[600px]:grid-cols-[minmax(0,1.3fr)_88px_minmax(0,1fr)_128px]">
      <span className="text-[15px]">{rubrique.libelle}</span>
      <span className="text-right min-[600px]:text-left">
        {rubrique.total === null ? (
          <span className="text-sm text-encre-3">{PAS_DE_SAISIE}</span>
        ) : (
          <span className="font-chiffres text-[34px] leading-none font-extrabold tabular-nums">
            {nombre(rubrique.total)}
          </span>
        )}
      </span>
      <span className="flex min-h-cible items-center text-note text-encre-3">
        <span className={rubrique.complet ? undefined : 'text-attention'}>
          {rubrique.completude}
        </span>
        {avecAide ? (
          <Aide
            code="fij.completudeDep"
            libelle={`${rubrique.libelle}, ${rubrique.completude}`}
            placement="flottante"
          />
        ) : null}
      </span>
      <span className="justify-self-end">
        <Courbe courbe={rubrique.courbe} largeur={120} hauteur={28} />
      </span>
    </li>
  )
}
