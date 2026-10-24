import { Aide } from '@/components/aide/Aide'
import type { CodeAide } from '@/components/aide/textesAide'
import { cn } from '@/lib/utils'

interface Props {
  /** Identifiant du champ que le libellé décrit. */
  htmlFor: string
  libelle: string
  code: CodeAide
  /** Classes du libellé (taille, graisse), pour suivre le champ : 15 px par défaut. */
  classeLibelle?: string
}

/**
 * Ligne « libellé et aide » d'un champ de formulaire (aides-contextuelles.md, section 5). Le
 * bouton d'aide est le voisin du `<label>`, jamais son enfant : dans un libellé, il capterait le
 * clic et ouvrirait le champ. La ligne garde la hauteur du libellé : la zone de 44 px du bouton
 * dépasse du disque sans élargir la ligne (proposition 18, T69), et la bulle (placement « flux »)
 * prend toute la largeur de la ligne, sous le libellé.
 */
export function LibelleAvecAide({ htmlFor, libelle, code, classeLibelle }: Props) {
  return (
    <div className="flex flex-wrap items-center">
      <label htmlFor={htmlFor} className={cn('text-interface font-semibold', classeLibelle)}>
        {libelle}
      </label>
      <Aide code={code} libelle={libelle} placement="flux" />
    </div>
  )
}
