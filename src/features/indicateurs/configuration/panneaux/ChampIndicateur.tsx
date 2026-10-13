import type { ReactNode } from 'react'
import { Compteur } from '@/features/saisie/Compteur'
import { RappelDonneesPersonnelles } from '@/features/saisie/RappelDonneesPersonnelles'
import { longueurEnCaracteres } from '@/lib/metier/texte'

interface Props {
  id: string
  libelle: string
  valeur: string
  onChange: (valeur: string) => void
  /** Limite de caractères : le compteur « 12 sur 60 » s'affiche toujours, comme sur le signalement. */
  max: number
  /** Une zone de texte de trois lignes (la définition) plutôt qu'une ligne. */
  multiligne?: boolean
  /** Premier champ libre du formulaire : le rappel sur les données personnelles le suit. */
  avecRappel?: boolean
  erreur?: string
  /** Contrôles pendant la frappe (`verifier_libelle`), sous le champ. */
  controles?: ReactNode
}

/**
 * Champ libre d'un panneau de configuration : libellé, champ de 52 px (ou zone de texte), rappel
 * sur les données personnelles s'il est le premier champ libre, compteur, contrôles pendant la
 * frappe, puis l'erreur de l'envoi. Tout est relié au champ par `aria-describedby`.
 */
export function ChampIndicateur({
  id,
  libelle,
  valeur,
  onChange,
  max,
  multiligne = false,
  avecRappel = false,
  erreur,
  controles,
}: Props) {
  const idRappel = `${id}-rappel`
  const idCompteur = `${id}-compteur`
  const idControles = `${id}-controles`
  const idErreur = `${id}-erreur`
  const decritPar = [
    avecRappel ? idRappel : '',
    idCompteur,
    controles ? idControles : '',
    erreur ? idErreur : '',
  ]
    .filter(Boolean)
    .join(' ')
  const proprietes = {
    id,
    value: valeur,
    autoComplete: 'off',
    'aria-invalid': erreur ? true : undefined,
    'aria-describedby': decritPar,
  } as const
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-semibold">
        {libelle}
      </label>
      {multiligne ? (
        <textarea
          {...proprietes}
          rows={3}
          onChange={(evenement) => onChange(evenement.target.value)}
          className="min-h-24 w-full min-w-0 resize-y border border-encre bg-papier px-3.5 py-3 text-base leading-normal text-encre aria-invalid:border-2 aria-invalid:border-alerte"
        />
      ) : (
        <input
          {...proprietes}
          type="text"
          onChange={(evenement) => onChange(evenement.target.value)}
          className="h-13 w-full min-w-0 border border-encre bg-papier px-3.5 text-base text-encre aria-invalid:border-2 aria-invalid:border-alerte"
        />
      )}
      {avecRappel ? <RappelDonneesPersonnelles id={idRappel} /> : null}
      <Compteur id={idCompteur} valeur={longueurEnCaracteres(valeur)} max={max} />
      {controles ? (
        <div id={idControles} aria-live="polite" className="flex flex-col gap-1">
          {controles}
        </div>
      ) : null}
      {erreur ? (
        <p id={idErreur} className="text-[15px] leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </div>
  )
}
