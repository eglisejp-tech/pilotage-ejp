// Tests des garde-fous du design (scripts/verifier-design.mjs, T69, proposition 19) : sur des
// textes donnés, aucun fichier lu.
import { describe, expect, it } from 'vitest'
import { comparer, compter, estAnalyse, verifierLargeurs } from '../../scripts/verifier-design.mjs'
import largeursTs from '@/lib/largeurs.ts?raw'

describe('verifier-design', () => {
  it('analyse le code de l’application, pas les tests', () => {
    expect(estAnalyse('src/features/points/LignePoint.tsx')).toBe(true)
    expect(estAnalyse('src/lib/largeurs.ts')).toBe(true)
    expect(estAnalyse('src/features/points/LignePoint.test.tsx')).toBe(false)
    expect(estAnalyse('src/test/setup.ts')).toBe(false)
    expect(estAnalyse('scripts/verifier-design.mjs')).toBe(false)
  })

  it('trouve ce que les fondations remplacent', () => {
    const texte = [
      '<p className="text-[15px] text-sm min-[600px]:flex lg:grid max-w-[720px]">',
      '<button className="hover:bg-fond transition-colors active:scale-98 rounded-full">',
      '<select>',
      '<div role="alertdialog" className="border-l-4">',
    ].join('\n')
    expect(compter(texte)).toEqual({
      'taille-ecrite': [1, 1],
      'palier-ecrit': [1, 1],
      'largeur-phrase': [1],
      'survol-pale': [2],
      'animation-ecrite': [2, 2],
      arrondi: [2],
      'liste-native': [3],
      'fenetre-recopiee': [4],
      'barre-bord': [4],
    })
  })

  it('laisse passer les fondations, les commentaires et les mots voisins', () => {
    const texte = [
      '<p className="text-interface text-note tablette:flex ordinateur:grid max-w-lecture">',
      '// ancien : text-[15px] et max-w-[720px]',
      ' * min-[600px]: dans un commentaire',
      '<Bouton className="w-full">{/* rounded */}</Bouton>',
      'const lg = 1; const texte = "md"',
      '<span className="max-w-prose-x text-encre-3 text-lg-bis">',
    ].join('\n')
    expect(compter(texte)).toEqual({})
  })

  it('exempte le composant de fondation de sa propre règle', () => {
    expect(compter('<select>', 'src/components/ui/ListeDeroulante.tsx')).toEqual({})
    expect(
      compter('<dialog role="alertdialog">', 'src/components/ui/FenetreConfirmation.tsx'),
    ).toEqual({})
    expect(compter('<select>', 'src/features/x/Liste.tsx')).toEqual({ 'liste-native': [1] })
    // Une fenêtre à champs construite sur la fondation n'est pas une fenêtre recopiée.
    const surFondation = 'useFenetreModale(fenetre, annuler)\n<dialog ref={fenetre} role="dialog">'
    expect(compter(surFondation, 'src/features/x/FenetreMotif.tsx')).toEqual({})
    expect(compter('<div role="dialog">', 'src/features/x/FenetreMotif.tsx')).toEqual({
      'fenetre-recopiee': [1],
    })
  })

  it('refuse toute hausse au-dessus du plafond, et signale les plafonds à baisser', () => {
    const comptes = {
      'src/a.tsx': { 'taille-ecrite': [3, 4, 9] },
      'src/b.tsx': { 'taille-ecrite': [1] },
      'src/nouveau.tsx': { 'liste-native': [2] },
    }
    const plafonds = { 'taille-ecrite': { 'src/a.tsx': 2, 'src/b.tsx': 4, 'src/c.tsx': 1 } }
    const { erreurs, aBaisser } = comparer(comptes, plafonds)
    expect(
      erreurs.map(({ regle, fichier, nombre, limite }) => [regle.code, fichier, nombre, limite]),
    ).toEqual([
      ['taille-ecrite', 'src/a.tsx', 3, 2],
      ['liste-native', 'src/nouveau.tsx', 1, 0],
    ])
    expect(aBaisser).toEqual([
      { regle: 'taille-ecrite', fichier: 'src/b.tsx', nombre: 1, limite: 4 },
      { regle: 'taille-ecrite', fichier: 'src/c.tsx', nombre: 0, limite: 1 },
    ])
  })

  it('vérifie que LARGEURS suit les largeurs nommées du CSS', () => {
    const css = [
      '--breakpoint-tablette: 600px;',
      '--breakpoint-tablette-large: 768px;',
      '--breakpoint-ordinateur: 1024px;',
      '--breakpoint-ordinateur-large: 1280px;',
      '--breakpoint-grand-ecran: 1440px;',
    ].join('\n')
    expect(verifierLargeurs(css, largeursTs)).toEqual([])
    expect(verifierLargeurs(css.replace('1440px', '1536px'), largeursTs)).toEqual([
      'src/index.css : --breakpoint-grand-ecran devrait valoir 1440px (LARGEURS).',
    ])
  })
})
