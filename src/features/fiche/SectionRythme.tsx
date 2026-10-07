import { useId, useState } from 'react'
import { useLargeurMin } from '@/features/cette-semaine/useLargeurMin'
import { LigneIndicateurFiche } from '@/features/fiche/LigneIndicateurFiche'
import type { SectionFiche } from '@/features/fiche/modeleFiche'

interface Props {
  section: SectionFiche
}

const classeTitre = 'text-note font-semibold tracking-[0.04em] text-encre-3 uppercase'

/**
 * Indicateurs propres d'un rythme (« Chaque dimanche », « Chaque mois », « À ce jour »), rangés
 * par ordre alphabétique (R6). Une fiche peut avoir 30 lignes : sous 600 px, chaque section se
 * replie (ouverte au départ), pour que le téléphone ne fasse pas défiler toute la fiche.
 */
export function SectionRythme({ section }: Props) {
  const idTitre = useId()
  const telephone = !useLargeurMin(600)
  const [ouverte, setOuverte] = useState(true)
  const lignes = (
    <ul aria-labelledby={idTitre} className="flex flex-col">
      {section.lignes.map((ligne) => (
        <LigneIndicateurFiche key={ligne.id} ligne={ligne} />
      ))}
    </ul>
  )
  if (telephone) {
    return (
      <details
        open={ouverte}
        onToggle={(evenement) => setOuverte(evenement.currentTarget.open)}
        className="mt-6"
      >
        <summary className="flex min-h-cible cursor-pointer items-center border-b border-filet">
          {/* Pas de titre dans un `summary` : son contenu est lu comme le nom d'un bouton. */}
          <span id={idTitre} className={classeTitre}>
            {section.titre}
          </span>
        </summary>
        {lignes}
      </details>
    )
  }
  return (
    <div className="mt-6">
      <h3 id={idTitre} className={`${classeTitre} border-b border-filet pb-2`}>
        {section.titre}
      </h3>
      {lignes}
    </div>
  )
}
