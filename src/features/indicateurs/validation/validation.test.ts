import { describe, expect, it } from 'vitest'
import {
  ATTENTES_EXEMPLE,
  DECISIONS_EXEMPLE,
  DEMANDES_EXEMPLE,
} from '@/features/indicateurs/validation/apercu/exemples'
import {
  construireDecidees,
  construireLignesAdministration,
  construireLignesEjpTech,
} from '@/features/indicateurs/validation/construire'
import { lireRefusValidation } from '@/features/indicateurs/validation/refus'
import { schemaDecision, schemaFormulaireRefus } from '@/features/indicateurs/validation/schemas'
import {
  estEnRetard,
  JOURS_AVANT_RETARD,
  TEXTES_A_VALIDER,
  TEXTES_FENETRE_REFUS,
  texteAttente,
  texteDecision,
  texteEnvoyeLe,
  texteNombreEnAttente,
  texteNouvelIndicateur,
  texteValeursSaisies,
  titreRefus,
} from '@/features/indicateurs/validation/textes'

const DEMANDE = '00000000-0000-4000-8000-0000000000a1'

describe('motif d’un refus : 10 à 280 caractères après espaces retirés', () => {
  const motif = (texte: string) => schemaFormulaireRefus.safeParse({ motif: texte })

  it('refuse moins de 10 caractères, avec le message de la base', () => {
    expect(motif('Dix caract').success).toBe(true)
    const court = motif('Neuf cara')
    expect(court.success).toBe(false)
    if (!court.success) {
      expect(court.error.issues[0]?.message).toBe('Expliquez le refus (10 caractères au moins).')
    }
  })

  it('compte après avoir retiré les espaces autour', () => {
    expect(motif('   Neuf cara   ').success).toBe(false)
    expect(motif('   Dix caract   ').success).toBe(true)
    expect(motif('').success).toBe(false)
  })

  it('accepte 280 caractères et refuse 281, dans la forme commune (T66)', () => {
    expect(motif('a'.repeat(280)).success).toBe(true)
    const long = motif('a'.repeat(281))
    expect(long.success).toBe(false)
    if (!long.success) {
      expect(long.error.issues[0]?.message).toBe('Raccourcissez le motif : 280 caractères au plus.')
    }
  })

  it('compte un caractère par émoji, comme char_length de la base', () => {
    expect(motif('😀'.repeat(10)).success).toBe(true)
    expect(motif('😀'.repeat(9)).success).toBe(false)
    expect(motif('😀'.repeat(280)).success).toBe(true)
  })
})

describe('décision envoyée à valider_indicateur', () => {
  it('valider ne demande aucun motif', () => {
    expect(schemaDecision.safeParse({ demandeId: DEMANDE, decision: 'valide' }).success).toBe(true)
  })

  it('refuser demande un motif valide', () => {
    expect(schemaDecision.safeParse({ demandeId: DEMANDE, decision: 'refuse' }).success).toBe(false)
    expect(
      schemaDecision.safeParse({ demandeId: DEMANDE, decision: 'refuse', motif: 'court' }).success,
    ).toBe(false)
    const lu = schemaDecision.parse({
      demandeId: DEMANDE,
      decision: 'refuse',
      motif: '  Ce chiffre existe déjà sur la fiche.  ',
    })
    expect(lu).toEqual({
      demandeId: DEMANDE,
      decision: 'refuse',
      motif: 'Ce chiffre existe déjà sur la fiche.',
    })
  })

  it('refuse une demande qui n’est pas un identifiant', () => {
    expect(schemaDecision.safeParse({ demandeId: 'abc', decision: 'valide' }).success).toBe(false)
  })
})

describe('« en retard » au-delà de 7 jours', () => {
  it('7 jours ne sont pas en retard, 8 jours le sont', () => {
    expect(JOURS_AVANT_RETARD).toBe(7)
    expect(estEnRetard(0)).toBe(false)
    expect(estEnRetard(7)).toBe(false)
    expect(estEnRetard(8)).toBe(true)
    expect(estEnRetard(30)).toBe(true)
  })

  it('une durée inconnue n’est jamais en retard', () => {
    expect(estEnRetard(null)).toBe(false)
  })
})

