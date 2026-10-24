import { ChoixSegmente } from '@/features/saisie/ChoixSegmente'
import { TYPES_SESSION } from '@/features/sessions/schemas'
import type { ValeursDeclaration } from '@/features/sessions/schemas'
import { LIBELLES_TYPES, TEXTES_SESSIONS } from '@/features/sessions/textes'

interface Props {
  /** Préfixe des identifiants et nom du groupe de boutons radio. */
  id: string
  valeur: ValeursDeclaration['type']
  onChange: (type: ValeursDeclaration['type']) => void
}

const CHOIX = TYPES_SESSION.map((type) => ({ valeur: type, libelle: LIBELLES_TYPES[type] }))

/**
 * Choix du type d'une session (maquette 14, ajout du troisième type : « Autre session »). Un
 * seul bloc de trois boutons radio (proposition 9, T69) : côte à côte quand chaque libellé tient
 * sur une ligne, sinon les uns sous les autres, comme dans le panneau (écart 3).
 */
export function ChoixType({ id, valeur, onChange }: Props) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="flex min-h-cible items-center text-interface font-semibold">
        {TEXTES_SESSIONS.legendeType}
      </legend>
      <ChoixSegmente nom={id} choix={CHOIX} valeur={valeur} onChange={onChange} />
    </fieldset>
  )
}
