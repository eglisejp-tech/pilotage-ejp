import { useId } from 'react'
import { EtatVide } from '@/components/etats/EtatVide'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { CartePointFiche } from '@/features/fiche/CartePointFiche'
import type { PointFiche, ProfilFiche } from '@/features/fiche/modeleFiche'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'

interface Props {
  points: PointFiche[]
  profil: ProfilFiche
  nomMinistere: string
}

/**
 * « Points d'attention » de la fiche (maquettes 04 et 12) : points créés par le ministère ou qui
 * le mentionnent, ouverts puis traités depuis 7 jours. Tout est fait : « Aucun point ouvert pour
 * votre ministère. » (ministère) ou « Aucun point ouvert pour Social. » (berger, conseil, EJP Tech).
 */
export function BlocPointsFiche({ points, profil, nomMinistere }: Props) {
  const idTitre = useId()
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection
        id={idTitre}
        titre={TEXTES_FICHE.titrePoints}
        complement={<span className="text-note text-encre-3">{TEXTES_FICHE.complementPoints}</span>}
      />
      {points.length === 0 ? (
        <EtatVide situation="tout_est_fait">
          {profil === 'ministere'
            ? TEXTES_FICHE.points.aucunMinistere
            : TEXTES_FICHE.points.aucun(nomMinistere)}
        </EtatVide>
      ) : (
        <div className="flex flex-col divide-y divide-filet">
          {points.map((point) => (
            <CartePointFiche key={point.id} point={point} />
          ))}
        </div>
      )}
    </section>
  )
}
