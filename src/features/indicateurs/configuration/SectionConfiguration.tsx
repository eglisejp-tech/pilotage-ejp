import { useId } from 'react'
import { LigneConfiguration } from '@/features/indicateurs/configuration/LigneConfiguration'
import type { SectionConfiguration as Section } from '@/features/indicateurs/configuration/lignes'
import type { TypeCompte } from '@/lib/base'

interface Props {
  section: Section
  ministereId: string
  ministereNom: string
  profil: TypeCompte
  /** Identifiant de la ligne qui porte l'aide d'usage (une seule pour tout l'écran). */
  idLigneAide: string | null
}

const classeTitre = 'text-note font-semibold tracking-[0.04em] text-encre-3 uppercase'

/**
 * Indicateurs d'un rythme (« Chaque dimanche », « Chaque mois », « À ce jour ») ou calculs,
 * rangés par ordre alphabétique (R6). Le titre, en capitales discrètes, nomme le rythme : même
 * écart accepté que sur la fiche (LISEZMOI).
 */
export function SectionConfiguration({
  section,
  ministereId,
  ministereNom,
  profil,
  idLigneAide,
}: Props) {
  const idTitre = useId()
  return (
    <section aria-labelledby={idTitre} className="mt-6">
      <h2 id={idTitre} className={`${classeTitre} border-b border-filet pb-2`}>
        {section.titre}
      </h2>
      <ul>
        {section.lignes.map((ligne) => (
          <LigneConfiguration
            key={ligne.id}
            ligne={ligne}
            ministereId={ministereId}
            ministereNom={ministereNom}
            profil={profil}
            aideUsage={ligne.id === idLigneAide}
          />
        ))}
      </ul>
    </section>
  )
}
