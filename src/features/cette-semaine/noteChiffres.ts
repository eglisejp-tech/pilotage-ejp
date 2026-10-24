import { TEXTES_VIDES } from './textesVides'
import type { DonneesCourbe } from './types'

/**
 * Note sous le tableau des chiffres de l'église (proposition 11, T69). La règle du STAR compté
 * une fois l'a quittée (T66, t180) : elle ira dans la page Aide, qui reste à créer (guide de
 * rédaction, section 6). Tant qu'aucune courbe n'a deux points, la note est la phrase du premier
 * usage (LISEZMOI, « Premier usage ») ; ensuite, elle dit la période des courbes, puis ce que
 * disent un trou et un rond vide.
 */
export function noteDesChiffres(lignes: readonly { courbe: DonneesCourbe | null }[]): string {
  const uneCourbe = lignes.some(
    (ligne) => (ligne.courbe?.points.filter((point) => point.valeur !== null).length ?? 0) >= 2,
  )
  return uneCourbe ? TEXTES_VIDES.chiffres.noteCourbes : TEXTES_VIDES.chiffres.notePremierUsage
}
