import { describe, expect, it } from 'vitest'
import {
  MODELE_SUGGESTION,
  NOMS_MODELES,
  nomDuModele,
} from '@/features/indicateurs/configuration/catalogue'

// Chaque modèle du catalogue privé (lignes `private.indicateur_prevu` des migrations) a son nom
// écrit pour l'écran (T72) : la liste « Nom du ministère dans la liste » et le journal ne montrent
// jamais un code comme « coordo fij ».

const MIGRATIONS = import.meta.glob<string>('../../../../supabase/migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** Codes de modèle des ajouts au catalogue : la deuxième valeur de chaque ligne. */
function modelesDesMigrations(): Set<string> {
  const modeles = new Set<string>()
  for (const texte of Object.values(MIGRATIONS)) {
    const sansCommentaires = texte.replace(/--[^\n]*/g, '')
    const ajouts = sansCommentaires.matchAll(
      /insert\s+into\s+private\.indicateur_prevu\s*\(\s*code\s*,\s*modele[^)]*\)\s*values([\s\S]*?)\);\s*\n/gi,
    )
    for (const ajout of ajouts) {
      for (const ligne of (ajout[1] ?? '').matchAll(
        /^\s*\(\s*'[a-z0-9_]+'\s*,\s*'([a-z ]+)'\s*,/gm,
      )) {
        if (ligne[1] !== undefined) modeles.add(ligne[1])
      }
    }
  }
  return modeles
}

describe('noms des modèles du catalogue (T72)', () => {
  const modeles = modelesDesMigrations()
  modeles.delete(MODELE_SUGGESTION)

  it('lit les 22 modèles des migrations', () => {
    expect(modeles.size).toBe(22)
    expect(modeles.has('coordo fij')).toBe(true)
    expect(modeles.has('protocole')).toBe(true)
  })

  it('chaque modèle a son nom dans NOMS_MODELES, et chaque nom vise un modèle', () => {
    expect([...modeles].filter((code) => !Object.hasOwn(NOMS_MODELES, code))).toEqual([])
    expect(Object.keys(NOMS_MODELES).filter((code) => !modeles.has(code))).toEqual([])
  })

  it('le nom à l’écran garde les majuscules et les accents de la liste de la coordination', () => {
    expect(nomDuModele('coordo fij')).toBe('Coordo FIJ')
    expect(nomDuModele('sante')).toBe('Santé')
    expect(nomDuModele('mcad')).toBe('MCAD')
  })
})
