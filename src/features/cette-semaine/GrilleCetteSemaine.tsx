import type { ReactNode } from 'react'

interface Props {
  ouverture: ReactNode
  chiffres: ReactNode
  /** Null : le profil n'a pas « À décider » (ministère, administration de l'église). */
  aDecider: ReactNode | null
  /** Sur téléphone, « À décider » remonte juste après la phrase (point urgent). */
  aDeciderEnTete: boolean
  session: ReactNode
  carte: ReactNode
  ministeres: ReactNode
}

// Colonne de droite : « À décider » et la carte des FIJ (380 px à partir de 1280 px). Sans
// « À décider », les chiffres gardent la colonne de gauche, alignés sur la session.
const deuxColonnes =
  'lg:grid-cols-[minmax(0,1fr)_18.75rem] lg:gap-x-10 xl:grid-cols-[minmax(0,1fr)_23.75rem] xl:gap-x-16'

/**
 * Mise en page de « Cette semaine » (maquettes 01, 02, 03), partagée par la vue et son
 * chargement : les blocs gardent leur place pendant que les données arrivent. Ordre de lecture
 * identique à toutes les tailles : la phrase, les chiffres, « À décider », la session, les
 * départements, les ministères.
 */
export function GrilleCetteSemaine({
  ouverture,
  chiffres,
  aDecider,
  aDeciderEnTete,
  session,
  carte,
  ministeres,
}: Props) {
  return (
    <div className="flex flex-col gap-9 min-[600px]:gap-11 lg:gap-13">
      {ouverture}
      {aDeciderEnTete ? aDecider : null}
      <div className={`grid items-start gap-9 min-[600px]:gap-11 ${deuxColonnes}`}>
        {chiffres}
        {aDeciderEnTete ? null : aDecider}
      </div>
      <div
        className={`grid items-start gap-9 min-[600px]:gap-11 md:grid-cols-[minmax(0,1fr)_17.5rem] md:gap-x-10 ${deuxColonnes}`}
      >
        {session}
        {carte}
      </div>
      {ministeres}
    </div>
  )
}
