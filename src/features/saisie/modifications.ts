// Ce que la personne a changé dans un panneau de saisie (m265) : sans rien demander aux
// formulaires, le panneau note la valeur de chaque champ juste avant le premier geste qui peut la
// changer (pression, touche, saisie, focus), puis compare à la fermeture. Un champ remis à sa
// valeur de départ ne compte pas comme changé ; un champ que la personne n'a jamais approché non
// plus, même si le formulaire le remplit seul (lecture qui arrive, réussite qui le remet à jour).

type Champ = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

/** Types d'`<input>` qui ne portent aucune saisie. */
const SANS_SAISIE = new Set(['button', 'submit', 'reset', 'image', 'hidden', 'file'])

function champsDe(racine: HTMLElement): Champ[] {
  return Array.from(racine.querySelectorAll<Champ>('input, textarea, select')).filter(
    (champ) => !(champ instanceof HTMLInputElement && SANS_SAISIE.has(champ.type)),
  )
}

/** Valeur comparable d'un champ : la case cochée ou non, les options choisies, ou le texte. */
function etat(champ: Champ): string {
  if (champ instanceof HTMLInputElement && (champ.type === 'checkbox' || champ.type === 'radio')) {
    return champ.checked ? '1' : '0'
  }
  if (champ instanceof HTMLSelectElement && champ.multiple) {
    return Array.from(champ.selectedOptions, (option) => option.value).join('\n')
  }
  return champ.value
}

export type References = WeakMap<Element, string>

/** Note la valeur des champs pas encore notés (avant tout changement venu de la personne). */
export function noterReferences(racine: HTMLElement, references: References) {
  for (const champ of champsDe(racine)) {
    if (!references.has(champ)) references.set(champ, etat(champ))
  }
}

/** Un champ noté a-t-il une autre valeur maintenant ? */
export function aChange(racine: HTMLElement, references: References): boolean {
  return champsDe(racine).some((champ) => {
    const reference = references.get(champ)
    return reference !== undefined && reference !== etat(champ)
  })
}

/**
 * Gestes qui précèdent tout changement venu de la personne : écouter leur phase de capture sur le
 * panneau permet de noter les valeurs avant que le champ ne change.
 */
export const GESTES_AVANT_CHANGEMENT = [
  'pointerdown',
  'mousedown',
  'touchstart',
  'keydown',
  'beforeinput',
  'focusin',
] as const
