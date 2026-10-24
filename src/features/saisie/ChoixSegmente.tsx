import { useLayoutEffect, useRef, useState } from 'react'
import type { Ref, RefObject } from 'react'
import { cn } from '@/lib/utils'

export interface ChoixPossible<V extends string> {
  valeur: V
  libelle: string
}

interface Props<V extends string> {
  /** Nom du groupe de boutons radio (un par groupe dans la page). */
  nom: string
  choix: readonly ChoixPossible<V>[]
  /** Valeur choisie, ou chaîne vide avant le premier choix. */
  valeur: V | ''
  onChange: (valeur: V) => void
  onBlur?: () => void
  /** Reçoit le premier bouton, pour y porter le focus quand le choix manque. */
  refPremier?: Ref<HTMLInputElement>
  /** Message d'erreur du groupe : chaque bouton est alors en erreur et décrit par lui. */
  idErreur?: string
  /**
   * `ligne` (défaut) : côte à côte quand chaque libellé tient sur une ligne, sinon les uns sous
   * les autres. `grille` : deux colonnes au moins quand la place le permet (les six statuts d'un
   * événement, maquette 11) ; un libellé long passe à la ligne entre deux mots.
   */
  disposition?: 'ligne' | 'grille'
}

/**
 * Un libellé choisi passe en gras : un peu plus large que le libellé mesuré au repos. La marge
 * garde la ligne quand le choix change (Public Sans : le gras est environ 6 % plus large).
 */
const MARGE_DU_GRAS = 1.08

/**
 * Vrai quand tous les choix tiennent côte à côte, chaque libellé sur une seule ligne, dans des
 * cases de même largeur. La mesure suit la largeur du groupe et celle des libellés (arrivée des
 * polices, texte agrandi à 1440 px). Sans ResizeObserver (tests jsdom), les choix restent côte à
 * côte.
 */
function useCoteACote(groupe: RefObject<HTMLDivElement | null>, actif: boolean): boolean {
  const [coteACote, setCoteACote] = useState(true)
  useLayoutEffect(() => {
    const conteneur = groupe.current
    if (!actif || conteneur === null || typeof ResizeObserver !== 'function') return
    const libelles = Array.from(conteneur.querySelectorAll<HTMLElement>('[data-libelle]'))
    const mesurer = () => {
      const caseChoix = libelles[0]?.parentElement
      if (!caseChoix) return
      const style = getComputedStyle(caseChoix)
      // Marges intérieures et bordures d'une case : le libellé n'a que le reste.
      const autour = [
        style.paddingLeft,
        style.paddingRight,
        style.borderLeftWidth,
        style.borderRightWidth,
      ].reduce((somme, valeur) => somme + (Number.parseFloat(valeur) || 0), 0)
      const plusLarge = Math.max(
        ...libelles.map((libelle) => libelle.getBoundingClientRect().width),
      )
      const besoin = libelles.length * (plusLarge * MARGE_DU_GRAS + autour)
      setCoteACote(conteneur.clientWidth >= besoin)
    }
    mesurer()
    const observateur = new ResizeObserver(mesurer)
    observateur.observe(conteneur)
    for (const libelle of libelles) observateur.observe(libelle)
    return () => observateur.disconnect()
  }, [groupe, actif])
  return coteACote
}

/**
 * Choix exclusif en un seul bloc (proposition 9, T69) : de vrais boutons radio, des cases de
 * 48 px aux bordures communes, le choix en fond `--encre` et en gras (jamais la couleur seule).
 * Aucun mot n'est coupé : quand un libellé ne tient plus sur une ligne à côté des autres, les
 * choix se mettent les uns sous les autres (écart 3 : les trois types de session dans le
 * panneau). Le titre du groupe reste à l'écran qui l'utilise (`<legend>` ou `aria-labelledby`).
 */
export function ChoixSegmente<V extends string>({
  nom,
  choix,
  valeur,
  onChange,
  onBlur,
  refPremier,
  idErreur,
  disposition = 'ligne',
}: Props<V>) {
  const groupe = useRef<HTMLDivElement>(null)
  const enLigne = disposition === 'ligne'
  const coteACote = useCoteACote(groupe, enLigne)
  const uneLigne = enLigne && coteACote

  return (
    // Bordures communes : chaque case recouvre d'un pixel la bordure de ses voisines de gauche et
    // du dessus ; le groupe rend ce pixel.
    <div
      ref={groupe}
      data-disposition={enLigne ? (coteACote ? 'ligne' : 'colonne') : 'grille'}
      className={cn(
        'pt-px pl-px',
        enLigne
          ? cn('flex', coteACote ? 'flex-row' : 'flex-col')
          : 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,9.5rem),1fr))]',
      )}
    >
      {choix.map((option, rang) => (
        // Le choix qui a le focus passe devant ses voisines : son contour reste entier.
        <label
          key={option.valeur}
          className={cn(
            'relative -mt-px -ml-px flex min-w-0 focus-within:z-10',
            uneLigne && 'flex-1 basis-0',
          )}
        >
          <input
            ref={rang === 0 ? refPremier : undefined}
            type="radio"
            name={nom}
            value={option.valeur}
            checked={valeur === option.valeur}
            onChange={() => onChange(option.valeur)}
            onBlur={onBlur}
            aria-invalid={idErreur ? true : undefined}
            aria-describedby={idErreur}
            className="peer sr-only"
          />
          <span className="flex min-h-12 w-full cursor-pointer items-center justify-center border border-encre bg-papier px-3 py-1 text-center text-interface leading-tight font-medium text-encre peer-checked:bg-encre peer-checked:font-bold peer-checked:text-papier peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-encre">
            <span data-libelle className={cn(uneLigne && 'whitespace-nowrap')}>
              {option.libelle}
            </span>
          </span>
        </label>
      ))}
    </div>
  )
}
