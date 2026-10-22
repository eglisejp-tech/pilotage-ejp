import type { ComponentProps } from 'react'
import { Compteur } from '@/features/saisie/Compteur'

type Props = Omit<
  ComponentProps<'input'>,
  'id' | 'className' | 'aria-invalid' | 'aria-describedby'
> & {
  id: string
  libelle: string
  /**
   * Indication sous le champ, lue avec lui (« Une boîte mail partagée par le ministère... ») :
   * ce qu'il faut pour remplir se voit, jamais dans une bulle (T66).
   */
  note?: string
  /** Compteur « 42 sur 50 », affiché à partir de `compteur.des` caractères. */
  compteur?: { longueur: number; max: number; des: number }
  erreur?: string
}

/**
 * Champ d'une ligne des panneaux de l'écran 13 (nom du ministère, adresse email) : libellé, champ
 * de 52 px, indication éventuelle, compteur, puis le message d'erreur sous le champ, reliés au
 * champ par `aria-describedby`.
 */
export function ChampLigne({ id, libelle, note, compteur, erreur, ...proprietes }: Props) {
  const idNote = `${id}-note`
  const idCompteur = `${id}-compteur`
  const idErreur = `${id}-erreur`
  const avecCompteur = compteur !== undefined && compteur.longueur >= compteur.des
  const decritPar = [note ? idNote : '', avecCompteur ? idCompteur : '', erreur ? idErreur : '']
    .filter(Boolean)
    .join(' ')
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-semibold">
        {libelle}
      </label>
      <input
        {...proprietes}
        id={id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decritPar || undefined}
        className="h-13 w-full min-w-0 border border-encre bg-papier px-3.5 text-base text-encre aria-invalid:border-2 aria-invalid:border-alerte"
      />
      {note ? (
        <p id={idNote} className="text-sm leading-normal text-encre-2">
          {note}
        </p>
      ) : null}
      {compteur ? (
        <Compteur
          id={idCompteur}
          valeur={compteur.longueur}
          max={compteur.max}
          afficherDes={compteur.des}
        />
      ) : null}
      {erreur ? (
        <p id={idErreur} className="text-[15px] leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </div>
  )
}
