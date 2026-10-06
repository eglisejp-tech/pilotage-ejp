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
 * clic et ouvrirait le champ. La ligne fait 44 px au moins pour que la zone du bouton tienne
 * dedans, et la bulle (placement « flux ») prend toute la largeur de la ligne, sous le libellé.
 */
export function LibelleAvecAide({ htmlFor, libelle, code, classeLibelle }: Props) {
  return (
    <div className="flex min-h-cible flex-wrap items-center">
      <label htmlFor={htmlFor} className={cn('text-[15px] font-semibold', classeLibelle)}>
        {libelle}
      </label>
      <Aide code={code} libelle={libelle} placement="flux" />
    </div>
  )
}
