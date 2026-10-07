import type { Ref } from 'react'
import { Aide } from '@/components/aide/Aide'
import { STATUTS_EVENEMENT, TEXTES_EVENEMENT } from '@/features/evenements/textes'

interface Props {
  /** Préfixe des identifiants et nom du groupe de boutons radio. */
  id: string
  /** Statut choisi, ou chaîne vide avant le premier choix. */
  valeur: string
  onChange: (statut: string) => void
  onBlur?: () => void
  /** Reçoit le premier bouton, pour y porter le focus quand le statut manque. */
  refPremier?: Ref<HTMLInputElement>
  erreur?: string
  /** Ligne au-dessus des statuts (événement à confirmer, validation-metier.md 4.4). */
  ligneAuDessus?: string
}

/**
 * Choix du statut d'un événement (maquette 11) : six boutons radio en deux colonnes, le choix en
 * fond `--encre`. Le titre « Statut » et son aide sont hors d'une `<legend>` (le nom du groupe
 * garderait « Aide : ... ») : le groupe le lit par `aria-labelledby`. Sous les statuts, le texte
 * visible « La validation se fait en dehors de l'outil. Ici, on reporte seulement le statut. »,
 * qui sert à chaque saisie (ce n'est pas une aide en bulle).
 */
export function ChoixStatut({
  id,
  valeur,
  onChange,
  onBlur,
  refPremier,
  erreur,
  ligneAuDessus,
}: Props) {
  const idTitre = `${id}-titre`
  const idLigne = `${id}-ligne`
  const idNote = `${id}-note`
  const idErreur = `${id}-erreur`
  const decritPar = [ligneAuDessus ? idLigne : '', idNote, erreur ? idErreur : '']
    .filter(Boolean)
    .join(' ')

  return (
    <fieldset
      aria-labelledby={idTitre}
      aria-describedby={decritPar}
      className="flex min-w-0 flex-col gap-1.5"
    >
      <div className="flex min-h-cible flex-wrap items-center">
        <p id={idTitre} className="text-[15px] font-semibold">
          {TEXTES_EVENEMENT.libelleStatut}
        </p>
        <Aide code="evenement.statut" libelle={TEXTES_EVENEMENT.libelleStatut} />
      </div>
      {ligneAuDessus ? (
        <p
          id={idLigne}
          className="border border-filet bg-papier px-3.5 py-3 text-[15px] leading-normal text-encre"
        >
          {ligneAuDessus}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {STATUTS_EVENEMENT.map((statut, rang) => (
          <label key={statut.valeur} className="relative flex">
            <input
              ref={rang === 0 ? refPremier : undefined}
              type="radio"
              name={id}
              value={statut.valeur}
              checked={valeur === statut.valeur}
              onChange={() => onChange(statut.valeur)}
              onBlur={onBlur}
              aria-invalid={erreur ? true : undefined}
              aria-describedby={erreur ? idErreur : undefined}
              className="peer sr-only"
            />
            <span className="flex min-h-12 w-full cursor-pointer items-center justify-center border border-encre bg-papier px-2 py-1 text-center text-[15px] leading-tight font-medium text-encre peer-checked:bg-encre peer-checked:font-bold peer-checked:text-papier peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-encre">
              {statut.libelle}
            </span>
          </label>
        ))}
      </div>
      <p id={idNote} className="text-sm leading-normal text-encre-3">
        {TEXTES_EVENEMENT.noteStatut}
      </p>
      {erreur ? (
        <p id={idErreur} className="text-[15px] leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </fieldset>
  )
}
