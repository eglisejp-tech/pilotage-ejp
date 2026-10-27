import { CHOIX_QUAND, TEXTES_PLAGES } from '@/features/evenements/textesPlages'
import type { Quand } from '@/features/evenements/textesPlages'
import { ChoixSegmente } from '@/features/saisie/ChoixSegmente'

interface Props {
  id: string
  valeur: Quand
  onChange: (quand: Quand) => void
}

/** La phrase visible sous le choix, selon la case (conception 8.1) ; rien sous « Un jour ». */
function noteDe(quand: Quand): string | null {
  if (quand === 'plusieurs_jours') return TEXTES_PLAGES.notePlusieursJours
  if (quand === 'repete') return TEXTES_PLAGES.noteRepete
  return null
}

/**
 * « Quand ? » en tête du formulaire d'ajout (T78, lot 2 ; conception 5.5) : trois cases côte à
 * côte (`ChoixSegmente`, T69), « Un jour » coché par défaut, puis la règle de la case choisie, lue
 * avec le groupe.
 */
export function ChoixQuand({ id, valeur, onChange }: Props) {
  const idNote = `${id}-note`
  const note = noteDe(valeur)
  return (
    <fieldset
      aria-describedby={note ? idNote : undefined}
      className="flex min-w-0 flex-col gap-1.5"
    >
      <legend className="mb-1.5 text-interface font-semibold">{TEXTES_PLAGES.libelleQuand}</legend>
      <ChoixSegmente nom={id} choix={CHOIX_QUAND} valeur={valeur} onChange={onChange} />
      {/* Région polie toujours présente : la phrase d'une case choisie est dite à l'écoute. */}
      <p
        id={idNote}
        aria-live="polite"
        className={note ? 'text-detail leading-normal text-encre-3' : 'sr-only'}
      >
        {note}
      </p>
    </fieldset>
  )
}
