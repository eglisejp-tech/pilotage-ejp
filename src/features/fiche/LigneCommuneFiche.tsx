import { Courbe } from '@/features/cette-semaine/Courbe'
import { EcartLigne } from '@/features/fiche/EcartLigne'
import {
  CASE_COURBE,
  CASE_DETAIL,
  CASE_ECART,
  CASE_LIBELLE,
  CASE_VALEUR,
  COURBE_HAUTEUR,
  COURBE_LARGEUR,
  GRILLE_LIGNE,
} from '@/features/fiche/grilleFiche'
import type { LigneCommune } from '@/features/fiche/modeleFiche'
import { ValeurLigne } from '@/features/fiche/ValeurLigne'
import { cn } from '@/lib/utils'

interface Props {
  ligne: LigneCommune
}

/**
 * Une ligne des chiffres communs de la fiche : STARs au service (écart et courbe des dix derniers
 * dimanches), actifs, présents en FIJ (calculé), sous le nom de la demande du ministère ; ou une
 * ligne de référence de l'église pour MDS, avec sa complétude (« 6 sur 8 »).
 */
export function LigneCommuneFiche({ ligne }: Props) {
  return (
    <li className={`${GRILLE_LIGNE} border-b border-filet py-3`}>
      <span className={CASE_LIBELLE}>{ligne.libelle}</span>
      <span className={CASE_VALEUR}>
        <ValeurLigne valeur={ligne.valeur} />
      </span>
      <span className={CASE_ECART}>{ligne.ecart ? <EcartLigne ecart={ligne.ecart} /> : null}</span>
      <span className={CASE_COURBE}>
        {ligne.courbe ? (
          <Courbe courbe={ligne.courbe} largeur={COURBE_LARGEUR} hauteur={COURBE_HAUTEUR} />
        ) : null}
      </span>
      <span className={cn(CASE_DETAIL, ligne.detailSignale && 'font-semibold text-attention')}>
        {ligne.detail}
      </span>
    </li>
  )
}
