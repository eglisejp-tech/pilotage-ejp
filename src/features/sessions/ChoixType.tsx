import { TYPES_SESSION } from '@/features/sessions/schemas'
import type { ValeursDeclaration } from '@/features/sessions/schemas'
import { LIBELLES_TYPES, TEXTES_SESSIONS } from '@/features/sessions/textes'

interface Props {
  /** Préfixe des identifiants et nom du groupe de boutons radio. */
  id: string
  valeur: ValeursDeclaration['type']
  onChange: (type: ValeursDeclaration['type']) => void
}

/**
 * Choix du type d'une session (maquette 14, ajout du troisième type : « Autre rassemblement »).
 * Trois boutons radio côte à côte quand la place le permet, le choix en fond `--encre`.
 */
export function ChoixType({ id, valeur, onChange }: Props) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="flex min-h-cible items-center text-[15px] font-semibold">
        {TEXTES_SESSIONS.legendeType}
      </legend>
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
        {TYPES_SESSION.map((type) => (
          <label key={type} className="relative flex">
            <input
              type="radio"
              name={id}
              value={type}
              checked={valeur === type}
              onChange={() => onChange(type)}
              className="peer sr-only"
            />
            <span className="flex min-h-13 w-full cursor-pointer items-center justify-center border border-encre bg-papier px-2 py-1 text-center text-[15px] leading-tight font-medium text-encre peer-checked:bg-encre peer-checked:font-bold peer-checked:text-papier peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-encre">
              {LIBELLES_TYPES[type]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
