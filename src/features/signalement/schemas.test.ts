import { describe, expect, it } from 'vitest'
import {
  contientMarqueurModeration,
  ECRANS_SIGNALEMENT,
  lireEcran,
  longueurEnCaracteres,
  schemaCloture,
  schemaFormulaireReponse,
  schemaIdentifiantSignalement,
  schemaReponse,
  schemaSignalement,
} from '@/features/signalement/schemas'
import { LIBELLES_ECRAN } from '@/features/signalement/textes'

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

  it('compte en caractères comme la base : 280 émojis passent, 281 non', () => {
    // Un émoji pèse deux unités UTF-16 mais un seul caractère pour `char_length`.
    expect(schemaSignalement.safeParse({ ecran: 'autre', texte: '😀'.repeat(280) }).success).toBe(
      true,
    )
    expect(
      erreurs(schemaSignalement.safeParse({ ecran: 'autre', texte: '😀'.repeat(281) })),
    ).toEqual(['Raccourcissez le signalement : 280 caractères au plus.'])
    expect(longueurEnCaracteres('a😀b')).toBe(3)
  })

  it('texte de 9 caractères (après trim) : « Décrivez la difficulté (10 caractères au moins). »', () => {
    const resultat = schemaSignalement.safeParse({ ecran: 'autre', texte: ' abcdefghi    ' })
    expect(erreurs(resultat)).toEqual(['Décrivez la difficulté (10 caractères au moins).'])
  })

  it('texte de 281 caractères : « Raccourcissez le signalement : 280 caractères au plus. »', () => {
    const resultat = schemaSignalement.safeParse({ ecran: 'autre', texte: 'a'.repeat(281) })
    expect(erreurs(resultat)).toEqual(['Raccourcissez le signalement : 280 caractères au plus.'])
  })

  it('crochets et « texte masqué » refusés, comme par la base (T43), l’action d’abord (T66)', () => {
    for (const texte of ['Le bouton [Envoyer] reste grisé', 'Mon texte masqué par erreur ici']) {
      expect(erreurs(schemaSignalement.safeParse({ ecran: 'autre', texte }))).toEqual([
        'Retirez de votre texte les crochets [ ] et les mots « texte masqué ».',
      ])
    }
    expect(contientMarqueurModeration('Texte Masqué')).toBe(true)
    expect(contientMarqueurModeration('Le bouton reste grisé')).toBe(false)
  })

  it('un écran hors de la liste : ouvrir le signalement depuis l’écran concerné (T66, t151)', () => {
    const resultat = schemaSignalement.safeParse({ ecran: 'saisie_point', texte: 'a'.repeat(20) })
    expect(erreurs(resultat)).toEqual([
      "Ouvrez « Signaler une difficulté » depuis l'écran concerné.",
    ])
  })
})

describe('réponses du suivi et clôture (T77)', () => {
  it('la réponse de « Clore le signalement » est obligatoire à l’écran : vide refusé', () => {
    for (const commentaire of ['', '    ']) {
      expect(erreurs(schemaCloture.safeParse({ signalementId: ID, commentaire }))).toEqual([
        'Écrivez au moins 10 caractères.',
      ])
    }
    expect(
      schemaCloture.parse({ signalementId: ID, commentaire: ' Transmis à l’administration. ' }),
    ).toEqual({ signalementId: ID, commentaire: 'Transmis à l’administration.' })
  })

  it('10 et 280 caractères acceptés ; 9 et 281 refusés, pour la réponse et la clôture', () => {
    expect(schemaFormulaireReponse.parse({ texte: ' 0123456789 ' })).toEqual({
      texte: '0123456789',
    })
    expect(schemaFormulaireReponse.safeParse({ texte: 'a'.repeat(280) }).success).toBe(true)
    expect(erreurs(schemaFormulaireReponse.safeParse({ texte: 'a'.repeat(9) }))).toEqual([
      'Écrivez au moins 10 caractères.',
    ])
    expect(erreurs(schemaFormulaireReponse.safeParse({ texte: 'a'.repeat(281) }))).toEqual([
      'Raccourcissez la réponse : 280 caractères au plus.',
    ])
    expect(
      erreurs(schemaCloture.safeParse({ signalementId: ID, commentaire: 'a'.repeat(281) })),
    ).toEqual(['Raccourcissez la réponse : 280 caractères au plus.'])
  })

  it('« Répondre à EJP Tech » du cas de Coordination (critère 5) : accepté tel quel', () => {
    const texte = "L'événement du 15 novembre ne s'enregistre pas, un message rouge s'affiche."
    expect(schemaReponse.parse({ signalementId: ID, texte })).toEqual({ signalementId: ID, texte })
  })

  it('crochets refusés dans une réponse ; identifiant qui n’est pas un uuid refusé', () => {
    expect(
      erreurs(schemaReponse.safeParse({ signalementId: ID, texte: 'Réglé : [voir la fiche]' })),
    ).toEqual(['Retirez de votre texte les crochets [ ] et les mots « texte masqué ».'])
    expect(
      schemaCloture.safeParse({ signalementId: 'abc', commentaire: 'a'.repeat(20) }).success,
    ).toBe(false)
    expect(schemaIdentifiantSignalement.safeParse('abc').success).toBe(false)
    expect(schemaIdentifiantSignalement.parse(ID)).toBe(ID)
  })
})
