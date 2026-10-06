import { describe, expect, it } from 'vitest'
import {
  moisEnCoursSansSaisie,
  pasDeRepartition,
  TEXTES_VIDES_INDICATEURS,
  texteAjoutAValider,
} from './textesVides'

// Tiret cadratin et demi-cadratin, écrits par leur code pour que ce fichier n'en contienne aucun.
const TIRETS = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)

function textes(valeur: unknown): string[] {
  if (typeof valeur === 'string') return [valeur]
  if (valeur !== null && typeof valeur === 'object') return Object.values(valeur).flatMap(textes)
  return []
}

describe('états vides des indicateurs', () => {
  it('reprend les textes validés du catalogue (LISEZMOI)', () => {
    expect(TEXTES_VIDES_INDICATEURS.pasEncoreDeSaisie).toBe('Pas encore de saisie')
    expect(TEXTES_VIDES_INDICATEURS.sommeSansSaisie).toBe('Pas encore de saisie')
    expect(TEXTES_VIDES_INDICATEURS.propres.ministere).toBe(
      "Votre ministère n'a pas encore d'indicateur à lui. Les STARs au service, actifs et en FIJ se saisissent déjà chaque dimanche.",
    )
    expect(TEXTES_VIDES_INDICATEURS.nonCalcule).toBe('Non calculé')
  })

  it('dit les deux textes de « Indicateurs propres », selon le lecteur', () => {
    expect(TEXTES_VIDES_INDICATEURS.propres.autres).toBe(
      "Ce ministère n'a pas encore d'indicateur à lui. Il saisit les chiffres communs.",
    )
  })

  it('porte les textes proposés du plan (E2 et E3)', () => {
    expect(TEXTES_VIDES_INDICATEURS.aucunRetire).toBe('Aucun indicateur retiré.')
    expect(TEXTES_VIDES_INDICATEURS.aucuneDerniereSaisie).toBe("Aucune saisie pour l'instant.")
    expect(TEXTES_VIDES_INDICATEURS.moisSansIndicateur).toBe(
      "Votre ministère n'a pas d'indicateur du mois.",
    )
    expect(TEXTES_VIDES_INDICATEURS.actionRevenirAMaFiche).toBe('Revenir à ma fiche')
    expect(TEXTES_VIDES_INDICATEURS.actionSaisirLeMois).toBe('Saisir les chiffres du mois')
  })

  it('dit le mois en cours sans saisie, pour tout indicateur du mois, et la répartition absente', () => {
    expect(moisEnCoursSansSaisie('2026-10')).toBe('Octobre en cours : pas encore de saisie')
    expect(pasDeRepartition('2026-09')).toBe('Pas de répartition pour septembre.')
    expect(TEXTES_VIDES_INDICATEURS.repartitionMasquee).toBe(
      'Répartition masquée pour protéger les petits nombres.',
    )
  })

  it('n’a plus de texte pour le mois en cours d’un sensible : il se saisit comme les autres', () => {
    const tous = textes(TEXTES_VIDES_INDICATEURS).join(' ')
    expect(tous).not.toMatch(/une fois le mois fini/i)
  })

  it('aucun tiret cadratin ni demi-cadratin, aucun point d’exclamation, aucun zéro trompeur', () => {
    const tous = textes(TEXTES_VIDES_INDICATEURS)
    expect(tous.length).toBeGreaterThan(8)
    for (const texte of tous) {
      expect(texte).not.toMatch(TIRETS)
      expect(texte).not.toContain('!')
      expect(texte.trim()).toBe(texte)
    }
    expect(TEXTES_VIDES_INDICATEURS.pasEncoreDeSaisie).not.toMatch(/\b0\b/)
  })
})

describe('ajout à valider', () => {
  it('le ministère sait depuis combien de jours et qu’il peut déjà saisir', () => {
    expect(texteAjoutAValider('ministere', 2)).toBe(
      'À valider par EJP Tech depuis 2 jours. Vous pouvez déjà le saisir.',
    )
    expect(texteAjoutAValider('ministere', 1)).toBe(
      'À valider par EJP Tech depuis 1 jour. Vous pouvez déjà le saisir.',
    )
    expect(texteAjoutAValider('ministere', 12)).toBe(
      'À valider par EJP Tech depuis 12 jours. Vous pouvez déjà le saisir.',
    )
  })

  it('le jour même : « depuis aujourd’hui »', () => {
    expect(texteAjoutAValider('ministere', 0)).toBe(
      "À valider par EJP Tech depuis aujourd'hui. Vous pouvez déjà le saisir.",
    )
  })

  it('sans durée connue, n’invente aucune durée', () => {
    expect(texteAjoutAValider('ministere', null)).toBe(
      'À valider par EJP Tech. Vous pouvez déjà le saisir.',
    )
  })

  it('le berger, le conseil et EJP Tech lisent seulement « à valider »', () => {
    expect(texteAjoutAValider('autre', 5)).toBe('à valider')
    expect(texteAjoutAValider('autre', null)).toBe('à valider')
  })
})
