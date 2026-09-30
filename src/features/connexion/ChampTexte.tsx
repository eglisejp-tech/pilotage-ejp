import type { ComponentProps, ReactNode } from 'react'

type Proprietes = Omit<
  ComponentProps<'input'>,
  'id' | 'className' | 'aria-invalid' | 'aria-describedby'
> & {
  id: string
  libelle: string
  /** Aide sous le libellé, lue avec le champ (aria-describedby). */
  aide?: ReactNode
  /** Message de validation sous le champ, lu avec le champ (aria-describedby). */
  erreur?: string
}

/** Champ de texte des maquettes 16 : libellé au-dessus, 52 px de haut, filet encre. */
export function ChampTexte({ id, libelle, aide, erreur, ...proprietes }: Proprietes) {
  const idAide = `${id}-aide`
  const idErreur = `${id}-erreur`
  const decritPar = [aide ? idAide : '', erreur ? idErreur : ''].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-semibold">
        {libelle}
      </label>
      {aide ? (
        <p id={idAide} className="text-sm leading-normal text-encre-3">
          {aide}
        </p>
      ) : null}
      <input
        {...proprietes}
        id={id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decritPar || undefined}
        className="h-13 w-full min-w-0 border border-encre bg-papier px-3.5 text-base text-encre aria-invalid:border-2 aria-invalid:border-alerte"
      />
      {erreur ? (
        <p id={idErreur} className="text-[15px] leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </div>
  )
}
