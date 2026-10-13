// Ce que la personne a changé dans un panneau de saisie (m265), sans rien demander aux formulaires.
//
// - Chaque champ a une valeur de départ, notée dès qu'il entre dans le panneau (à l'ouverture ou
//   plus tard : lecture qui arrive, étape suivante), puis remise à jour à chaque changement du
//   panneau et juste avant chaque geste, tant que la personne ne l'a pas changé.
// - Un champ est changé par la personne quand il reçoit un événement `input` ou `change` (doigt,
//   clavier, ou outil qui choisit une option sans geste), ou quand sa valeur change pendant un
//   geste (bouton « Ajouter un », case qui en coche d'autres). Le formulaire qui remplit un champ
//   seul, hors de tout geste (lecture qui arrive), ne le change jamais au nom de la personne.
// - À la fermeture, la saisie est modifiée si un champ changé par la personne n'a plus sa valeur
//   de départ. Un champ remis à sa valeur de départ ne compte pas ; un champ changé sans valeur de
//   départ connue compte (mieux vaut demander que perdre une saisie).

type Champ = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

/** Types d'`<input>` qui ne portent aucune saisie. */
const SANS_SAISIE = new Set(['button', 'submit', 'reset', 'image', 'hidden', 'file'])

function estChamp(element: EventTarget | null): element is Champ {
  if (element instanceof HTMLInputElement) return !SANS_SAISIE.has(element.type)
  return element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
}

function champsDe(racine: HTMLElement): Champ[] {
  return Array.from(racine.querySelectorAll('input, textarea, select')).filter(estChamp)
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

/** Valeurs de départ des champs, et champs que la personne a changés. */
export interface SuiviSaisie {
  references: WeakMap<Element, string>
  changes: WeakSet<Element>
}

export function nouveauSuivi(): SuiviSaisie {
  return { references: new WeakMap(), changes: new WeakSet() }
}

/**
 * Note la valeur de départ des champs que la personne n'a pas changés : ce que le formulaire y
 * met seul (lecture, réussite, autre semaine) devient leur point de départ.
 */
export function noterReferences(racine: HTMLElement, suivi: SuiviSaisie) {
  for (const champ of champsDe(racine)) {
    if (!suivi.changes.has(champ)) suivi.references.set(champ, etat(champ))
  }
}

/**
 * Un événement `input` ou `change` est arrivé sur `cible` : la personne a changé ce champ. Pour un
 * bouton radio, tout son groupe compte, car cocher l'un décoche l'autre sans événement.
 */
export function noterChangement(
  racine: HTMLElement,
  cible: EventTarget | null,
  suivi: SuiviSaisie,
) {
  if (!estChamp(cible)) return
  if (cible instanceof HTMLInputElement && cible.type === 'radio' && cible.name !== '') {
    for (const champ of champsDe(racine)) {
      if (
        champ instanceof HTMLInputElement &&
        champ.type === 'radio' &&
        champ.name === cible.name
      ) {
        suivi.changes.add(champ)
      }
    }
  }
  suivi.changes.add(cible)
}

/** Valeur de chaque champ juste avant un geste. */
export type Releve = Map<Element, string>

export function releverValeurs(racine: HTMLElement): Releve {
  return new Map(champsDe(racine).map((champ) => [champ, etat(champ)]))
}

/**
 * Après un geste : un champ dont la valeur a changé depuis le relevé a été changé par la personne
 * (bouton « Ajouter un », « Retirer un »), avec pour départ sa valeur d'avant le geste.
 */
export function noterChangementsDepuis(racine: HTMLElement, releve: Releve, suivi: SuiviSaisie) {
  for (const champ of champsDe(racine)) {
    const avant = releve.get(champ)
    if (avant === undefined || suivi.changes.has(champ) || avant === etat(champ)) continue
    suivi.references.set(champ, avant)
    suivi.changes.add(champ)
  }
}

/** Un champ changé par la personne a-t-il une autre valeur que sa valeur de départ ? */
export function aChange(racine: HTMLElement, suivi: SuiviSaisie): boolean {
  return champsDe(racine).some(
    (champ) => suivi.changes.has(champ) && suivi.references.get(champ) !== etat(champ),
  )
}

/**
 * Un clic : une case ou un bouton radio est déjà basculé quand l'événement arrive, et son `input`
 * ne viendra qu'après le rendu du formulaire. Le clic est donc lui-même le changement.
 */
export function noterClic(racine: HTMLElement, cible: EventTarget | null, suivi: SuiviSaisie) {
  if (cible instanceof HTMLInputElement && (cible.type === 'checkbox' || cible.type === 'radio')) {
    noterChangement(racine, cible, suivi)
  }
}

/**
 * Gestes qui précèdent un changement venu de la personne : écouter leur phase de capture sur le
 * panneau permet de noter les valeurs juste avant que le champ ne change. Le clic n'en fait pas
 * partie (une case est déjà basculée quand il arrive) : il a son propre traitement, `noterClic`,
 * et un relevé pour les boutons qui changent un champ (il arrive aussi au clavier, par Entrée ou
 * Espace).
 */
export const GESTES_AVANT_CHANGEMENT = [
  'pointerdown',
  'mousedown',
  'touchstart',
  'keydown',
  'beforeinput',
  'focusin',
] as const

/** Événements d'un changement fait par la personne (jamais émis quand React change une valeur). */
export const CHANGEMENTS = ['input', 'change'] as const
