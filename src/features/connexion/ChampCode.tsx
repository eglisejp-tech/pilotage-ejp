import { useState } from 'react'
import type { ClipboardEvent, Ref, SyntheticEvent } from 'react'
import { chiffresDuCode, LONGUEUR_CODE } from '@/features/connexion/schemas'

const CASES = Array.from({ length: LONGUEUR_CODE }, (_, index) => index)

// Maquette 18 : cases de 68 px et chiffres de 56 px. Maquette 17 : 56 px et 44 px.
const TAILLES = {
  grande: 'h-17 text-[56px]',
  moyenne: 'h-14 text-[44px]',
} as const

type Proprietes = {
  id: string
  name: string
  value: string
  onChange: (valeur: string) => void
  onBlur: () => void
  ref?: Ref<HTMLInputElement>
  disabled?: boolean
  taille: keyof typeof TAILLES
  /** Message de validation, affiché sous les cases et lu avec le champ. */
  erreur?: string
  /** Autre élément qui décrit le champ (bandeau d'erreur du serveur). */
  decritPar?: string
}

/**
 * Code à 6 chiffres (maquettes 17 et 18). Les six cases sont un dessin (aria-hidden) : la saisie
 * passe par UN seul champ posé par-dessus, inputmode="numeric", autocomplete="one-time-code",
 * maxlength 6, pour que le collage, le remplissage automatique et les lecteurs d'écran
 * fonctionnent (docs/reference/maquettes/LISEZMOI.md). Son libellé est rendu par le parent.
 */
export function ChampCode({
  id,
  name,
  value,
  onChange,
  onBlur,
  ref,
  disabled,
  taille,
  erreur,
  decritPar,
}: Proprietes) {
  const [actif, setActif] = useState(false)
  const idErreur = `${id}-erreur`
  const descriptions = [erreur ? idErreur : '', decritPar ?? ''].filter(Boolean).join(' ')
  const invalide = Boolean(erreur)
  const caseCourante = Math.min(value.length, LONGUEUR_CODE - 1)

  // Un code collé remplace le code entier (« 482 913 », « Code : 482913 ») ; quelques chiffres
  // collés s'insèrent à la place du curseur. maxlength couperait « 482 913 » avant le nettoyage.
  function coller(evenement: ClipboardEvent<HTMLInputElement>) {
    evenement.preventDefault()
    const chiffres = evenement.clipboardData.getData('text/plain').replace(/\D/g, '')
    if (chiffres.length === 0) return
    if (chiffres.length >= LONGUEUR_CODE) {
      onChange(chiffres.slice(0, LONGUEUR_CODE))
      return
    }
    const champ = evenement.currentTarget
    const debut = champ.selectionStart ?? value.length
    const fin = champ.selectionEnd ?? value.length
    onChange(chiffresDuCode(value.slice(0, debut) + chiffres + value.slice(fin)))
  }

  // Les chiffres sont invisibles dans le champ : un clic au milieu ne doit pas y placer le
  // curseur. Un curseur isolé revient à la fin ; une sélection (tout sélectionner) est gardée.
  function garderCurseurALaFin(evenement: SyntheticEvent<HTMLInputElement>) {
    const champ = evenement.currentTarget
    const fin = champ.value.length
    if (champ.selectionStart === champ.selectionEnd && champ.selectionStart !== fin) {
      champ.setSelectionRange(fin, fin)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input
          ref={ref}
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={LONGUEUR_CODE}
          spellCheck={false}
          value={value}
          disabled={disabled}
          onChange={(evenement) => onChange(chiffresDuCode(evenement.target.value))}
          onPaste={coller}
          onSelect={garderCurseurALaFin}
          onFocus={() => setActif(true)}
          onBlur={() => {
            setActif(false)
            onBlur()
          }}
          aria-invalid={invalide || undefined}
          aria-describedby={descriptions || undefined}
          className="peer absolute inset-0 z-10 size-full cursor-text border-0 bg-transparent text-base text-transparent caret-transparent outline-hidden selection:bg-transparent selection:text-transparent"
        />
        <div
          aria-hidden="true"
          className="grid grid-cols-6 gap-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-encre"
        >
          {CASES.map((index) => {
            const chiffre = value[index]
            const bordure =
              actif && index === caseCourante
                ? 'border-2 border-encre-3'
                : invalide
                  ? 'border-2 border-alerte'
                  : chiffre
                    ? 'border border-encre'
                    : 'border border-encre-3'
            return (
              <span
                key={index}
                className={`flex min-w-0 items-center justify-center bg-papier font-chiffres leading-none font-extrabold tabular-nums ${TAILLES[taille]} ${bordure}`}
              >
                {chiffre}
              </span>
            )
          })}
        </div>
      </div>
      {erreur ? (
        <p id={idErreur} className="text-[15px] leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </div>
  )
}
