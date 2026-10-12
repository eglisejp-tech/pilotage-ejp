import { useId } from 'react'
import { TEXTES_COMPTES } from '@/features/comptes/textes'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { STATUTS_EVENEMENT } from '@/features/evenements/textes'

/**
 * Section « Listes » de la maquette 13, en lecture : les statuts d'événement communs à toute
 * l'église. Seul EJP Tech change cette liste, sur demande.
 */
export function ListesEglise() {
  const idTitre = useId()
  const idStatuts = useId()
  return (
    <section aria-labelledby={idTitre} className="flex flex-col">
      <TitreSection id={idTitre} titre={TEXTES_COMPTES.titreListes} />
      <div className="flex flex-col gap-3 pt-4 min-[600px]:flex-row min-[600px]:items-center">
        <p id={idStatuts} className="shrink-0 font-semibold min-[600px]:w-[200px]">
          {TEXTES_COMPTES.statutsEvenement}
        </p>
        <ul aria-labelledby={idStatuts} className="flex flex-wrap gap-3">
          {STATUTS_EVENEMENT.map((statut) => (
            <li key={statut.valeur} className="border border-filet bg-papier px-3 py-2 text-[15px]">
              {statut.libelle}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-sm text-encre-3">{TEXTES_COMPTES.noteStatuts}</p>
    </section>
  )
}
