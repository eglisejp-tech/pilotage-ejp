import type { Ref } from 'react'
import { PRIORITES_POINT, TEXTES_POINT } from '@/features/nouveau-point/textes'
import { ChoixSegmente } from '@/features/saisie/ChoixSegmente'
import type { Priorite } from '@/lib/base'

interface Props {
  /** Préfixe des identifiants et nom du groupe de boutons radio. */
  id: string
  /** Priorité choisie (« normale » au départ). */
  valeur: Priorite
  onChange: (priorite: Priorite) => void
  onBlur?: () => void
  /** Reçoit le premier bouton. */
  refPremier?: Ref<HTMLInputElement>
  erreur?: string
}

/**
 * Choix de la priorité (maquette 10) : trois vrais boutons radio côte à côte, le choix en fond
 * `--encre` et en gras (jamais la couleur seule), en un seul bloc de 48 px (proposition 9, T69 :
 * le même que les types de session et les statuts). Le titre « Priorité », sans bulle (l'ordre de
 * tri n'est pas à expliquer, T66 t237), est lu par `aria-labelledby`, comme le statut d'un
 * événement.
 */
export function ChoixPriorite({ id, valeur, onChange, onBlur, refPremier, erreur }: Props) {
  const idTitre = `${id}-titre`
  const idErreur = `${id}-erreur`
  return (
    <fieldset
      aria-labelledby={idTitre}
      aria-describedby={erreur ? idErreur : undefined}
      className="flex min-w-0 flex-col gap-1.5"
    >
      <p id={idTitre} className="text-interface font-semibold">
        {TEXTES_POINT.libellePriorite}
      </p>
      <ChoixSegmente
        nom={id}
        choix={PRIORITES_POINT}
        valeur={valeur}
        onChange={onChange}
        onBlur={onBlur}
        refPremier={refPremier}
        idErreur={erreur ? idErreur : undefined}
      />
      {erreur ? (
        <p id={idErreur} className="text-interface leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </fieldset>
  )
}
