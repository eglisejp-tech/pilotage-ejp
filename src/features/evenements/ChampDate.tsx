import type { ComponentProps, ReactNode } from 'react'
import { LibelleAvecAide } from '@/components/aide/LibelleAvecAide'
import type { CodeAide } from '@/components/aide/textesAide'
import { appelleUnSignalement } from '@/features/evenements/refus'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'
import type { EcranSignalement } from '@/lib/base'

type Props = Omit<
  ComponentProps<'input'>,
  'id' | 'type' | 'className' | 'aria-invalid' | 'aria-describedby'
> & {
  id: string
  libelle: string
  /** Aide en bulle à côté du libellé (au plus une par champ). */
  aide?: CodeAide
  /** Message sous le champ, relié par `aria-describedby`. */
  erreur?: string
  /**
   * Formulaire d'événement : écran d'origine du lien « Signaler une difficulté », sous une date
   * refusée. Sans lui (réunion), le message n'a pas de lien (aides-contextuelles.md, section 7).
   */
  ecran?: EcranSignalement
  /** Ligne sous le champ, après l'erreur (« Report : du sam. 10 oct. au sam. 17 oct. »). */
  apres?: ReactNode
}

/**
 * Champ date d'un formulaire de saisie (maquette 11) : libellé, aide éventuelle, champ de 52 px,
 * puis le message d'erreur. Une date refusée (T37) se dit sous le champ, suivie de « Vous ne
 * pouvez pas choisir de date ? Signaler une difficulté » (aides-contextuelles.md, section 7) ;
 * les autres messages n'ont pas de lien.
 */
export function ChampDate({ id, libelle, aide, erreur, ecran, apres, ...proprietes }: Props) {
  const idErreur = `${id}-erreur`
  return (
    <div className="flex flex-col gap-1.5">
      {aide ? (
        <LibelleAvecAide htmlFor={id} libelle={libelle} code={aide} />
      ) : (
        <label htmlFor={id} className="text-[15px] font-semibold">
          {libelle}
        </label>
      )}
      <input
        {...proprietes}
        id={id}
        type="date"
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? idErreur : undefined}
        className="h-13 w-full min-w-0 border border-encre bg-papier px-3.5 text-base text-encre aria-invalid:border-2 aria-invalid:border-alerte"
      />
      {erreur ? (
        <p id={idErreur} className="text-[15px] leading-normal text-alerte">
          {erreur}
          {ecran && appelleUnSignalement(erreur) ? (
            <>
              {' '}
              {TEXTES_SIGNALEMENT.questionDate} <LienSignalement ecran={ecran} enLigne />
            </>
          ) : null}
        </p>
      ) : null}
      {apres}
    </div>
  )
}
