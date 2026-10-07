// Aides de calcul du champ numérique (ChampNombre) : le champ garde un texte, pour qu'une saisie
// en cours (champ vide) ne devienne jamais un 0 que la personne n'a pas écrit.

/**
 * Ne garde que les chiffres, sans zéro de tête (« 007 » devient « 7 », « 0 » reste « 0 »). Le
 * texte reste un texte : un long nombre collé ne devient jamais « 1e+21 » ni un nombre arrondi.
 */
export function garderChiffres(texte: string): string {
  return texte.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
}

/** Plus ou moins un, entre 0 et `max` : un champ vide compte pour 0. */
export function ajusterNombre(texte: string, delta: 1 | -1, max: number): string {
  const actuel = texte === '' ? 0 : Number(garderChiffres(texte))
  return String(Math.min(Math.max(actuel + delta, 0), max))
}

/** Nombre écrit dans le champ, ou null s'il est vide. */
export function lireNombre(texte: string): number | null {
  const chiffres = garderChiffres(texte)
  return chiffres === '' ? null : Number(chiffres)
}
