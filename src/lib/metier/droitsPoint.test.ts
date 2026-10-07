import { describe, expect, it } from 'vitest'
import type { StatutPoint, TypeCompte } from '@/lib/base'
import {
  commentaireTraiteObligatoire,
  lienAuPoint,
  peutChangerStatut,
  peutMarquerTraite,
} from './droitsPoint'
import type { CompteDeDroits, PointDeDroits } from './droitsPoint'

const SOCIAL = 'm-social'
const KUMI = 'm-kumi'
const AUTRE = 'm-autre'

const POINT: PointDeDroits = { statut: 'a_traiter', ministereId: SOCIAL, mentions: [KUMI] }
const TRAITE: PointDeDroits = { ...POINT, statut: 'traite' }

const compte = (type: TypeCompte, ministereId: string | null = null): CompteDeDroits => ({
  type,
  ministereId,
})

const createur = compte('ministere', SOCIAL)
const mentionne = compte('ministere', KUMI)
const etranger = compte('ministere', AUTRE)
const berger = compte('berger')
const conseil = compte('conseil')
const administration = compte('admin_eglise')
const ejpTech = compte('admin_plateforme')

describe('lienAuPoint', () => {
  it('le ministère créateur et un ministère mentionné ont un lien', () => {
    expect(lienAuPoint(createur, POINT)).toBe('createur')
    expect(lienAuPoint(mentionne, POINT)).toBe('mentionne')
  })

  it('un autre ministère n’a aucun lien', () => {
    expect(lienAuPoint(etranger, POINT)).toBeNull()
  })

  it('un compte sans ministère n’a jamais de lien, même si l’identifiant ressemble', () => {
    for (const sans of [berger, conseil, administration, ejpTech]) {
      expect(lienAuPoint(sans, POINT), sans.type).toBeNull()
    }
    expect(lienAuPoint({ type: 'berger', ministereId: SOCIAL }, POINT)).toBeNull()
    expect(lienAuPoint({ type: 'ministere', ministereId: null }, POINT)).toBeNull()
  })

  it('un point sans mention n’a que son créateur', () => {
    expect(lienAuPoint(mentionne, { ...POINT, mentions: [] })).toBeNull()
    expect(lienAuPoint(createur, { ...POINT, mentions: [] })).toBe('createur')
  })
})

describe('peutChangerStatut', () => {
  it('le créateur et un ministère mentionné changent le statut', () => {
    expect(peutChangerStatut(createur, POINT)).toBe(true)
    expect(peutChangerStatut(mentionne, POINT)).toBe(true)
  })

  it('le berger et le conseil ne changent pas les statuts : ils marquent traité (BRIEF règle 7)', () => {
    expect(peutChangerStatut(berger, POINT)).toBe(false)
    expect(peutChangerStatut(conseil, POINT)).toBe(false)
  })

  it('ni un autre ministère, ni l’administration, ni EJP Tech', () => {
    for (const refuse of [etranger, administration, ejpTech]) {
      expect(peutChangerStatut(refuse, POINT), refuse.type).toBe(false)
    }
  })

  it('personne ne change le statut d’un point traité', () => {
    for (const c of [createur, mentionne, berger, conseil, administration, ejpTech]) {
      expect(peutChangerStatut(c, TRAITE), c.type).toBe(false)
    }
  })

  it.each<StatutPoint>(['a_traiter', 'en_cours', 'attente_decision'])(
    'le statut %s reste modifiable par le créateur',
    (statut) => {
      expect(peutChangerStatut(createur, { ...POINT, statut })).toBe(true)
    },
  )
})

describe('peutMarquerTraite', () => {
  it('le créateur, un ministère mentionné, le berger et le conseil marquent traité', () => {
    for (const c of [createur, mentionne, berger, conseil]) {
      expect(peutMarquerTraite(c, POINT), c.type).toBe(true)
    }
  })

  it('jamais EJP Tech ni l’administration de l’église (T29), ni un autre ministère', () => {
    for (const refuse of [ejpTech, administration, etranger]) {
      expect(peutMarquerTraite(refuse, POINT), refuse.type).toBe(false)
    }
  })

  it('un point traité ne se rouvre pas : plus de bouton pour personne', () => {
    for (const c of [createur, mentionne, berger, conseil, administration, ejpTech]) {
      expect(peutMarquerTraite(c, TRAITE), c.type).toBe(false)
    }
  })

  it('un point « en attente de décision » se marque traité', () => {
    expect(peutMarquerTraite(berger, { ...POINT, statut: 'attente_decision' })).toBe(true)
  })
})

describe('commentaireTraiteObligatoire', () => {
  it('obligatoire pour un ministère lié au point, facultatif pour le berger et le conseil', () => {
    expect(commentaireTraiteObligatoire(createur, POINT)).toBe(true)
    expect(commentaireTraiteObligatoire(mentionne, POINT)).toBe(true)
    expect(commentaireTraiteObligatoire(berger, POINT)).toBe(false)
    expect(commentaireTraiteObligatoire(conseil, POINT)).toBe(false)
  })
})
