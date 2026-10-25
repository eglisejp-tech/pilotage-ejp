import type { Ref } from 'react'
import { phraseCoches, TEXTES_SESSIONS } from '@/features/sessions/textes'

export interface MinistereAChoisir {
  id: string
  nom: string
}

interface Props {
  id: string
  /** Ministères actifs, dans l'ordre alphabétique. */
  ministeres: readonly MinistereAChoisir[]
  /** Identifiants cochés. */
  valeur: readonly string[]
  onChange: (ids: string[]) => void
  refPremier?: Ref<HTMLInputElement>
  /**
   * Indication sous le titre, lue avec le groupe (« Décochez les ministères qui ne participent
   * pas. ») : ce qu'il faut pour remplir se voit, jamais dans une bulle (T66).
   */
  note?: string
  erreur?: string
  /**
   * EJP Tech, qui ajoute les ministères (T60) : sans ministère actif, la phrase lui dit où les
   * ajouter. L'administration de l'église lit à la place qu'EJP Tech les crée.
   */
  gestionMinisteres?: boolean
}

/**
 * Ministères attendus d'une session (maquette 14) : une case par ministère actif, toutes cochées
 * à la déclaration, avec « 8 sur 8 » en face du titre, puis l'indication éventuelle. Chaque case
 * fait 44 px de haut au moins.
 */
export function ChoixMinisteres({
  id,
  ministeres,
  valeur,
  onChange,
  refPremier,
  note,
  erreur,
  gestionMinisteres = false,
}: Props) {
  const idTitre = `${id}-titre`
  const idNote = `${id}-note`
  const idErreur = `${id}-erreur`
  const basculer = (ministere: string, coche: boolean) =>
    onChange(coche ? [...valeur, ministere] : valeur.filter((autre) => autre !== ministere))
  const coches = ministeres.filter((ministere) => valeur.includes(ministere.id)).length
  const avecNote = note !== undefined && ministeres.length > 0
  const decritPar = [avecNote ? idNote : '', erreur ? idErreur : ''].filter(Boolean).join(' ')

  return (
    <fieldset
      aria-labelledby={idTitre}
      aria-describedby={decritPar || undefined}
      className="flex min-w-0 flex-col gap-1"
    >
      <div className="flex min-h-cible items-center justify-between gap-3 border-b border-filet">
        <p id={idTitre} className="text-interface font-semibold">
          {TEXTES_SESSIONS.titreMinisteres}
        </p>
        <p aria-live="polite" className="text-interface text-encre-2">
          {phraseCoches(coches, ministeres.length)}
        </p>
      </div>
      {avecNote ? (
        <p id={idNote} className="pt-1 text-detail leading-normal text-encre-2">
          {note}
        </p>
      ) : null}
      {ministeres.length === 0 ? (
        <p className="py-2 text-encre-2">
          {gestionMinisteres
            ? TEXTES_SESSIONS.aucunMinistere
            : TEXTES_SESSIONS.aucunMinistereLecture}
        </p>
      ) : (
        <ul className="flex flex-col">
          {ministeres.map((ministere, rang) => (
            <li key={ministere.id} className="border-b border-filet">
              <label className="flex min-h-cible items-center gap-3 text-texte">
                <input
                  ref={rang === 0 ? refPremier : undefined}
                  type="checkbox"
                  name={id}
                  value={ministere.id}
                  checked={valeur.includes(ministere.id)}
                  onChange={(evenement) => basculer(ministere.id, evenement.target.checked)}
                  aria-invalid={erreur ? true : undefined}
                  className="size-5 accent-encre"
                />
                {ministere.nom}
              </label>
            </li>
          ))}
        </ul>
      )}
      {erreur ? (
        <p id={idErreur} className="text-interface leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </fieldset>
  )
}
