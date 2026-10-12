import { describe, expect, it } from 'vitest'
import { lecturesNormales, lecturesVides } from '@/features/mes-indicateurs/apercu/exemples'
import { construireMesIndicateurs } from '@/features/mes-indicateurs/construire'
import { lireRefusSuggestion } from '@/features/mes-indicateurs/refus'
import { schemaFormulaireSuggestion, schemaSuggestion } from '@/features/mes-indicateurs/schemas'
import {
  explicationLimiteAjouts,
  explicationLimiteLignes,
  phraseAjoutsRestants,
  phraseMesIndicateurs,
  reussiteSuggestion,
  rythmeEnPhrase,
  texteEnAttente,
  texteRetrait,
} from '@/features/mes-indicateurs/textes'

const MINISTERE = '10000000-0000-4000-8000-000000000001'

/** Les guillemets français s'écrivent avec une espace insécable : le test lit une espace simple. */
const espaces = (texte: string) => texte.replaceAll(' ', ' ')

describe('« Pourquoi cet indicateur ? » : 10 à 280 caractères après espaces retirés', () => {
  const pourquoi = (texte: string) => schemaFormulaireSuggestion.safeParse({ pourquoi: texte })

  it('refuse moins de 10 caractères, avec le message de la base', () => {
    const court = pourquoi('Neuf cara')
    expect(court.success).toBe(false)
    if (!court.success) {
      expect(court.error.issues[0]?.message).toBe('Expliquez pourquoi en 10 caractères au moins.')
    }
    expect(pourquoi('Dix caract').success).toBe(true)
  })

  it('compte après avoir retiré les espaces autour, et refuse un texte vide', () => {
    expect(pourquoi('   Neuf cara   ').success).toBe(false)
    expect(pourquoi('   Dix caract   ').success).toBe(true)
    expect(pourquoi('          ').success).toBe(false)
    expect(pourquoi('').success).toBe(false)
  })

  it('accepte 280 caractères et refuse 281, avec le message de la base', () => {
    expect(pourquoi('a'.repeat(280)).success).toBe(true)
    const long = pourquoi('a'.repeat(281))
    expect(long.success).toBe(false)
    if (!long.success) expect(long.error.issues[0]?.message).toBe('280 caractères au plus.')
  })

  it('compte un caractère par émoji, comme char_length de la base', () => {
    expect(pourquoi('😀'.repeat(10)).success).toBe(true)
    expect(pourquoi('😀'.repeat(9)).success).toBe(false)
    expect(pourquoi('😀'.repeat(280)).success).toBe(true)
  })

  it('l’envoi à la base reprend le même schéma, avec le texte sans espaces autour', () => {
    const lu = schemaSuggestion.parse({
      ministereId: MINISTERE,
      code: 'suggestion_demandes_recues',
      pourquoi: '  Voir les demandes de chaque mois.  ',
    })
    expect(lu.pourquoi).toBe('Voir les demandes de chaque mois.')
    expect(
      schemaSuggestion.safeParse({ ministereId: 'x', code: 'a', pourquoi: 'a'.repeat(20) }).success,
    ).toBe(false)
    expect(
      schemaSuggestion.safeParse({ ministereId: MINISTERE, code: '', pourquoi: 'a'.repeat(20) })
        .success,
    ).toBe(false)
  })
})

describe('message après l’envoi, selon le rythme', () => {
  it('un indicateur du mois se saisit dans les chiffres du mois', () => {
    expect(espaces(reussiteSuggestion('Demandes reçues', 'mois'))).toBe(
      '« Demandes reçues » envoyé pour validation : vous pouvez déjà le saisir dans vos chiffres du mois.',
    )
  })

  it('un indicateur du dimanche ou « à ce jour » se saisit dans le formulaire du dimanche', () => {
    expect(espaces(reussiteSuggestion('Directs assurés', 'dimanche'))).toBe(
      '« Directs assurés » envoyé pour validation : vous pouvez déjà le saisir dans le formulaire du dimanche.',
    )
    expect(espaces(reussiteSuggestion('Projets en cours', 'a_ce_jour'))).toBe(
      '« Projets en cours » envoyé pour validation : vous pouvez déjà le saisir dans le formulaire du dimanche.',
    )
  })

  it('le rythme se dit dans une phrase', () => {
    expect(rythmeEnPhrase('dimanche')).toBe('chaque dimanche')
    expect(rythmeEnPhrase('mois')).toBe('chaque mois')
    expect(rythmeEnPhrase('a_ce_jour')).toBe('à ce jour')
  })
})