describe('textes du bloc', () => {
  it('l’attente se dit en jours, « aujourd’hui » à zéro', () => {
    expect(texteAttente(0)).toBe("depuis aujourd'hui")
    expect(texteAttente(1)).toBe('depuis 1 jour')
    expect(texteAttente(9)).toBe('depuis 9 jours')
  })

  it('le nombre d’ajouts en attente s’accorde', () => {
    expect(texteNombreEnAttente(0)).toBe('Aucun ajout en attente')
    expect(texteNombreEnAttente(1)).toBe('1 ajout en attente')
    expect(texteNombreEnAttente(3)).toBe('3 ajouts en attente')
  })

  it('le jour d’envoi est celui de Paris, jamais celui du navigateur', () => {
    // 23 h 30 à Paris le 1er octobre est encore le 1er octobre ; 00 h 30 le 2 est le 2.
    expect(texteEnvoyeLe('2026-10-01T21:30:00Z')).toBe('Envoyé le 1 oct.')
    expect(texteEnvoyeLe('2026-10-01T22:30:00Z')).toBe('Envoyé le 2 oct.')
  })

  it('une décision dit son jour', () => {
    expect(texteDecision('valide', '2026-10-08T09:00:00Z')).toBe('Validée le 8 oct.')
    expect(texteDecision('refuse', '2026-10-08T09:00:00Z')).toBe('Refusée le 8 oct.')
  })

  it('les phrases de la fenêtre et du bloc suivent la conception', () => {
    // Les guillemets français et les deux-points s'écrivent avec une espace insécable.
    const espaces = (texte: string) => texte.replaceAll(' ', ' ')
    expect(espaces(titreRefus('Demandes reçues'))).toBe('Refuser « Demandes reçues » ?')
    // m231 : réussites courtes et attente au nom de l'action.
    expect(TEXTES_A_VALIDER.reussiteRefus).toBe('Indicateur refusé.')
    expect(TEXTES_A_VALIDER.reussiteValide).toBe('Indicateur validé.')
    expect(TEXTES_A_VALIDER.validationEnCours).toBe('Validation en cours')
    expect(TEXTES_FENETRE_REFUS.boutonEnCours).toBe('Refus en cours')
    expect(espaces(texteNouvelIndicateur('Demandes reçues', 'chaque mois'))).toBe(
      'Nouvel indicateur : « Demandes reçues » (chaque mois)',
    )
    expect(texteValeursSaisies(1)).toBe('1 valeur déjà saisie')
    expect(texteValeursSaisies(2)).toBe('2 valeurs déjà saisies')
  })
})

describe('lignes d’EJP Tech', () => {
  const lignes = construireLignesEjpTech(DEMANDES_EXEMPLE)

  it('du plus ancien au plus récent, avec le « Pourquoi » et les valeurs saisies', () => {
    expect(lignes.map((ligne) => ligne.ministere)).toEqual(['Kumi', 'Communication', 'Intégration'])
    expect(lignes[0]).toMatchObject({
      id: DEMANDE,
      libelle: 'Demandes reçues',
      rythme: 'chaque mois',
      envoyeLe: 'Envoyé le 1 oct.',
      depuis: 'depuis 9 jours',
      enRetard: true,
      nbValeurs: 2,
    })
    expect(lignes[0]?.pourquoi).toContain('Suivre les demandes')
    expect(lignes[1]).toMatchObject({ rythme: 'à ce jour', enRetard: false })
  })

  it('une correction du nom ne se décide pas encore : elle n’est pas dans la liste', () => {
    const avecCorrection = [
      ...DEMANDES_EXEMPLE,
      { ...DEMANDES_EXEMPLE[0]!, demande_id: 'autre', objet: 'correction' as const },
    ]
    expect(construireLignesEjpTech(avecCorrection)).toHaveLength(3)
  })

  it('le retard vient de la base ou des jours : au-delà de 7 jours, même sans drapeau', () => {
    const [premiere] = construireLignesEjpTech([
      { ...DEMANDES_EXEMPLE[1]!, en_retard: false, attente_jours: 12 },
    ])
    expect(premiere?.enRetard).toBe(true)
  })
})

