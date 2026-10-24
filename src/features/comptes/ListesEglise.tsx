import { useId } from 'react'
import { TEXTES_COMPTES } from '@/features/comptes/textes'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { STATUTS_EVENEMENT } from '@/features/evenements/textes'

/**
 * Section « Listes » de la maquette 13, en lecture : les statuts d'événement communs à toute
 * l'église. Seul EJP Tech change cette liste, sur demande. EJP Tech, qui gère aussi cet écran
 * (T60), n'est pas renvoyé vers lui-même : sa note s'arrête à la première phrase.
 */
export function ListesEglise({ lectureSeule = true }: { lectureSeule?: boolean }) {
  const idTitre = useId()
  const idStatuts = useId()
  return (
    <section aria-labelledby={idTitre} className="flex flex-col">
      <TitreSection id={idTitre} titre={TEXTES_COMPTES.titreListes} />
      <div className="flex flex-col gap-3 pt-4 tablette:flex-row tablette:items-center">
        <p id={idStatuts} className="shrink-0 font-semibold tablette:w-[200px]">
          {TEXTES_COMPTES.statutsEvenement}
        </p>
        <ul aria-labelledby={idStatuts} className="flex flex-wrap gap-3">
          {STATUTS_EVENEMENT.map((statut) => (
            <li
              key={statut.valeur}
              className="border border-filet bg-papier px-3 py-2 text-interface"
            >
              {statut.libelle}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-detail text-encre-3">
        {lectureSeule ? TEXTES_COMPTES.noteStatuts : TEXTES_COMPTES.noteStatutsGestion}
      </p>
    </section>
  )
}
