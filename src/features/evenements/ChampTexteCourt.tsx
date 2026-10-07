import type { ComponentProps } from 'react'
import { LibelleAvecAide } from '@/components/aide/LibelleAvecAide'
import type { CodeAide } from '@/components/aide/textesAide'
import { DEBUT_COMPTEUR, LONGUEUR_MAX_COURT } from '@/features/evenements/textes'
import { Compteur } from '@/features/saisie/Compteur'
import { RappelDonneesPersonnelles } from '@/features/saisie/RappelDonneesPersonnelles'

type Props = Omit<
  ComponentProps<'input'>,
  'id' | 'type' | 'className' | 'aria-invalid' | 'aria-describedby'
> & {
  id: string
  libelle: string
  /** Nombre de caractères écrits, pour le compteur « 62 sur 80 » (à partir de 60). */
  longueur: number
  aide?: CodeAide
  /** Premier champ libre du formulaire : le rappel sur les données personnelles le suit. */
  avecRappel?: boolean
  erreur?: string
}

/**
 * Champ libre court (80 caractères : nom d'un événement, objet ou décision attendue d'une
 * réunion). Sous le champ : le rappel sur les données personnelles s'il est le premier champ
 * libre du formulaire (une seule fois, BRIEF règle 9), le compteur à partir de 60 caractères, puis
 * le message d'erreur, chacun relié au champ par `aria-describedby`.
 */
export function ChampTexteCourt({
  id,
  libelle,
  longueur,
  aide,
  avecRappel = false,
  erreur,
  ...proprietes
}: Props) {
  const idRappel = `${id}-rappel`
  const idCompteur = `${id}-compteur`
  const idErreur = `${id}-erreur`
  const decritPar = [
    avecRappel ? idRappel : '',
    longueur >= DEBUT_COMPTEUR ? idCompteur : '',
    erreur ? idErreur : '',
  ]
    .filter(Boolean)
    .join(' ')

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
        type="text"
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decritPar || undefined}
        className="h-13 w-full min-w-0 border border-encre bg-papier px-3.5 text-base text-encre aria-invalid:border-2 aria-invalid:border-alerte"
      />
      {avecRappel ? <RappelDonneesPersonnelles id={idRappel} /> : null}
      <Compteur
        id={idCompteur}
        valeur={longueur}
        max={LONGUEUR_MAX_COURT}
        afficherDes={DEBUT_COMPTEUR}
      />
      {erreur ? (
        <p id={idErreur} className="text-[15px] leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </div>
  )
}
