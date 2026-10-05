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

// Colonne de droite à partir de 1024 px (380 px à partir de 1280 px).
const deuxColonnes =
  'lg:grid-cols-[minmax(0,1fr)_18.75rem] lg:gap-x-10 xl:grid-cols-[minmax(0,1fr)_23.75rem] xl:gap-x-16'
const rangee = 'grid items-start gap-9 min-[600px]:gap-11'
// De 768 à 1023 px, la carte passe à droite de la session (maquette 02).
const sessionEtCarte = 'md:grid-cols-[minmax(0,1fr)_17.5rem] md:gap-x-10'

/**
 * Mise en page de « Cette semaine » (maquettes 01, 02, 03), partagée par la vue et son
 * chargement : les blocs gardent leur place pendant que les données arrivent. Ordre de lecture
 * identique à toutes les tailles : la phrase, les chiffres, « À décider », la session, les
 * départements, les ministères.
 *
 * Sans « À décider » (administration de l'église, ministère jusqu'à l'étape 4), la carte des
 * FIJ prend la colonne de droite à côté des chiffres à partir de 1024 px, et la session passe
 * dessous sur toute la largeur : pas de grand blanc à droite des chiffres. L'ordre de lecture ne
 * change pas, seule la place à l'écran change.
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
  if (aDecider === null) {
    return (
      <div className="flex flex-col gap-9 min-[600px]:gap-11 lg:gap-13">
        {ouverture}
        <div className={`${rangee} ${sessionEtCarte} ${deuxColonnes} lg:gap-y-13`}>
          <div className="min-w-0 md:col-span-2 lg:col-span-1 lg:col-start-1 lg:row-start-1">
            {chiffres}
          </div>
          <div className="min-w-0 lg:col-span-2 lg:col-start-1 lg:row-start-2">{session}</div>
          <div className="min-w-0 lg:col-start-2 lg:row-start-1">{carte}</div>
        </div>
        {ministeres}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-9 min-[600px]:gap-11 lg:gap-13">
      {ouverture}
      {aDeciderEnTete ? aDecider : null}
      <div className={`${rangee} ${deuxColonnes}`}>
        {chiffres}
        {aDeciderEnTete ? null : aDecider}
      </div>
      <div className={`${rangee} ${sessionEtCarte} ${deuxColonnes}`}>
        {session}
        {carte}
      </div>
      {ministeres}
    </div>
  )
}
