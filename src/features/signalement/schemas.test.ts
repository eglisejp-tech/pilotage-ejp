import { describe, expect, it } from 'vitest'
import {
  contientMarqueurModeration,
  ECRANS_SIGNALEMENT,
  lireEcran,
  schemaCloture,
  schemaFormulaireCloture,
  schemaSignalement,
} from '@/features/signalement/schemas'
import { LIBELLES_ECRAN, MESSAGES_BASE_SIGNALEMENT } from '@/features/signalement/textes'

const ID = '43000000-0000-4000-8000-000000000001'

/** Messages des erreurs d'un envoi refusé par le schéma. */
function erreurs(resultat: { success: boolean; error?: { issues: { message: string }[] } }) {
  return resultat.error?.issues.map((probleme) => probleme.message) ?? []
}

describe('écran concerné', () => {
  it('les huit codes de la base (B7), chacun avec son libellé', () => {
    expect(ECRANS_SIGNALEMENT).toHaveLength(8)
    expect(Object.keys(LIBELLES_ECRAN).sort()).toEqual([...ECRANS_SIGNALEMENT].sort())
  })

  it('un code connu de l’adresse est gardé ; un code inconnu ou absent devient « autre »', () => {
    expect(lireEcran('saisie_evenement')).toBe('saisie_evenement')
    expect(lireEcran('saisie_fij_statistiques')).toBe('saisie_fij_statistiques')
    expect(lireEcran('nimportequoi')).toBe('autre')
    expect(lireEcran('')).toBe('autre')
    expect(lireEcran(null)).toBe('autre')
  })
})

describe('schemaSignalement', () => {
  it('texte de 10 et de 280 caractères accepté, sans les espaces autour', () => {
    expect(schemaSignalement.parse({ ecran: 'autre', texte: '  abcdefghij  ' })).toEqual({
      ecran: 'autre',
      texte: 'abcdefghij',
    })
    expect(schemaSignalement.safeParse({ ecran: 'autre', texte: 'a'.repeat(280) }).success).toBe(
      true,
    )
  })

  it('texte de 9 caractères (après trim) : « Décrivez la difficulté (10 caractères au moins). »', () => {
    const resultat = schemaSignalement.safeParse({ ecran: 'autre', texte: ' abcdefghi    ' })
    expect(erreurs(resultat)).toEqual(['Décrivez la difficulté (10 caractères au moins).'])
  })

  it('texte de 281 caractères : « Le signalement dépasse 280 caractères. »', () => {
    const resultat = schemaSignalement.safeParse({ ecran: 'autre', texte: 'a'.repeat(281) })
    expect(erreurs(resultat)).toEqual(['Le signalement dépasse 280 caractères.'])
  })

  it('crochets et « texte masqué » refusés, comme par la base (T43)', () => {
    for (const texte of ['Le bouton [Envoyer] reste grisé', 'Mon texte masqué par erreur ici']) {
      expect(erreurs(schemaSignalement.safeParse({ ecran: 'autre', texte }))).toEqual([
        'Les crochets et « texte masqué » sont réservés à la modération.',
      ])
    }
    expect(contientMarqueurModeration('Texte Masqué')).toBe(true)
    expect(contientMarqueurModeration('Le bouton reste grisé')).toBe(false)
  })

  it('un écran hors de la liste : « Choisissez l’écran concerné dans la liste. »', () => {
    const resultat = schemaSignalement.safeParse({ ecran: 'saisie_point', texte: 'a'.repeat(20) })
    expect(erreurs(resultat)).toEqual([MESSAGES_BASE_SIGNALEMENT.ecran])
  })
})

describe('schemaCloture', () => {
  it('commentaire vide ou fait d’espaces : null (facultatif)', () => {
    expect(schemaCloture.parse({ signalementId: ID, commentaire: '' })).toEqual({
      signalementId: ID,
      commentaire: null,
    })
    expect(schemaFormulaireCloture.parse({ commentaire: '    ' })).toEqual({ commentaire: null })
  })

  it('10 et 280 caractères acceptés ; 9 et 281 refusés avec les messages de la base', () => {
    expect(schemaFormulaireCloture.parse({ commentaire: ' 0123456789 ' })).toEqual({
      commentaire: '0123456789',
    })
    expect(schemaFormulaireCloture.safeParse({ commentaire: 'a'.repeat(280) }).success).toBe(true)
    expect(erreurs(schemaFormulaireCloture.safeParse({ commentaire: 'a'.repeat(9) }))).toEqual([
      'Le commentaire fait 10 caractères au moins, ou reste vide.',
    ])
    expect(erreurs(schemaFormulaireCloture.safeParse({ commentaire: 'a'.repeat(281) }))).toEqual([
      'Le commentaire dépasse 280 caractères.',
    ])
  })

  it('crochets refusés dans le commentaire ; identifiant qui n’est pas un uuid refusé', () => {
    expect(
      erreurs(schemaFormulaireCloture.safeParse({ commentaire: 'Réglé : [voir la fiche]' })),
    ).toEqual(['Les crochets et « texte masqué » sont réservés à la modération.'])
    expect(schemaCloture.safeParse({ signalementId: 'abc', commentaire: '' }).success).toBe(false)
  })
})
