import type { Ref } from 'react'
import type { MinistreAMentionner } from '@/features/evenements/ChoixMentions'
import { TEXTES_POINT } from '@/features/nouveau-point/textes'

interface Props {
  id: string
  /** Ministères actifs autres que celui du compte, dans l'ordre alphabétique. */
  ministeres: readonly MinistreAMentionner[]
  /** Identifiants cochés. */
  valeur: readonly string[]
  onChange: (ids: string[]) => void
  onBlur?: () => void
  refPremier?: Ref<HTMLInputElement>
  erreur?: string
  /** Titre du groupe : « Mentionner un ministère (facultatif) » à la création. */
  titre?: string
  /** Notes sous les boutons : celles de la création par défaut. */
  notes?: readonly string[]
}

/**
 * Mentions facultatives d'un nouveau point (maquette 10) : un bouton à cocher par ministère actif
 * autre que celui du compte. Un ministère coché prend le fond `--encre`, le gras et un « ✓ »
 * (jamais la couleur seule). Sous les boutons, la note du BRIEF (le ministère mentionné verra ce
 * point, et seulement ce point) et la ligne « Les mentions se choisissent à la création et ne
 * changent plus. ». Sans autre ministère actif, une phrase à la place des boutons, sans note. Pas
 * d'aide en bulle : la note visible dit déjà ce qu'il faut (le formulaire garde trois aides).
 * « Modifier les mentions » (T54) réutilise ces boutons avec son titre et ses notes.
 */
export function ChoixMentionsPoint({
  id,
  ministeres,
  valeur,
  onChange,
  onBlur,
  refPremier,
  erreur,
  titre = TEXTES_POINT.titreMentions,
  notes = [TEXTES_POINT.noteMentions, TEXTES_POINT.mentionsFigees],
}: Props) {
  const idTitre = `${id}-titre`
  const idNote = `${id}-note`
  const idErreur = `${id}-erreur`
  const vide = ministeres.length === 0

  const basculer = (ministere: string, coche: boolean) =>
    onChange(coche ? [...valeur, ministere] : valeur.filter((autre) => autre !== ministere))

  return (
    <fieldset
      aria-labelledby={idTitre}
      aria-describedby={
        [vide ? '' : idNote, erreur ? idErreur : ''].filter(Boolean).join(' ') || undefined
      }
      className="flex min-w-0 flex-col gap-2"
    >
      <p id={idTitre} className="text-[15px] font-semibold">
        {titre}
      </p>
      {vide ? (
        <p className="text-encre-2">{TEXTES_POINT.aucuneMention}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {ministeres.map((ministere, rang) => {
            const coche = valeur.includes(ministere.id)
            return (
              <li key={ministere.id} className="flex">
                <label className="relative flex">
                  <input
                    ref={rang === 0 ? refPremier : undefined}
                    type="checkbox"
                    name={id}
                    value={ministere.id}
                    checked={coche}
                    onChange={(evenement) => basculer(ministere.id, evenement.target.checked)}
                    onBlur={onBlur}
                    aria-invalid={erreur ? true : undefined}
                    aria-describedby={erreur ? idErreur : undefined}
                    className="peer sr-only"
                  />
                  <span className="inline-flex min-h-cible cursor-pointer items-center gap-2 border border-encre bg-papier px-3.5 text-[15px] font-medium text-encre peer-checked:bg-encre peer-checked:font-bold peer-checked:text-papier peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-encre">
                    {coche ? <span aria-hidden="true">✓</span> : null}
                    {ministere.nom}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
      {vide ? null : (
        <div id={idNote} className="flex flex-col gap-1 text-sm leading-normal text-encre-3">
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}
      {erreur ? (
        <p id={idErreur} className="text-[15px] leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </fieldset>
  )
}