describe('phrases de l’écran', () => {
  it('la phrase de la conception : suivis, prévus, ajoutés par vous, ajouts restants', () => {
    expect(
      phraseMesIndicateurs({
        nom: 'Communication',
        suivis: 7,
        prevus: 5,
        ajoutesParVous: 2,
        ajoutesParLEglise: 0,
        ajoutsRestants: 1,
        ajoutsMax: 3,
      }),
    ).toBe(
      'Communication suit 7 indicateurs : 5 prévus par la coordination et 2 ajoutés par vous. Vous pouvez en ajouter 1 autre.',
    )
  })

  it('un seul indicateur, sans ajout : « Vous pouvez en ajouter 3. »', () => {
    expect(
      phraseMesIndicateurs({
        nom: 'Kumi',
        suivis: 1,
        prevus: 1,
        ajoutesParVous: 0,
        ajoutesParLEglise: 0,
        ajoutsRestants: 3,
        ajoutsMax: 3,
      }),
    ).toBe('Kumi suit 1 indicateur : 1 prévu par la coordination. Vous pouvez en ajouter 3.')
  })

  it('les ajouts de l’église se disent à part', () => {
    expect(
      phraseMesIndicateurs({
        nom: 'Kumi',
        suivis: 2,
        prevus: 0,
        ajoutesParVous: 1,
        ajoutesParLEglise: 1,
        ajoutsRestants: 2,
        ajoutsMax: 3,
      }),
    ).toContain(
      "1 ajouté par vous et 1 ajouté par l'administration de l'église ou EJP Tech. Vous pouvez en ajouter 2 autres.",
    )
  })

  it('la limite atteinte : « c’est le maximum »', () => {
    expect(phraseAjoutsRestants(0, 3, 3)).toBe('Vous avez atteint le maximum de 3 ajouts.')
  })

  it('rien de suivi : pas de phrase, l’état vide parle à la place', () => {
    expect(
      phraseMesIndicateurs({
        nom: 'Kumi',
        suivis: 0,
        prevus: 0,
        ajoutesParVous: 0,
        ajoutesParLEglise: 0,
        ajoutsRestants: 3,
        ajoutsMax: 3,
      }),
    ).toBeNull()
  })

  it('sans limite lue, la phrase ne promet aucun ajout restant', () => {
    expect(
      phraseMesIndicateurs({
        nom: 'Kumi',
        suivis: 1,
        prevus: 1,
        ajoutesParVous: 0,
        ajoutesParLEglise: 0,
        ajoutsRestants: null,
        ajoutsMax: 0,
      }),
    ).toBe('Kumi suit 1 indicateur : 1 prévu par la coordination.')
  })

  it('l’attente d’une validation dit les jours et ce qu’on peut déjà faire', () => {
    expect(espaces(texteEnAttente(2))).toBe(
      'À valider par EJP Tech depuis 2 jours. Vous pouvez déjà le saisir : le berger voit ses valeurs, marquées « à valider ».',
    )
    expect(texteEnAttente(0)).toContain("depuis aujourd'hui")
    expect(texteEnAttente(1)).toContain('depuis 1 jour.')
    expect(texteEnAttente(null)).toMatch(/^À valider par EJP Tech\. Vous pouvez/)
  })

  it('un retrait dit son jour et son motif', () => {
    expect(texteRetrait('3 oct.', 'doublon')).toBe('Retiré le 3 oct. : doublon.')
    expect(texteRetrait(null, null)).toBe('Retiré.')
  })

  it('les limites disent ce qu’il faut faire, avec les plafonds de la base', () => {
    const limites = { ajouts: 3, ajouts_max: 3, lignes: 12, lignes_max: 30 }
    expect(explicationLimiteAjouts(limites)).toMatch(
      /^Votre ministère a déjà 3 indicateurs à lui\./,
    )
    expect(explicationLimiteAjouts(limites)).toContain("Demandez à l'administration de l'église")
    expect(explicationLimiteLignes(limites)).toBe(
      "Votre fiche compte déjà 30 indicateurs. Demandez à l'administration de l'église d'en retirer un.",
    )
  })
})

