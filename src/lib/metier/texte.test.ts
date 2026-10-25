import { describe, expect, it } from 'vitest'
import {
  accorder,
  comparerNoms,
  ESPACE_FINE,
  ESPACE_INSECABLE,
  lierNombres,
  listeNoms,
  longueurEnCaracteres,
  majusculeInitiale,
  MOINS,
  nombre,
  nombreEnDebutDePhrase,
  sansEspaceFine,
  terminerPhrase,
  trierNoms,
} from './texte'

// Espace insécable, pour des attentes lisibles.
const I = ESPACE_INSECABLE

describe('nombre', () => {
  it('écrit les petits nombres en chiffres', () => {
    expect(nombre(0)).toBe('0')
    expect(nombre(52)).toBe('52')
  })

  it("groupe les milliers par l'espace insécable des polices, jamais par l'espace fine", () => {
    expect(nombre(1234)).toBe(`1${I}234`)
    expect(nombre(9_999_999)).toBe(`9${I}999${I}999`)
    expect(nombre(-1234)).not.toContain(ESPACE_FINE)
  })

  it('garde une espace insécable (U+00A0), dessinée par les trois polices', () => {
    expect(ESPACE_INSECABLE).toBe(String.fromCodePoint(0xa0))
    expect(sansEspaceFine(`1${ESPACE_FINE}250${ESPACE_FINE}€`)).toBe(`1${I}250${I}€`)
  })

  it('groupe les milliers à la française, avec une espace insécable', () => {
    expect(nombre(1234)).toMatch(/^1[\u00a0\u202f]234$/)
  })

  it('écrit un nombre négatif avec le signe moins U+2212, jamais un tiret', () => {
    expect(nombre(-3)).toBe(`${MOINS}3`)
    expect(MOINS).toBe('\u2212')
    expect(nombre(-3)).not.toContain('-')
  })

  it('écrit moins zéro comme zéro', () => {
    expect(nombre(-0)).toBe('0')
  })

  it("refuse une valeur qui n'est pas un nombre fini", () => {
    expect(() => nombre(Number.NaN)).toThrow(RangeError)
    expect(() => nombre(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('nombreEnDebutDePhrase', () => {
  it('écrit en lettres de un à dix', () => {
    expect(nombreEnDebutDePhrase(1)).toBe('Un')
    expect(nombreEnDebutDePhrase(2)).toBe('Deux')
    expect(nombreEnDebutDePhrase(7)).toBe('Sept')
    expect(nombreEnDebutDePhrase(10)).toBe('Dix')
  })

  it('écrit en chiffres hors de un à dix', () => {
    expect(nombreEnDebutDePhrase(0)).toBe('0')
    expect(nombreEnDebutDePhrase(11)).toBe('11')
    expect(nombreEnDebutDePhrase(52)).toBe('52')
  })
})

describe('accorder', () => {
  it('garde le singulier pour 0 et 1, le pluriel à partir de 2', () => {
    expect(accorder(0, 'présent', 'présents')).toBe('présent')
    expect(accorder(1, 'présent', 'présents')).toBe('présent')
    expect(accorder(2, 'présent', 'présents')).toBe('présents')
  })

  it('accorde selon la valeur absolue', () => {
    expect(accorder(-1, 'présent', 'présents')).toBe('présent')
    expect(accorder(-3, 'présent', 'présents')).toBe('présents')
  })
})

describe('listeNoms', () => {
  it('rend une chaîne vide pour une liste vide', () => {
    expect(listeNoms([])).toBe('')
  })

  it('écrit « A », « A et B », « A, B et C »', () => {
    expect(listeNoms(['Social'])).toBe('Social')
    expect(listeNoms(['Coordination', 'Intégration'])).toBe('Coordination et Intégration')
    expect(listeNoms(['FIJ', 'Jeunesse', 'Social'])).toBe('FIJ, Jeunesse et Social')
    expect(listeNoms(['A', 'B', 'C', 'D'])).toBe('A, B, C et D')
  })
})

describe('trierNoms et comparerNoms', () => {
  it("suit l'ordre alphabétique français, accents compris", () => {
    const noms = ['Social', 'Intégration', 'Écoute', 'Coordination', 'EJP Formation']
    expect(trierNoms(noms)).toEqual([
      'Coordination',
      'Écoute',
      'EJP Formation',
      'Intégration',
      'Social',
    ])
  })

  it('ne modifie pas la liste reçue', () => {
    const noms = ['Social', 'Communication']
    trierNoms(noms)
    expect(noms).toEqual(['Social', 'Communication'])
  })

  it('compare deux noms', () => {
    expect(comparerNoms('Écoute', 'Social')).toBeLessThan(0)
    expect(comparerNoms('FIJ', 'FIJ')).toBe(0)
  })
})

describe('majusculeInitiale', () => {
  it('met la première lettre en majuscule, accent compris', () => {
    expect(majusculeInitiale('dimanche 27 sept.')).toBe('Dimanche 27 sept.')
    expect(majusculeInitiale('état')).toBe('État')
    expect(majusculeInitiale('')).toBe('')
  })
})

describe('terminerPhrase', () => {
  it('ajoute un point final', () => {
    expect(terminerPhrase('Il reste la date de la prochaine réunion')).toBe(
      'Il reste la date de la prochaine réunion.',
    )
  })

  it("ne double pas le point d'une abréviation finale", () => {
    expect(terminerPhrase('Il reste les chiffres du dimanche 4 oct.')).toBe(
      'Il reste les chiffres du dimanche 4 oct.',
    )
  })

  it("garde un point d'exclamation ou d'interrogation", () => {
    expect(terminerPhrase('Bravo !')).toBe('Bravo !')
    expect(terminerPhrase('Vraiment ?')).toBe('Vraiment ?')
  })
})

describe('longueurEnCaracteres', () => {
  it('compte comme char_length de la base : un émoji vaut un caractère', () => {
    expect(longueurEnCaracteres('')).toBe(0)
    expect(longueurEnCaracteres('Salle réservée')).toBe(14)
    expect(longueurEnCaracteres('🙏')).toBe(1)
    expect('🙏'.length).toBe(2)
    expect(longueurEnCaracteres('Fait 🙏🙏🙏')).toBe(8)
  })
})

describe('lierNombres', () => {
  it('lie un nombre au mot qui le suit', () => {
    expect(lierNombres("2 ministères n'ont pas encore saisi")).toBe(
      `2${I}ministères n'ont pas encore saisi`,
    )
    expect(lierNombres('le 27 sept.')).toBe(`le 27${I}sept.`)
    expect(lierNombres('le 1er oct.')).toBe(`le 1er${I}oct.`)
    expect(lierNombres(`52 STARs, 80${I}%`)).toBe(`52${I}STARs, 80${I}%`)
  })

  it('lie un petit nombre écrit en lettres, sans toucher un mot qui le contient', () => {
    expect(lierNombres('et un point attend votre décision')).toBe(
      `et un${I}point attend votre décision`,
    )
    expect(lierNombres('Deux points attendent')).toBe(`Deux${I}points attendent`)
    expect(lierNombres('aucun point, chacun le sait')).toBe('aucun point, chacun le sait')
  })

  it('garde ensemble une heure et une complétude', () => {
    expect(lierNombres('lundi 5 oct., 20 h 30')).toBe(`lundi 5${I}oct., 20${I}h${I}30`)
    expect(lierNombres('6 sur 8')).toBe(`6${I}sur${I}8`)
  })

  it('lie la ponctuation double, les guillemets et le nombre qui suit un deux-points', () => {
    expect(lierNombres('Septembre en cours. Août 2026 : 6')).toBe(
      `Septembre en cours. Août 2026${I}:${I}6`,
    )
    expect(lierNombres('Manque : Social')).toBe(`Manque${I}: Social`)
    expect(lierNombres('« Les comptes » ?')).toBe(`«${I}Les comptes${I}»${I}?`)
  })

  it('ne change pas un texte sans nombre ni ponctuation double', () => {
    expect(lierNombres('Tous les ministères ont saisi.')).toBe('Tous les ministères ont saisi.')
  })
})