describe('lignes de l’administration', () => {
  const lignes = construireLignesAdministration(ATTENTES_EXEMPLE)

  it('la même attente, sans « Pourquoi » ni nombre de valeurs', () => {
    expect(lignes).toHaveLength(3)
    for (const ligne of lignes) {
      expect(ligne.pourquoi).toBeNull()
      expect(ligne.nbValeurs).toBeNull()
    }
    expect(lignes[0]).toMatchObject({
      ministere: 'Kumi',
      depuis: 'depuis 9 jours',
      enRetard: true,
    })
  })

  it('sans durée de la base, la ligne ne dit pas « depuis »', () => {
    const [ligne] = construireLignesAdministration([
      { ...ATTENTES_EXEMPLE[0]!, attente_jours: null },
    ])
    expect(ligne?.depuis).toBeNull()
    expect(ligne?.enRetard).toBe(false)
  })
})

describe('décisions des 30 derniers jours', () => {
  const decidees = construireDecidees(DECISIONS_EXEMPLE)

  it('de la plus récente à la plus ancienne, le motif d’un refus seulement', () => {
    expect(decidees.map((ligne) => ligne.texte)).toEqual([
      'Validée le 8 oct.',
      'Refusée le 5 oct.',
      'Refusée le 28 sept.',
    ])
    expect(decidees[0]?.motif).toBeNull()
    expect(decidees[1]?.motif).toBe('Ce chiffre existe déjà sur la fiche sous un autre nom.')
  })
})

describe('refus de la base', () => {
  it('un refus du motif se dit sous le champ, tel quel', () => {
    expect(
      lireRefusValidation({
        code: 'P0001',
        message: "N'écrivez aucun nom ni information personnelle.",
      }),
    ).toEqual({ ou: 'champ', message: "N'écrivez aucun nom ni information personnelle." })
  })

  it('une demande déjà décidée ou sortie se dit sous les boutons', () => {
    expect(
      lireRefusValidation({ code: 'P0001', message: 'Cette demande a déjà été décidée.' }),
    ).toEqual({ ou: 'bouton', message: 'Cette demande a déjà été décidée.' })
    expect(
      lireRefusValidation({
        code: 'P0001',
        message: "Cette demande a été retirée ou remplacée : il n'y a plus rien à décider.",
      }).ou,
    ).toBe('bouton')
  })

  it('un refus de droit dit que l’élément n’est pas accessible', () => {
    expect(lireRefusValidation({ code: '42501', message: 'x' })).toEqual({
      ou: 'bouton',
      message: "Cet élément n'existe pas ou vous n'y avez pas accès.",
    })
  })

  it('une erreur sans réponse (réseau, délai) est un problème de connexion', () => {
    expect(lireRefusValidation(new TypeError('Failed to fetch'))).toEqual({ ou: 'connexion' })
    expect(lireRefusValidation({ code: '', message: 'TypeError: Failed to fetch' })).toEqual({
      ou: 'connexion',
    })
    expect(lireRefusValidation({ code: '', message: 'TimeoutError: x' })).toEqual({
      ou: 'connexion',
    })
  })

  it('un refus inattendu prend le repli, sous les boutons, sans fermer la fenêtre (m270)', () => {
    const repli = {
      ou: 'formulaire',
      message:
        "L'enregistrement n'a pas abouti, votre saisie est gardée. Réessayez, et si le problème revient, prévenez EJP Tech.",
    }
    expect(lireRefusValidation({ code: 'PGRST000', message: 'x' })).toEqual(repli)
    expect(lireRefusValidation({ code: 'P0001', message: 'Un refus inconnu.' })).toEqual(repli)
    expect(lireRefusValidation({ code: '23505', message: 'duplicate key' })).toEqual(repli)
    expect(lireRefusValidation(null)).toEqual(repli)
  })

  it('« Valider », sans formulaire : le repli d’une action', () => {
    expect(
      lireRefusValidation({ code: '23505', message: 'duplicate key' }, { formulaire: false }),
    ).toEqual({
      ou: 'formulaire',
      message: "L'action n'a pas abouti. Réessayez, et si le problème revient, prévenez EJP Tech.",
    })
  })

  it('connexion expirée et compte désactivé : leurs phrases, sans fermer la fenêtre (m271, m272)', () => {
    expect(
      lireRefusValidation({ code: '42501', message: 'Double authentification requise.' }),
    ).toEqual({ ou: 'formulaire', message: 'Votre connexion a expiré. Reconnectez-vous.' })
    expect(lireRefusValidation({ code: '42501', message: 'Compte inactif ou inconnu.' })).toEqual({
      ou: 'formulaire',
      message: 'Ce compte est désactivé. Contactez EJP Tech.',
    })
  })
})
