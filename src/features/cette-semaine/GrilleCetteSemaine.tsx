import type { ReactNode } from 'react'
import { EmplacementEvenementsAConfirmer } from '@/features/cette-semaine/EmplacementEvenementsAConfirmer'

/** Blocs propres à l'accueil du ministère (maquette 07, lot E7). */
export interface BlocsAccueil {
  vosSaisies: ReactNode
  vosPoints: ReactNode
}

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
  /** Ministère seulement : « Vos saisies » et « Vos points » ; absent pour les autres profils. */
  accueil?: BlocsAccueil
}

// Colonne de droite à partir de 1024 px (380 px à partir de 1280 px).
const deuxColonnes =
  'ordinateur:grid-cols-[minmax(0,1fr)_18.75rem] ordinateur:gap-x-10 ordinateur-large:grid-cols-[minmax(0,1fr)_23.75rem] ordinateur-large:gap-x-16'
// Un seul écart entre les sections, à toutes les largeurs (gabarit commun, proposition 14 et
// écart 7, T69) : 48 px, au lieu de 36, 44 puis 52 px selon la largeur.
const rangee = 'grid items-start gap-sections'
// De 768 à 1023 px, la carte passe à droite de la session (maquette 02).
const sessionEtCarte = 'tablette-large:grid-cols-[minmax(0,1fr)_17.5rem] tablette-large:gap-x-10'
const pile = 'flex flex-col gap-sections'

/**
 * Mise en page de « Cette semaine » (maquettes 01, 02, 03, 07), partagée par la vue et son
 * chargement : les blocs gardent leur place pendant que les données arrivent. L'ordre de lecture
 * est identique à toutes les tailles, seule la place à l'écran change.
 *
 * - Berger, conseil, EJP Tech : la phrase, les chiffres, « À décider », la session, les
 *   départements, les ministères.
 * - Ministère (07, T28) : l'ouverture, « Vos saisies », « Vos points », puis les chiffres de
 *   l'église. À partir de 1024 px, « Vos points » prend la colonne de droite, à la place de
 *   « À décider », et la carte des FIJ revient à côté de la session.
 * - Administration de l'église (sans « À décider » ni accueil) : la carte des FIJ prend la colonne
 *   de droite à côté des chiffres à partir de 1024 px, et la session passe dessous sur toute la
 *   largeur, pour éviter un grand blanc à droite des chiffres.
 */
export function GrilleCetteSemaine({
  ouverture,
  chiffres,
  aDecider,
  aDeciderEnTete,
  session,
  carte,
  ministeres,
  accueil,
}: Props) {
  if (aDecider === null && accueil !== undefined) {
    // La deuxième rangée est en `1fr` : une longue liste de points ne creuse pas d'espace entre
    // « Vos saisies » et les chiffres de l'église.
    return (
      <div className={pile}>
        {ouverture}
        <div className={`${rangee} ${deuxColonnes} ordinateur:grid-rows-[auto_1fr]`}>
          <div className="min-w-0 ordinateur:col-start-1 ordinateur:row-start-1">
            {accueil.vosSaisies}
          </div>
          <div className="min-w-0 ordinateur:col-start-2 ordinateur:row-span-2 ordinateur:row-start-1">
            {accueil.vosPoints}
          </div>
          <div className="min-w-0 ordinateur:col-start-1 ordinateur:row-start-2">{chiffres}</div>
        </div>
        <div className={`${rangee} ${sessionEtCarte} ${deuxColonnes}`}>
          {session}
          {carte}
        </div>
        {ministeres}
      </div>
    )
  }

  if (aDecider === null) {
    return (
      <div className={pile}>
        {ouverture}
        <div className={`${rangee} ${sessionEtCarte} ${deuxColonnes}`}>
          <div className="min-w-0 tablette-large:col-span-2 ordinateur:col-span-1 ordinateur:col-start-1 ordinateur:row-start-1">
            {chiffres}
          </div>
          <div className="min-w-0 ordinateur:col-span-2 ordinateur:col-start-1 ordinateur:row-start-2">
            {session}
          </div>
          <div className="min-w-0 ordinateur:col-start-2 ordinateur:row-start-1">{carte}</div>
        </div>
        {ministeres}
      </div>
    )
  }

  // « Événements à confirmer » (lot E6) suit « À décider » : dans le même bloc de la colonne de
  // droite, ou juste après lui quand il remonte en tête (téléphone).
  return (
    <div className={pile}>
      {ouverture}
      {aDeciderEnTete ? (
        <>
          {aDecider}
          <EmplacementEvenementsAConfirmer />
        </>
      ) : null}
      <div className={`${rangee} ${deuxColonnes}`}>
        {chiffres}
        {aDeciderEnTete ? null : (
          <div className="flex min-w-0 flex-col gap-sections">
            {aDecider}
            <EmplacementEvenementsAConfirmer />
          </div>
        )}
      </div>
      <div className={`${rangee} ${sessionEtCarte} ${deuxColonnes}`}>
        {session}
        {carte}
      </div>
      {ministeres}
    </div>
  )
}
