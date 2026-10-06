import type { Ref } from 'react'
import { Aide } from '@/components/aide/Aide'
import { TEXTES_EVENEMENT } from '@/features/evenements/textes'

export interface MinistreAMentionner {
  id: string
  nom: string
}

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
}

/**
 * Mentions facultatives d'un nouvel événement (T32) : une case par ministère actif autre que
 * celui du compte, comme dans « Nouveau point ». Sous les cases, la note du BRIEF (« Le ministère
 * mentionné verra cet événement, et seulement cet événement. ») et le texte visible « Les mentions
 * se choisissent à la création et ne changent plus. ». Sans autre ministère actif, une phrase à la
 * place des cases, sans aide ni note (pas d'aide sur un état vide).
 */
export function ChoixMentions({
  id,
  ministeres,
  valeur,
  onChange,
  onBlur,
  refPremier,
  erreur,
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
      className="flex min-w-0 flex-col gap-1.5"
    >
      <div className="flex min-h-cible flex-wrap items-center">
        <p id={idTitre} className="text-[15px] font-semibold">
          {TEXTES_EVENEMENT.titreMentions}
        </p>
        {vide ? null : (
          <Aide code="evenement.mentions" libelle={TEXTES_EVENEMENT.libelleMentions} />
        )}
      </div>
      {vide ? (
        <p className="text-encre-2">{TEXTES_EVENEMENT.aucuneMention}</p>
      ) : (
        <ul className="flex flex-col">
          {ministeres.map((ministere, rang) => (
            <li key={ministere.id}>
              <label className="inline-flex min-h-cible items-center gap-3 text-base">
                <input
                  ref={rang === 0 ? refPremier : undefined}
                  type="checkbox"
                  name={id}
                  value={ministere.id}
                  checked={valeur.includes(ministere.id)}
                  onChange={(evenement) => basculer(ministere.id, evenement.target.checked)}
                  onBlur={onBlur}
                  aria-invalid={erreur ? true : undefined}
                  aria-describedby={erreur ? idErreur : undefined}
                  className="size-5 accent-encre"
                />
                {ministere.nom}
              </label>
            </li>
          ))}
        </ul>
      )}
      {vide ? null : (
        <div id={idNote} className="flex flex-col gap-1 text-sm leading-normal text-encre-3">
          <p>{TEXTES_EVENEMENT.noteMentions}</p>
          <p>{TEXTES_EVENEMENT.mentionsFigees}</p>
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
