import type { ComponentProps } from 'react'
import { TEXTES_DECLARATION } from '@/features/declaration/textes'

type Proprietes = Omit<
  ComponentProps<'input'>,
  'id' | 'className' | 'aria-invalid' | 'aria-describedby' | 'type'
> & {
  /** Message de validation sous le champ, lu avec le champ. */
  erreur?: string
}

const ID = 'declaration-prenom'

/**
 * Champ « Votre prénom » (écran T56) : libellé, exemple d'initiale, champ de 52 px comme les
 * écrans de connexion, erreur, puis l'information sur ce qu'en fait EJP Tech. Exemple et
 * information sont lus avec le champ. Le lien « Confidentialité » est en pied de colonne.
 */
export function ChampPrenom({ erreur, ...proprietes }: Proprietes) {
  const idAide = `${ID}-aide`
  const idErreur = `${ID}-erreur`
  const idInformation = `${ID}-information`
  const decritPar = [idAide, erreur ? idErreur : '', idInformation].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={ID} className="text-[15px] font-semibold">
        {TEXTES_DECLARATION.libelle}
      </label>
      <p id={idAide} className="text-sm leading-normal text-encre-3">
        {TEXTES_DECLARATION.aide}
      </p>
      <input
        {...proprietes}
        id={ID}
        type="text"
        autoComplete="given-name"
        autoCapitalize="words"
        spellCheck={false}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decritPar}
        className="h-13 w-full min-w-0 border border-encre bg-papier px-3.5 text-base text-encre aria-invalid:border-2 aria-invalid:border-alerte"
      />
      {erreur ? (
        <p id={idErreur} className="text-[15px] leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
      <p id={idInformation} className="text-sm leading-normal text-encre-3">
        {TEXTES_DECLARATION.information}
      </p>
    </div>
  )
}
