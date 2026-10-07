import { describe, expect, it } from 'vitest'
import { CODES_A_RETIRER, TEXTES_AIDE, texteAide } from '@/components/aide/textesAide'

// Règles de rédaction : docs/conception/aides-contextuelles.md, section 2.
const ENTREES = Object.entries(TEXTES_AIDE)

// Tiret cadratin et demi-cadratin, écrits par leur code pour que ce fichier n'en contienne aucun.
const TIRETS = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)
const MOTS_INTERDITS = [
  /\bcliquez\b/i,
  /\bici\b/i,
  /\bsimplement\b/i,
  /\bjuste\b/i,
  /n'oubliez pas/i,
]
// Le vocabulaire de l'outil dit « 6 sur 8 », « moins de 3 » : pas de jargon (règle 5).
const JARGON = [/complétude/i, /agrégat/i, /\bnature\b/i, /\bsensibles?\b/i, /\bseuil\b/i]
const SIGLES = new Set(['STAR', 'FIJ', 'EJP'])

function nombreDePhrases(texte: string): number {
  return texte.split(/(?<=[.!?])\s+(?=[A-ZÀÂÉÈÊÎÔÛÇ«])/u).length
}

describe('catalogue des aides (T38)', () => {
  // Étapes 5 et 6 (lot C0) : 8 aides proposées, ajoutées à la fin du catalogue (écran 13 et
  // configuration des indicateurs).
  it('compte 28 textes de référence, 3 codes à retirer et 8 aides de l’étape 6 (aides-contextuelles.md, section 6)', () => {
    expect(ENTREES).toHaveLength(31 + 8)
    expect(CODES_A_RETIRER).toHaveLength(3)
    for (const code of CODES_A_RETIRER) expect(Object.keys(TEXTES_AIDE)).toContain(code)
  })

  // Règle 3 : on dit ce qu'est le chiffre, pas ce que la personne ne doit pas savoir ni faire.
  it.each(ENTREES.filter(([code]) => !(CODES_A_RETIRER as readonly string[]).includes(code)))(
    '%s : dit ce que c’est, sans tournure négative',
    (code, texte) => {
      expect(texte, code).not.toMatch(/\b(pas|jamais|ne peut|ne comptent)\b/i)
    },
  )

  it('nomme chaque code « écran.sujet », sans doublon', () => {
    const codes = ENTREES.map(([code]) => code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const code of codes) expect(code, code).toMatch(/^[a-z]+\.[a-zA-Z0-9]+$/)
  })

  it.each(ENTREES)(
    '%s : 120 caractères au plus, une ou deux phrases, finit par un point',
    (code, texte) => {
      expect(texte.length, code).toBeLessThanOrEqual(120)
      expect(nombreDePhrases(texte), code).toBeLessThanOrEqual(2)
      expect(texte, code).toMatch(/\.$/)
      expect(texte, code).toBe(texte.trim())
    },
  )

  it.each(ENTREES)(
    '%s : ni tiret cadratin, ni emoji, ni point d’exclamation, ni mot interdit',
    (code, texte) => {
      expect(texte, code).not.toMatch(TIRETS)
      expect(texte, code).not.toMatch(/\p{Extended_Pictographic}/u)
      expect(texte, code).not.toContain('!')
      for (const interdit of MOTS_INTERDITS)
        expect(texte, `${code} ${interdit}`).not.toMatch(interdit)
    },
  )

  it.each(ENTREES)(
    '%s : français simple, sans jargon ni majuscules d’insistance',
    (code, texte) => {
      for (const mot of JARGON) expect(texte, `${code} ${mot}`).not.toMatch(mot)
      const majuscules = texte.match(/\b[A-ZÀ-Ý]{3,}\b/gu) ?? []
      expect(
        majuscules.filter((mot) => !SIGLES.has(mot)),
        code,
      ).toEqual([])
    },
  )

  it.each(ENTREES)(
    '%s : ponctuation française (deux-points précédé d’une espace, guillemets « »)',
    (code, texte) => {
      expect(texte, code).not.toMatch(/\S:/)
      expect(texte, code).not.toContain('"')
      // Les guillemets français vont par paires.
      expect((texte.match(/«/g) ?? []).length, code).toBe((texte.match(/»/g) ?? []).length)
    },
  )

  it('ne contient aucun nom de personne ni de ministère dans un exemple', () => {
    const texte = ENTREES.map(([, valeur]) => valeur).join(' ')
    for (const nom of ['Jean', 'Communication', 'Coordination', 'Intégration', 'Protocole']) {
      expect(texte).not.toContain(nom)
    }
  })

  it('texteAide rend le texte du code', () => {
    expect(texteAide('dimanche.service')).toBe(TEXTES_AIDE['dimanche.service'])
  })

  // Le lot W0 ne pose aucune aide sur un écran : chaque lot pose les siennes. Le lot I active ce
  // contrôle (chaque code est utilisé au moins une fois dans le code, hors catalogue et tests).
  it.todo('chaque code est utilisé au moins une fois dans le code (lot I)')
})
