// Nom normalisé d'un ministère ou d'un modèle du catalogue. Même règle que `private.normaliser`
// de la base (migration `indicateurs_definition`) : la liste de la coordination nomme chaque
// modèle par le nom normalisé du ministère, et l'écran propose le modèle dont le nom normalisé
// égale celui du ministère (configuration-indicateurs.md, 5.5). Ce n'est pas une règle métier de
// plus : si la base change sa règle, ce fichier change avec elle.

const LIGATURES: ReadonlyArray<readonly [string, string]> = [
  ['œ', 'oe'],
  ['Œ', 'OE'],
  ['æ', 'ae'],
  ['Æ', 'AE'],
]

// `translate` de la base : les 54 lettres accentuées de la liste (27 minuscules, 27 majuscules),
// dans l'ordre. Les deux chaînes ont la même longueur (vérifié par `normaliser.test.ts`).
export const AVEC_ACCENTS = 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸ'
export const SANS_ACCENTS = 'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUYY'

const CORRESPONDANCE = new Map<string, string>(
  Array.from(AVEC_ACCENTS).map((lettre, rang) => [lettre, SANS_ACCENTS.charAt(rang)]),
)

/**
 * Minuscules, accents retirés, tout signe qui n'est ni lettre ni chiffre remplacé par une espace,
 * espaces réduites et retirées aux bords, « nombre de » de tête retiré. « Prodiges Junior »
 * donne « prodiges junior », « Santé » donne « sante ».
 */
export function normaliser(texte: string): string {
  let ligne = texte
  for (const [ligature, remplacement] of LIGATURES) ligne = ligne.replaceAll(ligature, remplacement)
  const sansAccents = Array.from(ligne)
    .map((lettre) => CORRESPONDANCE.get(lettre) ?? lettre)
    .join('')
  return sansAccents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^nombre (de |d |des )/, '')
}
