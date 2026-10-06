import { useId } from 'react'
import { Aide } from '@/components/aide/Aide'
import { ChampNombre } from '@/features/saisie/ChampNombre'
import { idGrille } from '@/features/saisie-chiffres/envoi'
import { CATEGORIE_MAX } from '@/features/saisie-chiffres/schemas'
import { ligneNonReparti, TEXTES_CHIFFRES } from '@/features/saisie-chiffres/textes'
import type { EtatGrille } from '@/features/saisie-chiffres/valeurs'

interface Props {
  indicateurId: string
  /** Catégories en cours de la liste de la coordination, dans leur ordre. */
  categories: readonly { code: string; libelle: string }[]
  valeurs: Readonly<Record<string, string>>
  onChange: (code: string, valeur: string) => void
  /** Première grille du formulaire : l'aide `mois.repartition` sur son titre. */
  aide: boolean
  /** Ligne calculée en direct sous la grille. */
  etat: EtatGrille
  /** Refus avant l'envoi ou de la base : il remplace la ligne calculée. */
  erreur?: string
}

/**
 * « Répartition (facultatif) » d'un indicateur sensible qui a des catégories (P47) : un petit
 * champ par catégorie, dans l'ordre de la liste, et la ligne calculée en direct « Non réparti :
 * 3 ». La somme ne dépasse jamais le total : la ligne le dit dès la saisie, et rien ne part tant
 * qu'elle dépasse. Une grille vide n'envoie aucune répartition.
 */
export function GrilleRepartition({
  indicateurId,
  categories,
  valeurs,
  onChange,
  aide,
  etat,
  erreur,
}: Props) {
  const idTitre = useId()
  const id = idGrille(indicateurId)
  const message =
    erreur ?? (etat.etat === 'depasse' || etat.etat === 'erreur' ? etat.message : null)
  return (
    <div
      id={id}
      role="group"
      tabIndex={-1}
      aria-labelledby={idTitre}
      className="flex flex-col gap-2 outline-hidden"
    >
      <div className="flex min-h-cible flex-wrap items-center">
        <p id={idTitre} className="text-sm font-semibold">
          {TEXTES_CHIFFRES.grilleTitre}
        </p>
        {aide ? <Aide code="mois.repartition" libelle={TEXTES_CHIFFRES.grilleTitre} /> : null}
      </div>
      <div className="grid grid-cols-2 gap-3 min-[600px]:grid-cols-3">
        {categories.map((categorie) => (
          <ChampNombre
            key={categorie.code}
            id={`${id}-${categorie.code}`}
            libelle={categorie.libelle}
            valeur={valeurs[categorie.code] ?? ''}
            onChange={(valeur) => onChange(categorie.code, valeur)}
            max={CATEGORIE_MAX}
            variante="compact"
          />
        ))}
      </div>
      <p aria-live="polite" className="text-[15px] leading-normal">
        {message !== null ? (
          <span className="text-alerte">{message}</span>
        ) : etat.etat === 'reste' ? (
          <span className="font-semibold">{ligneNonReparti(etat.reste)}</span>
        ) : null}
      </p>
    </div>
  )
}
