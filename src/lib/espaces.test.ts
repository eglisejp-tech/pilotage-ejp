import { afterEach, describe, expect, it } from 'vitest'
import {
  analyserRegistre,
  avecActif,
  avecCompte,
  avecNouvelEspace,
  CLE_REGISTRE,
  cleDeStockage,
  ecrireRegistre,
  espaceActif,
  espacesConnus,
  lirePassageDEspace,
  lireRegistre,
  NOMBRE_MAX_ESPACES,
  noterPassageDEspace,
  registreParDefaut,
  sansCompte,
  sansEspace,
} from '@/lib/espaces'
import type { Registre } from '@/lib/espaces'

const PLATEFORME = {
  id: 'principal',
  cle: null,
  utilisateur: '20000000-0000-4000-8000-000000000005',
  libelle: 'EJP Tech, compte 1',
  type: 'admin_plateforme' as const,
}
const TECH = {
  id: 'tech0001',
  cle: 'sb-pilotage-espace-tech0001-auth-token',
  utilisateur: '20000000-0000-4000-8000-000000000014',
  libelle: 'Ministère Tech',
  type: 'ministere' as const,
}
const DEUX: Registre = { actif: 'principal', espaces: [PLATEFORME, TECH] }

afterEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe('registre des comptes ouverts (T73)', () => {
  it('sans registre : un seul espace, dans la clé par défaut de Supabase', () => {
    expect(analyserRegistre(null)).toEqual(registreParDefaut())
    expect(espaceActif(registreParDefaut())).toEqual({ id: 'principal', cle: null })
  })

  it('un registre illisible ou douteux revient au cas d’un seul compte', () => {
    const douteux = [
      '{pas du json',
      JSON.stringify({ actif: 'a', espaces: [] }),
      // Une clé de stockage qui n'est pas celle d'un espace (celle d'un autre réglage du site).
      JSON.stringify({ actif: 'a', espaces: [{ id: 'a', cle: 'pilotage-avancement' }] }),
      JSON.stringify({
        actif: 'a',
        espaces: [
          { id: 'a', cle: null },
          { id: 'a', cle: null },
        ],
      }),
      JSON.stringify({
        actif: 'a',
        espaces: Array.from({ length: NOMBRE_MAX_ESPACES + 1 }, (_, rang) => ({
          id: `e${rang}`,
          cle: null,
        })),
      }),
    ]
    for (const brut of douteux) expect(analyserRegistre(brut)).toEqual(registreParDefaut())
  })

  it('un espace actif inconnu : le premier espace devient actif', () => {
    expect(analyserRegistre(JSON.stringify({ ...DEUX, actif: 'disparu' })).actif).toBe('principal')
  })

  it('écrit et relit le registre, sans jeton ni email', () => {
    ecrireRegistre(DEUX)
    expect(lireRegistre()).toEqual(DEUX)
    const brut = window.localStorage.getItem(CLE_REGISTRE) ?? ''
    expect(brut).not.toMatch(/@|access_token|refresh_token/)
  })

  it('clé de stockage : celle de Supabase pour le premier espace, une clé propre ensuite', () => {
    expect(cleDeStockage(PLATEFORME, 'http://127.0.0.1:54321')).toBe('sb-127-auth-token')
    expect(cleDeStockage(PLATEFORME, 'https://ugbitornbspatpcowlvg.supabase.co')).toBe(
      'sb-ugbitornbspatpcowlvg-auth-token',
    )
    expect(cleDeStockage(TECH, 'https://ugbitornbspatpcowlvg.supabase.co')).toBe(TECH.cle)
  })

  it('ajouter un compte : un espace vide, actif, avec sa propre clé ; quatre au plus', () => {
    const ajout = avecNouvelEspace(DEUX)
    expect(ajout).not.toBeNull()
    const { registre, espace } = ajout!
    expect(registre.actif).toBe(espace.id)
    expect(espace.cle).toMatch(/^sb-pilotage-espace-[a-z0-9]{12}-auth-token$/)
    expect(espace.libelle).toBeUndefined()
    expect(analyserRegistre(JSON.stringify(registre))).toEqual(registre)
    const plein = avecNouvelEspace(registre)!.registre
    expect(plein.espaces).toHaveLength(NOMBRE_MAX_ESPACES)
    expect(avecNouvelEspace(plein)).toBeNull()
  })

  it('retirer l’espace actif : le premier restant devient actif ; jamais le dernier', () => {
    expect(sansEspace(DEUX, 'principal')).toEqual({ actif: 'tech0001', espaces: [TECH] })
    expect(sansEspace({ ...DEUX, actif: 'tech0001' }, 'principal').actif).toBe('tech0001')
    const seul: Registre = { actif: 'principal', espaces: [PLATEFORME] }
    expect(sansEspace(seul, 'principal')).toEqual(seul)
  })

  it('passer à un espace connu seulement', () => {
    expect(avecActif(DEUX, 'tech0001').actif).toBe('tech0001')
    expect(avecActif(DEUX, 'inconnu')).toEqual(DEUX)
  })

  it('noter un compte : les autres espaces du même compte sont des doublons', () => {
    const nouveau = { id: 'neuf00000001', cle: 'sb-pilotage-espace-neuf00000001-auth-token' }
    const registre: Registre = { actif: nouveau.id, espaces: [PLATEFORME, TECH, nouveau] }
    const { registre: suivant, doublons } = avecCompte(registre, nouveau.id, {
      utilisateur: PLATEFORME.utilisateur,
      libelle: PLATEFORME.libelle,
      type: PLATEFORME.type,
    })
    expect(doublons).toEqual([PLATEFORME])
    expect(suivant.espaces[2]).toMatchObject({ libelle: 'EJP Tech, compte 1' })
  })

  it('oublier le compte d’un espace garde sa clé ; la liste ne montre que les comptes connus', () => {
    const oublie = sansCompte(DEUX, 'tech0001')
    expect(oublie.espaces[1]).toEqual({ id: 'tech0001', cle: TECH.cle })
    expect(espacesConnus(oublie)).toEqual([PLATEFORME])
  })

  it('le passage d’un espace à l’autre se lit une seule fois (ouverture de T67 non rejouée)', () => {
    expect(lirePassageDEspace()).toBe(false)
    noterPassageDEspace()
    expect(lirePassageDEspace()).toBe(true)
    expect(lirePassageDEspace()).toBe(false)
  })
})
