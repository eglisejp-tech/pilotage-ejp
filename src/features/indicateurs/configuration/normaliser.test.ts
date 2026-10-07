import { describe, expect, it } from 'vitest'
import { normaliser } from '@/features/indicateurs/configuration/normaliser'

// Même règle que `private.normaliser` de la base : le nom d'un ministère doit donner le code du
// modèle de la coordination (« coordo fij », « sante »).

describe('normaliser', () => {
  it.each([
    ['Prodiges Junior', 'prodiges junior'],
    ['Santé', 'sante'],
    ['Sécurité', 'securite'],
    ['Coordo FIJ', 'coordo fij'],
    ['MCAD', 'mcad'],
    ['Intégration', 'integration'],
    ['  Kumi  ', 'kumi'],
    ["Prodiges  Academy  (l'école)", 'prodiges academy l ecole'],
    ['Œuvres d’Été', 'oeuvres d ete'],
    ['Nombre de projets en cours', 'projets en cours'],
    ['Nombre des demandes', 'demandes'],
    ['FIJ', 'fij'],
  ])('%s donne %s', (texte, attendu) => {
    expect(normaliser(texte)).toBe(attendu)
  })

  it('retire chaque lettre accentuée de la liste de la base, en minuscule et en majuscule', () => {
    expect(normaliser('àâäáãåçéèêëíìîïñóòôöõúùûüýÿ')).toBe('aaaaaaceeeeiiiinooooouuuuyy')
    expect(normaliser('ÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸ')).toBe('aaaaaaceeeeiiiinooooouuuuyy')
  })

  it('ne garde que lettres et chiffres, séparés par une espace', () => {
    expect(normaliser('A-B/C_D 12')).toBe('a b c d 12')
    expect(normaliser('')).toBe('')
  })

  it("ne retire « nombre de » que de tête, et seulement suivi d'un mot", () => {
    expect(normaliser('Total nombre de gens')).toBe('total nombre de gens')
    expect(normaliser('Nombre')).toBe('nombre')
  })
})