describe('l’écran construit à partir des lectures', () => {
  const donnees = construireMesIndicateurs(lecturesNormales())

  it('la phrase : 7 suivis, 5 prévus, 2 ajoutés par vous, 1 ajout restant', () => {
    expect(donnees.phrase).toBe(
      'Communication suit 7 indicateurs : 5 prévus par la coordination et 2 ajoutés par vous. Vous pouvez en ajouter 1 autre.',
    )
    expect(donnees.vide).toBe(false)
    expect(donnees.limite).toBeNull()
  })

  it('les sections suivent la fiche : dimanche, mois, à ce jour, puis les calculs', () => {
    expect(donnees.sections.map((section) => section.titre)).toEqual([
      'Chaque dimanche',
      'Chaque mois',
      'À ce jour',
      'Calculs',
    ])
    const mois = donnees.sections.find((section) => section.cle === 'mois')
    expect(mois?.lignes.map((ligne) => ligne.libelle)).toEqual([
      'Demandes reçues',
      'Publications',
      'Tournages réalisés',
    ])
  })

  it('l’origine et l’usage de chaque ligne, jamais une valeur', () => {
    const lignes = donnees.sections.flatMap((section) => section.lignes)
    const par = (libelle: string) => lignes.find((ligne) => ligne.libelle === libelle)
    expect(par('Publications')).toMatchObject({
      origine: 'Prévu par la coordination',
      usage: 'Dernière saisie le 2 oct.',
      attente: null,
    })
    expect(par('Tournages réalisés')?.usage).toBe('Jamais saisi')
    expect(par('Demandes reçues')?.origine).toBe('Suggestion ajoutée par vous le 20 sept.')
    expect(par('Taux de livraison')).toMatchObject({ calcul: true, usage: null })
    // Aucune colonne de valeur dans le modèle : seulement des dates, des textes et des états.
    expect(JSON.stringify(donnees)).not.toMatch(/"[a-zA-Z_]*valeur[a-zA-Z_]*":/i)
  })

  it('un ajout à valider dit son attente en jours', () => {
    const lignes = donnees.sections.flatMap((section) => section.lignes)
    const projets = lignes.find((ligne) => ligne.libelle === 'Projets en cours')
    expect(projets?.enAttente).toBe(true)
    expect(projets?.attente).toContain('depuis 2 jours')
  })

  it('« Retirés » : un retrait avec son motif, un refus avec le motif d’EJP Tech', () => {
    expect(donnees.retires.map((ligne) => ligne.libelle)).toEqual([
      'Activités réalisées',
      'Vidéos archivées',
    ])
    expect(donnees.retires[0]).toMatchObject({
      detail: 'Refusé le 5 oct.',
      motifRefus: 'Ce chiffre existe déjà sur votre fiche sous le nom Publications.',
    })
    expect(donnees.retires[1]).toMatchObject({
      detail: 'Retiré le 3 oct. : doublon.',
      motifRefus: null,
    })
  })

  it('un retiré pour confidentialité n’y figure pas', () => {
    const lectures = lecturesNormales()
    const [premier] = lectures.indicateurs
    const retire = {
      ...premier!,
      etat: 'retire' as const,
      retire_le: '2026-10-09T10:00:00+02:00',
      retrait_motif: 'confidentialite' as const,
    }
    const resultat = construireMesIndicateurs({ ...lectures, indicateurs: [retire] })
    expect(resultat.retires).toEqual([])
  })

  it('les suggestions : celles que la fiche peut encore recevoir, rangées par rythme', () => {
    expect(donnees.suggestions.map((suggestion) => suggestion.libelle)).toEqual([
      'Demandes traitées',
      'Événements couverts',
      'Personnes formées',
    ])
    expect(donnees.suggestions[0]).toMatchObject({
      code: 'suggestion_demandes_traitees',
      rythme: 'chaque mois',
    })
  })

  it('trois ajouts : la limite est atteinte, l’explication dit quoi faire', () => {
    const lectures = lecturesNormales()
    const resultat = construireMesIndicateurs({
      ...lectures,
      limites: { ajouts: 3, ajouts_max: 3, lignes: 8, lignes_max: 30 },
    })
    expect(resultat.limite).toMatchObject({ genre: 'ajouts' })
    expect(resultat.limite?.message).toMatch(/^Votre ministère a déjà 3 indicateurs à lui\./)
    expect(resultat.phrase).toContain('Vous avez atteint le maximum de 3 ajouts.')
  })

  it('30 lignes : la limite de la fiche', () => {
    const resultat = construireMesIndicateurs({
      ...lecturesNormales(),
      limites: { ajouts: 1, ajouts_max: 3, lignes: 30, lignes_max: 30 },
    })
    expect(resultat.limite).toMatchObject({ genre: 'lignes' })
    expect(resultat.limite?.message).toMatch(/^Votre fiche compte déjà 30 indicateurs\./)
  })

  it('un ministère sans indicateur : l’état vide, les suggestions restent possibles', () => {
    const vide = construireMesIndicateurs(lecturesVides())
    expect(vide.vide).toBe(true)
    expect(vide.phrase).toBeNull()
    expect(vide.sections).toEqual([])
    expect(vide.suggestions).toHaveLength(3)
    expect(vide.limite).toBeNull()
  })
})

describe('refus de la base après « Envoyer pour validation »', () => {
  it('un refus du « Pourquoi » se dit sous le champ, tel quel', () => {
    expect(
      lireRefusSuggestion({
        code: 'P0001',
        message: "N'écrivez aucun nom ni information personnelle.",
      }),
    ).toEqual({ ou: 'champ', message: "N'écrivez aucun nom ni information personnelle." })
    expect(lireRefusSuggestion({ code: 'P0001', message: '280 caractères au plus.' }).ou).toBe(
      'champ',
    )
  })

  it('la limite, le doublon et la suggestion inconnue se disent sous le bouton', () => {
    for (const message of [
      'Votre ministère a déjà 3 indicateurs à lui. Retirez-en un pour en ajouter un autre.',
      "Votre fiche compte déjà 30 indicateurs. Demandez à l'administration de l'église d'en retirer un.",
      'Votre fiche a déjà « Demandes reçues ».',
      "Cette suggestion n'existe pas.",
    ]) {
      expect(lireRefusSuggestion({ code: 'P0001', message })).toEqual({ ou: 'bouton', message })
    }
  })

  it('un refus de droit et un problème de connexion', () => {
    expect(lireRefusSuggestion({ code: '42501', message: 'x' })).toEqual({
      ou: 'bouton',
      message: "Cet élément n'existe pas ou vous n'y avez pas accès.",
    })
    expect(lireRefusSuggestion(new Error('réseau'))).toEqual({ ou: 'connexion' })
  })
})
