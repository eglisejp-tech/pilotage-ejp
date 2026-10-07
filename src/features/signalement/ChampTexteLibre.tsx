import type { ComponentProps } from 'react'
import { LONGUEUR_MAX_SIGNALEMENT } from '@/features/signalement/textes'
import { Compteur } from '@/features/saisie/Compteur'
import { RappelDonneesPersonnelles } from '@/features/saisie/RappelDonneesPersonnelles'

type Props = Omit<
  ComponentProps<'textarea'>,
  'id' | 'className' | 'aria-invalid' | 'aria-describedby'
> & {
  id: string
  libelle: string
  /** Nombre de caractères écrits, pour le compteur « 0 sur 280 », toujours visible. */
  longueur: number
  /** Phrase visible entre le libellé et le champ (ce qu'on attend du texte). */
  note?: string
  /** Premier champ libre du formulaire : le rappel sur les données personnelles le suit. */
  avecRappel?: boolean
  erreur?: string
}

/**
 * Champ libre long (280 caractères : texte d'un signalement, commentaire de clôture). Sous le
 * champ : le rappel sur les données personnelles s'il est le premier champ libre du formulaire
 * (une seule fois, BRIEF règle 9), le compteur « 0 sur 280 », puis le message d'erreur, chacun
 * relié au champ par `aria-describedby`. Le compteur passe en couleur d'alerte au-delà de 280.
 */
export function ChampTexteLibre({
  id,
  libelle,
  longueur,
  note,
  avecRappel = false,
  erreur,
  ...proprietes
}: Props) {
  const idNote = `${id}-note`
  const idRappel = `${id}-rappel`
  const idCompteur = `${id}-compteur`
  const idErreur = `${id}-erreur`
  const decritPar = [
    note ? idNote : '',
    avecRappel ? idRappel : '',
    idCompteur,
    erreur ? idErreur : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-semibold">
        {libelle}
      </label>
      {note ? (
        <p id={idNote} className="text-sm leading-normal text-encre-2">
          {note}
        </p>
      ) : null}
      <textarea
        {...proprietes}
        id={id}
        rows={4}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decritPar}
        className="min-h-28 w-full min-w-0 resize-y border border-encre bg-papier px-3.5 py-3 text-base leading-normal text-encre aria-invalid:border-2 aria-invalid:border-alerte"
      />
      {avecRappel ? <RappelDonneesPersonnelles id={idRappel} /> : null}
      <Compteur id={idCompteur} valeur={longueur} max={LONGUEUR_MAX_SIGNALEMENT} />
      {erreur ? (
        <p id={idErreur} className="text-[15px] leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </div>
  )
}
