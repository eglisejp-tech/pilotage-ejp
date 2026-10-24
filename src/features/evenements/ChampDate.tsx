import type { ComponentProps, ReactNode } from 'react'
import { Champ } from '@/components/ui/Champ'
import { appelleUnSignalement } from '@/features/evenements/refus'
import { dateEnToutesLettres } from '@/features/evenements/textes'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'
import type { EcranSignalement } from '@/lib/base'
import { estDateIso } from '@/lib/metier/dates'

type Props = Omit<
  ComponentProps<'input'>,
  'id' | 'type' | 'className' | 'aria-invalid' | 'aria-describedby'
> & {
  id: string
  libelle: string
  /**
   * Indication sous le champ, lue avec lui (« Le dernier jour où une réponse vous est utile. ») :
   * ce qu'il faut pour remplir se voit, jamais dans une bulle (T66).
   */
  note?: string
  /** Message sous le champ, relié par `aria-describedby`. */
  erreur?: string
  /**
   * Formulaire d'événement : écran d'origine du lien « Signaler une difficulté », sous une date
   * refusée. Sans lui (réunion), le message n'a pas de lien (aides-contextuelles.md, section 7).
   */
  ecran?: EcranSignalement
  /** Ligne sous le champ, après l'erreur (« Report : du sam. 10 oct. au sam. 17 oct. »). */
  apres?: ReactNode
  /** Identifiants d'autres lignes qui décrivent le champ (la ligne « Report » de `apres`). */
  idsDecrits?: readonly string[]
  /**
   * Date choisie (AAAA-MM-JJ) : si elle est valide, elle s'écrit sous le champ en toutes lettres
   * (« samedi 10 octobre 2026 », maquette 11), dans une zone annoncée poliment, pour vérifier le
   * jour de la semaine.
   */
  dateChoisie?: string
}

/**
 * Champ date d'un formulaire de saisie (maquette 11) : libellé, champ de 52 px, indication
 * éventuelle, puis le message d'erreur. Une date refusée (T37) se dit sous le champ, suivie de
 * « Vous ne pouvez pas choisir de date ? Signaler une difficulté » (aides-contextuelles.md,
 * section 7) ; les autres messages n'ont pas de lien.
 */
export function ChampDate({
  id,
  libelle,
  note,
  erreur,
  ecran,
  apres,
  idsDecrits = [],
  dateChoisie,
  ...proprietes
}: Props) {
  const idNote = `${id}-note`
  const idErreur = `${id}-erreur`
  const decritPar = [note ? idNote : '', erreur ? idErreur : '', ...idsDecrits]
    .filter(Boolean)
    .join(' ')
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-interface font-semibold">
        {libelle}
      </label>
      <Champ
        {...proprietes}
        id={id}
        type="date"
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decritPar || undefined}
      />
      {note ? (
        <p id={idNote} className="text-detail leading-normal text-encre-2">
          {note}
        </p>
      ) : null}
      <p aria-live="polite" className="text-interface text-encre-2">
        {dateChoisie !== undefined && estDateIso(dateChoisie)
          ? dateEnToutesLettres(dateChoisie)
          : null}
      </p>
      {erreur ? (
        <p id={idErreur} className="text-interface leading-normal text-alerte">
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
