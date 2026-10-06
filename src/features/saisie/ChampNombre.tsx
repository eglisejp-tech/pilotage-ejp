import { LibelleAvecAide } from '@/components/aide/LibelleAvecAide'
import type { CodeAide } from '@/components/aide/textesAide'
import { ajusterNombre, garderChiffres } from '@/features/saisie/chiffres'
import { MOINS } from '@/lib/metier/texte'
import { cn } from '@/lib/utils'

interface Props {
  id: string
  libelle: string
  /** Texte du champ : vide tant que la personne n'a rien écrit (jamais un 0 par défaut). */
  valeur: string
  onChange: (valeur: string) => void
  /** Plafond de l'unité : les boutons « plus » et « moins » ne le dépassent pas. */
  max: number
  /** « grand » : boutons moins et plus de 64 px (maquette 08) ; « compact » : champ seul de 58 px. */
  variante?: 'grand' | 'compact'
  /** Aide à côté du libellé (T38) : jamais à la place de la définition affichée. */
  aide?: CodeAide
  /** Définition visible sous le libellé, lue avec le champ. */
  definition?: string
  /** Note visible sous le champ (« Saisi le 24 sept. », « 79 % des actifs »). */
  note?: string
  /** Message de validation sous le champ, lu avec le champ. */
  erreur?: string
  /** Unité écrite après le nombre (« € », « jours »). */
  suffixe?: string | null
}

/**
 * Champ numérique des saisies (maquette 08) : un vrai champ entre « moins » et « plus », de
 * grandes cibles de 64 px. Le texte est gardé tel quel (champ vide possible), seuls les chiffres
 * sont acceptés. Le libellé reste un `<label>` ; l'aide, si elle existe, est son voisin. Les
 * boutons « moins » et « plus » portent le libellé du champ dans leur nom accessible (« Ajouter
 * un : STARs actifs ») : un formulaire en a plusieurs paires, qui ne doivent pas se confondre.
 */
export function ChampNombre({
  id,
  libelle,
  valeur,
  onChange,
  max,
  variante = 'grand',
  aide,
  definition,
  note,
  erreur,
  suffixe,
}: Props) {
  const idDefinition = `${id}-definition`
  const idNote = `${id}-note`
  const idErreur = `${id}-erreur`
  const decritPar = [definition ? idDefinition : '', note ? idNote : '', erreur ? idErreur : '']
    .filter(Boolean)
    .join(' ')
  const grand = variante === 'grand'

  const champ = (
    <div className="relative min-w-0">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={valeur}
        onChange={(evenement) => onChange(garderChiffres(evenement.target.value))}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decritPar || undefined}
        className={cn(
          'w-full min-w-0 bg-papier text-center font-chiffres font-black text-encre tabular-nums aria-invalid:border-2 aria-invalid:border-alerte',
          grand ? 'h-cible-saisie border-0 text-[44px]' : 'h-14.5 border border-encre text-[32px]',
        )}
      />
      {suffixe ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-encre-3"
        >
          {suffixe}
        </span>
      ) : null}
    </div>
  )

  return (
    <div className="flex flex-col gap-1.5">
      {aide ? (
        <LibelleAvecAide
          htmlFor={id}
          libelle={libelle}
          code={aide}
          classeLibelle={grand ? undefined : 'text-sm'}
        />
      ) : (
        <label htmlFor={id} className={cn('font-semibold', grand ? 'text-[15px]' : 'text-sm')}>
          {libelle}
        </label>
      )}
      {definition ? (
        <p id={idDefinition} className="text-sm leading-normal text-encre-3">
          {definition}
        </p>
      ) : null}
      {grand ? (
        <div className="grid grid-cols-[var(--cible-saisie)_minmax(0,1fr)_var(--cible-saisie)] items-center border-y border-encre">
          <button
            type="button"
            aria-label={`Retirer un : ${libelle}`}
            onClick={() => onChange(ajusterNombre(valeur, -1, max))}
            className="h-cible-saisie border-r border-encre bg-papier font-chiffres text-[34px] font-extrabold text-encre"
          >
            <span aria-hidden="true">{MOINS}</span>
          </button>
          {champ}
          <button
            type="button"
            aria-label={`Ajouter un : ${libelle}`}
            onClick={() => onChange(ajusterNombre(valeur, 1, max))}
            className="h-cible-saisie bg-encre font-chiffres text-[34px] font-extrabold text-papier"
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      ) : (
        champ
      )}
      {note ? (
        <p id={idNote} className="text-center text-note text-encre-3">
          {note}
        </p>
      ) : null}
      {erreur ? (
        <p id={idErreur} className="text-[15px] leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </div>
  )
}
