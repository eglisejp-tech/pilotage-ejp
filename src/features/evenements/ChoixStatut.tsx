import type { Ref } from 'react'
import { Aide } from '@/components/aide/Aide'
import { STATUTS_EVENEMENT, TEXTES_EVENEMENT } from '@/features/evenements/textes'
import { ChoixSegmente } from '@/features/saisie/ChoixSegmente'
import type { StatutEvenement } from '@/lib/base'

/** Le statut du formulaire (texte libre du schéma), s'il est l'un des six ; sinon aucun. */
function valeurChoisie(valeur: string): StatutEvenement | '' {
  return STATUTS_EVENEMENT.find((statut) => statut.valeur === valeur)?.valeur ?? ''
}

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
 * fond `--encre`, en un seul bloc aux bordures communes de 48 px (proposition 9, T69) ; « En
 * attente de validation » passe à la ligne entre deux mots, comme dans la maquette. Le titre « Statut » et son aide sont hors d'une `<legend>` (le nom du groupe
 * garderait « Aide : ... ») : le groupe le lit par `aria-labelledby`. Plus de note sous les
 * statuts : « Ici, on reporte seulement le statut » faisait parler l'outil de lui (T66, t131).
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
  const idErreur = `${id}-erreur`
  const decritPar = [ligneAuDessus ? idLigne : '', erreur ? idErreur : ''].filter(Boolean).join(' ')

  return (
    <fieldset
      aria-labelledby={idTitre}
      aria-describedby={decritPar || undefined}
      className="flex min-w-0 flex-col gap-1.5"
    >
      <div className="flex min-h-cible flex-wrap items-center">
        <p id={idTitre} className="text-interface font-semibold">
          {TEXTES_EVENEMENT.libelleStatut}
        </p>
        <Aide code="evenement.statut" libelle={TEXTES_EVENEMENT.libelleStatut} />
      </div>
      {ligneAuDessus ? (
        <p
          id={idLigne}
          className="border border-filet bg-papier px-3.5 py-3 text-interface leading-normal text-encre"
        >
          {ligneAuDessus}
        </p>
      ) : null}
      <ChoixSegmente
        nom={id}
        choix={STATUTS_EVENEMENT}
        valeur={valeurChoisie(valeur)}
        onChange={onChange}
        onBlur={onBlur}
        refPremier={refPremier}
        idErreur={erreur ? idErreur : undefined}
        disposition="grille"
      />
      {erreur ? (
        <p id={idErreur} className="text-interface leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </fieldset>
  )
}
