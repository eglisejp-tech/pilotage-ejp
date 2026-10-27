import { ligneSerie, TEXTES_PLAGES } from '@/features/evenements/textesPlages'
import { ChoixSegmente } from '@/features/saisie/ChoixSegmente'

/** Ce qu'un geste touche, pour une date d'une série (T78, lot 2, Q8). */
export type Portee = 'evenement' | 'serie'

/**
 * Le choix « Toute la série » d'une fenêtre (nom, mentions, retrait) : le nombre de dates de la
 * série, le libellé de la case de la série (« Toute la série (les 5 dates à venir) ») et l'écriture
 * de la série.
 */
export interface ChoixSerie<V> {
  nombre: number
  libelle: string
  envoyer: (valeur: V) => Promise<void>
}

interface Props {
  id: string
  /** Nombre de dates de la série : la légende « Fait partie d'une série de 7 dates. ». */
  nombre: number
  /** Libellé de la case de la série. */
  libelleSerie: string
  valeur: Portee
  onChange: (portee: Portee) => void
}

/**
 * En tête d'une fenêtre ouverte sur une date d'une série (conception 6.4 et 8.2) : « Cet
 * événement seulement » (coché d'avance) ou « Toute la série », sous la légende qui dit la série.
 */
export function ChoixPortee({ id, nombre, libelleSerie, valeur, onChange }: Props) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-interface font-semibold">{ligneSerie(nombre)}</legend>
      <ChoixSegmente
        nom={id}
        choix={[
          { valeur: 'evenement', libelle: TEXTES_PLAGES.porteeEvenement },
          { valeur: 'serie', libelle: libelleSerie },
        ]}
        valeur={valeur}
        onChange={onChange}
      />
    </fieldset>
  )
}
