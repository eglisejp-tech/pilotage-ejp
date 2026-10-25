import type { ReactNode } from 'react'
import type { LigneComptage as Ligne } from '@/features/fiche/construireComptages'
import { CASE_LIBELLE, CASE_VALEUR, GRILLE_LIGNE } from '@/features/fiche/grilleFiche'
import { ValeurLigne } from '@/features/fiche/ValeurLigne'

interface Props {
  ligne: Ligne
  /** Sous la ligne : la liste repliée des retards, pour les lecteurs qui la voient. */
  complement?: ReactNode
}

/**
 * Une ligne des blocs de comptages de la fiche de Coordination, dans la grille des lignes
 * d'indicateur (maquette 04) : libellé, grande valeur, puis les détails (mois en cours, départ ;
 * pour la ponctualité, la complétude d'abord, le retard moyen, les cultes et les autres
 * événements). Sans écart ni courbe, les détails prennent leurs colonnes à partir de 768 px : ils
 * suivent la grande valeur qu'ils qualifient, au lieu d'en être séparés par deux colonnes vides.
 */
export function LigneComptage({ ligne, complement }: Props) {
  return (
    <li className="border-b border-filet py-3" data-comptage={ligne.cle}>
      <div className={GRILLE_LIGNE}>
        <span className={CASE_LIBELLE}>{ligne.libelle}</span>
        <span className={CASE_VALEUR}>
          <ValeurLigne valeur={ligne.valeur} />
        </span>
        <span className="col-span-2 min-w-0 text-detail text-encre-3 tablette-large:col-span-3 tablette-large:col-start-3">
          {ligne.details.map((detail) => (
            <span key={detail} className="block">
              {detail}
            </span>
          ))}
        </span>
      </div>
      {complement !== undefined ? (
        <div className="mt-1.5 flex flex-col gap-1 text-detail text-encre-2">{complement}</div>
      ) : null}
    </li>
  )
}
