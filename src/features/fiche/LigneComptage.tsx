import type { ReactNode } from 'react'
import type { LigneComptage as Ligne } from '@/features/fiche/construireComptages'
import {
  CASE_COURBE,
  CASE_DETAIL,
  CASE_ECART,
  CASE_LIBELLE,
  CASE_VALEUR,
  GRILLE_LIGNE,
} from '@/features/fiche/grilleFiche'
import { ValeurLigne } from '@/features/fiche/ValeurLigne'

interface Props {
  ligne: Ligne
  /** Sous les sous-lignes : la liste repliée des retards, pour les lecteurs qui la voient. */
  complement?: ReactNode
}

/**
 * Une ligne des blocs de comptages de la fiche de Coordination, dans la grille des lignes
 * d'indicateur (maquette 04) : libellé, grande valeur, puis à droite le mois en cours, le départ
 * ou la complétude ; dessous, les cultes et les autres événements. Ni écart ni courbe.
 */
export function LigneComptage({ ligne, complement }: Props) {
  const sousLignes = ligne.sousLignes.length > 0 || complement !== undefined
  return (
    <li className="border-b border-filet py-3" data-comptage={ligne.cle}>
      <div className={GRILLE_LIGNE}>
        <span className={CASE_LIBELLE}>{ligne.libelle}</span>
        <span className={CASE_VALEUR}>
          <ValeurLigne valeur={ligne.valeur} />
        </span>
        <span className={CASE_ECART} />
        <span className={CASE_COURBE} />
        <span className={CASE_DETAIL}>
          {ligne.details.map((detail) => (
            <span key={detail} className="block">
              {detail}
            </span>
          ))}
        </span>
      </div>
      {sousLignes ? (
        <div className="mt-1.5 flex flex-col gap-1 text-sm text-encre-2">
          {ligne.sousLignes.map((sousLigne) => (
            <p key={sousLigne} className="flex min-h-7 items-center">
              {sousLigne}
            </p>
          ))}
          {complement}
        </div>
      ) : null}
    </li>
  )
}
