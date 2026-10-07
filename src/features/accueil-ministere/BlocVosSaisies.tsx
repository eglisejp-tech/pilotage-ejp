import { useId } from 'react'
import { LigneSaisie } from '@/features/accueil-ministere/LigneSaisie'
import { TEXTES_ACCUEIL } from '@/features/accueil-ministere/textesAccueil'
import type { LigneVosSaisies } from '@/features/accueil-ministere/types'
import { TitreSection } from '@/features/cette-semaine/TitreSection'

interface Props {
  lignes: readonly LigneVosSaisies[]
}

/**
 * « Vos saisies » de l'accueil du ministère (maquette 07 ; BRIEF, section 9) : les lignes déjà
 * rangées par `rangerVosSaisies`. Le bloc n'est jamais vide : la ligne des chiffres du dimanche et
 * celle de la prochaine réunion existent toujours, et chacune dit en texte visible ce qu'il reste
 * à faire. Pas d'aide contextuelle (T38).
 */
export function BlocVosSaisies({ lignes }: Props) {
  const idTitre = useId()
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection id={idTitre} titre={TEXTES_ACCUEIL.titreSaisies} />
      <ul className="flex flex-col">
        {lignes.map((ligne) => (
          <LigneSaisie key={ligne.cle} ligne={ligne} />
        ))}
      </ul>
    </section>
  )
}
