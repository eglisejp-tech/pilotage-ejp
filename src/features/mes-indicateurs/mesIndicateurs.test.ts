import { describe, expect, it } from 'vitest'
import { lecturesNormales, lecturesVides } from '@/features/mes-indicateurs/apercu/exemples'
import { construireMesIndicateurs, PREFIXE_SUGGESTION } from '@/features/mes-indicateurs/construire'
import { lireRefusRetrait, lireRefusSuggestion } from '@/features/mes-indicateurs/refus'
import {
  schemaFormulaireRetrait,
  schemaFormulaireSuggestion,
  schemaRetrait,
  schemaSuggestion,
} from '@/features/mes-indicateurs/schemas'
import {
  explicationLimiteAjouts,
  explicationLimiteLignes,
  nomBoutonRetrait,
  phraseAjoutsRestants,
  phraseMesIndicateurs,
  pointApresCitation,
  reussiteRetrait,
  reussiteSuggestion,
  rythmeEnPhrase,
  SUITE_EN_ATTENTE,
  texteEnAttente,
  texteRetrait,
  titreRetrait,
} from '@/features/mes-indicateurs/textes'

const MINISTERE = '10000000-0000-4000-8000-000000000001'

/** Les guillemets français s'écrivent avec une espace insécable : le test lit une espace simple. */
const espaces = (texte: string) => texte.replaceAll(' ', ' ')

describe('« Pourquoi cet indicateur ? » : 10 à 280 caractères après espaces retirés', () => {
  const pourquoi = (texte: string) => schemaFormulaireSuggestion.safeParse({ pourquoi: texte })

  it('refuse moins de 10 caractères, avec la phrase de la table de traduction (m233)', () => {
    const court = pourquoi('Neuf cara')
    expect(court.success).toBe(false)
    if (!court.success) {
      expect(court.error.issues[0]?.message).toBe('Expliquez pourquoi (10 caractères au moins).')
    }
    expect(pourquoi('Dix caract').success).toBe(true)
  })

  it('compte après avoir retiré les espaces autour, et refuse un texte vide', () => {
    expect(pourquoi('   Neuf cara   ').success).toBe(false)
    expect(pourquoi('   Dix caract   ').success).toBe(true)
    expect(pourquoi('          ').success).toBe(false)
    expect(pourquoi('').success).toBe(false)
  })

  it('accepte 280 caractères et refuse 281, avec la phrase de la table de traduction (m233)', () => {
    expect(pourquoi('a'.repeat(280)).success).toBe(true)
    const long = pourquoi('a'.repeat(281))
    expect(long.success).toBe(false)
    if (!long.success) {
      expect(long.error.issues[0]?.message).toBe('Raccourcissez ce texte : 280 caractères au plus.')
    }
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
  it('suivis, ajoutés par vous, ajouts restants, sans nommer la coordination (T66, t329)', () => {
    const phrase = phraseMesIndicateurs({
      suivis: 7,
      ajoutesParVous: 2,
      ajoutsRestants: 1,
      ajoutsMax: 3,
    })
    expect(phrase).toBe(
      '7 indicateurs suivis, dont 2 ajoutés par vous. Vous pouvez en ajouter 1 autre.',
    )
    expect(phrase).not.toMatch(/coordination/)
  })

  it('un seul indicateur, sans ajout : « Vous pouvez en ajouter 3. »', () => {
    expect(
      phraseMesIndicateurs({
        suivis: 1,
        ajoutesParVous: 0,
        ajoutsRestants: 3,
        ajoutsMax: 3,
      }),
    ).toBe('1 indicateur suivi. Vous pouvez en ajouter 3.')
  })

  it('un seul ajout : « dont 1 ajouté par vous », puis les autres ajouts permis', () => {
    expect(
      phraseMesIndicateurs({
        suivis: 2,
        ajoutesParVous: 1,
        ajoutsRestants: 2,
        ajoutsMax: 3,
      }),
    ).toBe('2 indicateurs suivis, dont 1 ajouté par vous. Vous pouvez en ajouter 2 autres.')
  })

  it('la limite atteinte : « c’est le maximum »', () => {
    expect(phraseAjoutsRestants(0, 3, 3)).toBe('Vous avez atteint le maximum de 3 ajouts.')
  })

  it('rien de suivi : pas de phrase, l’état vide parle à la place', () => {
    expect(
      phraseMesIndicateurs({
        suivis: 0,
        ajoutesParVous: 0,
        ajoutsRestants: 3,
        ajoutsMax: 3,
      }),
    ).toBeNull()
  })

  it('sans limite lue, la phrase ne promet aucun ajout restant', () => {
    expect(
      phraseMesIndicateurs({
        suivis: 1,
        ajoutesParVous: 0,
        ajoutsRestants: null,
        ajoutsMax: 0,
      }),
    ).toBe('1 indicateur suivi.')
  })

  it('l’attente d’une validation dit les jours, puis ce qui arrive aux chiffres, à part (T66, t080)', () => {
    expect(texteEnAttente(2)).toBe('En attente de validation depuis 2 jours.')
    expect(texteEnAttente(0)).toBe("En attente de validation depuis aujourd'hui.")
    expect(texteEnAttente(1)).toBe('En attente de validation depuis 1 jour.')
    expect(texteEnAttente(null)).toBe('En attente de validation.')
    expect(SUITE_EN_ATTENTE).toBe("Vos chiffres compteront dès qu'il sera validé.")
  })

  it('un retrait dit son jour et son motif', () => {
    expect(texteRetrait('3 oct.', 'doublon')).toBe('Retiré le 3 oct. : doublon.')
    expect(texteRetrait(null, null)).toBe('Retiré.')
  })

  it('les limites disent ce qu’il faut faire, avec les plafonds de la base (T62 : retirez-en un ; T59 : EJP Tech)', () => {
    const limites = { ajouts: 3, ajouts_max: 3, lignes: 12, lignes_max: 30 }
    expect(explicationLimiteAjouts(limites)).toBe(
      'Votre ministère a déjà 3 indicateurs ajoutés. Retirez-en un pour en ajouter un autre.',
    )
    expect(explicationLimiteLignes(limites)).toBe(
      "Votre fiche compte déjà 30 indicateurs. Demandez à EJP Tech d'en retirer un.",
    )
    expect(`${explicationLimiteAjouts(limites)} ${explicationLimiteLignes(limites)}`).not.toMatch(
      /administration/,
    )
  })
})

describe('l’écran construit à partir des lectures', () => {
  const donnees = construireMesIndicateurs(lecturesNormales())

  it('la phrase : 7 suivis, 2 ajoutés par vous, 1 ajout restant (T66, t329)', () => {
    expect(donnees.phrase).toBe(
      '7 indicateurs suivis, dont 2 ajoutés par vous. Vous pouvez en ajouter 1 autre.',
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
      origine: 'Indicateur prévu',
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
    expect(projets?.attente).toBe('En attente de validation depuis 2 jours.')
    expect(projets?.attenteSuite).toBe("Vos chiffres compteront dès qu'il sera validé.")
    // Une ligne qui n'attend pas ne dit ni l'une ni l'autre.
    const publications = lignes.find((ligne) => ligne.libelle === 'Publications')
    expect(publications).toMatchObject({ attente: null, attenteSuite: null })
  })

  it('une suggestion se reconnaît à son code : toutes celles des aperçus portent le préfixe', () => {
    const lectures = lecturesNormales()
    expect(lectures.suggestions.length).toBeGreaterThan(0)
    for (const suggestion of lectures.suggestions) {
      expect(suggestion.code.startsWith(PREFIXE_SUGGESTION), suggestion.code).toBe(true)
    }
    // Un ajout du ministère issu d'une suggestion est dit « Suggestion ajoutée par vous », un
    // ajout libre « Ajouté par vous » : seul le préfixe du code les distingue.
    const [premier] = lectures.indicateurs
    const libre = { ...premier!, origine: 'ministere' as const, modele_code: 'autre_code' }
    const resultat = construireMesIndicateurs({
      ...lectures,
      indicateurs: [libre],
      suivi: [],
      refus: [],
    })
    expect(resultat.sections.flatMap((section) => section.lignes)[0]?.origine).toMatch(
      /^Ajouté par vous le /,
    )
  })

  it('« Retirés » : le retrait par vous avec votre motif, un refus avec le motif d’EJP Tech, un retrait avec son motif', () => {
    expect(donnees.retires.map((ligne) => ligne.libelle)).toEqual([
      'Participants',
      'Activités réalisées',
      'Vidéos archivées',
    ])
    expect(donnees.retires[0]).toMatchObject({
      detail: 'Retiré par vous le 9 oct.',
      motifRefus: null,
      motifRetrait: 'Nous comptons déjà ces présences avec les directs assurés.',
    })
    expect(donnees.retires[1]).toMatchObject({
      detail: 'Refusé le 5 oct.',
      motifRefus: 'Ce chiffre existe déjà sur votre fiche sous le nom Publications.',
      motifRetrait: null,
    })
    expect(donnees.retires[2]).toMatchObject({
      detail: 'Retiré le 3 oct. : doublon.',
      motifRefus: null,
      motifRetrait: null,
    })
  })

  it('T62 : une demande retirée par vous le dit ; sans motif lisible, « à votre demande »', () => {
    const lectures = lecturesNormales()
    const projets = lectures.indicateurs.find(
      (indicateur) => indicateur.libelle === 'Projets en cours',
    )!
    const retiree = {
      ...projets,
      etat: 'retire' as const,
      retire_le: '2026-10-14T09:00:00+02:00',
      retrait_motif: 'ministere' as const,
    }
    const avecMotif = construireMesIndicateurs({
      ...lectures,
      indicateurs: [retiree],
      retraits: [
        {
          indicateur_id: projets.id,
          etat_avant: 'en_attente',
          motif: 'Ce chiffre ne nous sert plus.',
          saisi_le: '2026-10-14T09:00:00+02:00',
        },
      ],
    })
    expect(avecMotif.retires[0]).toMatchObject({
      detail: 'Demande retirée par vous le 14 oct.',
      motifRetrait: 'Ce chiffre ne nous sert plus.',
    })
    const sansMotif = construireMesIndicateurs({
      ...lectures,
      indicateurs: [retiree],
      retraits: [],
    })
    expect(sansMotif.retires[0]).toMatchObject({
      detail: 'Retiré le 14 oct. : à votre demande.',
      motifRetrait: null,
    })
  })

  it('T62 : « Retirer la demande » sur un ajout à valider, « Retirer » sur un ajout validé, rien ailleurs', () => {
    const lignes = donnees.sections.flatMap((section) => section.lignes)
    const par = (libelle: string) => lignes.find((ligne) => ligne.libelle === libelle)
    expect(par('Projets en cours')?.retrait).toEqual({ genre: 'demande' })
    expect(par('Demandes reçues')?.retrait).toEqual({ genre: 'ajout' })
    // Les prévus de la coordination et les calculs ne se retirent pas par le ministère.
    expect(par('Publications')?.retrait).toBeNull()
    expect(par('Taux de livraison')?.retrait).toBeNull()
    expect(lignes.filter((ligne) => ligne.retrait !== null)).toHaveLength(2)
  })

  it('T62 : la source d’un calcul suivi dit qui peut la retirer, à la place du bouton', () => {
    const lectures = lecturesNormales()
    const demandes = lectures.indicateurs.find(
      (indicateur) => indicateur.libelle === 'Demandes reçues',
    )!
    const taux = lectures.indicateurs.find(
      (indicateur) => indicateur.libelle === 'Taux de livraison',
    )!
    const resultat = construireMesIndicateurs({
      ...lectures,
      termes: [...lectures.termes, { calcul_id: taux.id, source_id: demandes.id }],
    })
    const ligne = resultat.sections
      .flatMap((section) => section.lignes)
      .find((candidate) => candidate.id === demandes.id)
    expect(ligne?.retrait?.genre).toBe('source')
    expect(ligne?.retrait?.genre === 'source' ? espaces(ligne.retrait.message) : '').toBe(
      'Ce chiffre sert au calcul « Taux de livraison » : demandez à EJP Tech de le retirer.',
    )
    // Un calcul retiré ne retient plus sa source.
    const sansCalcul = construireMesIndicateurs({
      ...lectures,
      indicateurs: lectures.indicateurs.map((indicateur) =>
        indicateur.id === taux.id
          ? {
              ...indicateur,
              etat: 'retire' as const,
              retire_le: '2026-10-10T09:00:00+02:00',
              retrait_motif: 'plus_suivi' as const,
            }
          : indicateur,
      ),
      termes: [{ calcul_id: taux.id, source_id: demandes.id }],
    })
    expect(
      sansCalcul.sections
        .flatMap((section) => section.lignes)
        .find((candidate) => candidate.id === demandes.id)?.retrait,
    ).toEqual({ genre: 'ajout' })
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
    expect(resultat.limite?.message).toMatch(/^Votre ministère a déjà 3 indicateurs ajoutés\./)
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

describe('citation d’un motif en fin de phrase', () => {
  it('un seul point : aucun après les guillemets quand le motif finit déjà sa phrase', () => {
    expect(pointApresCitation('Ce chiffre ne nous sert plus.')).toBe('')
    expect(pointApresCitation('Pourquoi le garder ?')).toBe('')
    expect(pointApresCitation('Nous verrons plus tard…  ')).toBe('')
    expect(pointApresCitation('Ce chiffre ne nous sert plus')).toBe('.')
    // Le texte de masquage finit par un crochet : la phrase prend son point.
    expect(pointApresCitation('[texte masqué par EJP Tech]')).toBe('.')
  })
})

describe('T62 : retrait d’un ajout par le ministère', () => {
  const motif = (texte: string) => schemaFormulaireRetrait.safeParse({ motif: texte })

  it('le motif compte 10 à 280 caractères après espaces retirés, avec les phrases de la base', () => {
    const court = motif('   Neuf cara   ')
    expect(court.success).toBe(false)
    if (!court.success) {
      expect(court.error.issues[0]?.message).toBe(
        'Expliquez pourquoi vous le retirez (10 caractères au moins).',
      )
    }
    expect(motif('Dix caract').success).toBe(true)
    expect(motif('a'.repeat(280)).success).toBe(true)
    const long = motif('a'.repeat(281))
    expect(long.success).toBe(false)
    if (!long.success) {
      expect(long.error.issues[0]?.message).toBe('Raccourcissez le motif : 280 caractères au plus.')
    }
  })

  it('l’appel à la base reprend le même schéma, avec le motif sans espaces autour', () => {
    const indicateurId = '00000000-0000-4000-8000-000000000017'
    expect(schemaRetrait.parse({ indicateurId, motif: '  Ne nous sert plus.  ' })).toEqual({
      indicateurId,
      motif: 'Ne nous sert plus.',
    })
    expect(schemaRetrait.safeParse({ indicateurId: 'x', motif: 'a'.repeat(20) }).success).toBe(
      false,
    )
  })

  it('les textes : titre, nom du bouton, annonce', () => {
    expect(espaces(titreRetrait('Projets en cours', true))).toBe(
      'Retirer la demande « Projets en cours » ?',
    )
    expect(espaces(titreRetrait('Demandes reçues', false))).toBe('Retirer « Demandes reçues » ?')
    expect(espaces(nomBoutonRetrait('Projets en cours', true))).toBe(
      'Retirer la demande « Projets en cours »',
    )
    expect(espaces(nomBoutonRetrait('Demandes reçues', false))).toBe('Retirer « Demandes reçues »')
    expect(espaces(reussiteRetrait('Projets en cours', true))).toBe(
      'Demande « Projets en cours » retirée.',
    )
    expect(espaces(reussiteRetrait('Demandes reçues', false))).toBe('« Demandes reçues » retiré.')
  })

  it('un refus du motif se dit sous le champ ; la source d’un calcul et un ajout déjà retiré sous les boutons', () => {
    expect(
      lireRefusRetrait({
        code: 'P0001',
        message: "N'écrivez aucun nom ni information personnelle.",
      }),
    ).toEqual({
      ou: 'champ',
      message: 'Retirez de votre texte les emails, liens, numéros et noms de personnes.',
    })
    expect(
      lireRefusRetrait({
        code: 'P0001',
        message: 'Expliquez pourquoi vous le retirez (10 caractères au moins).',
      }).ou,
    ).toBe('champ')
    expect(
      lireRefusRetrait({
        code: 'P0001',
        message: 'Ce chiffre sert au calcul « Taux » : demandez à EJP Tech de le retirer.',
      }),
    ).toEqual({
      ou: 'bouton',
      message: 'Ce chiffre sert au calcul « Taux » : demandez à EJP Tech de le retirer.',
    })
    expect(lireRefusRetrait({ code: 'P0001', message: 'Cet indicateur est déjà retiré.' })).toEqual(
      { ou: 'bouton', message: 'Cet indicateur est déjà retiré. Rechargez la page.' },
    )
    expect(lireRefusRetrait(new TypeError('Failed to fetch'))).toEqual({ ou: 'connexion' })
  })
})

describe('refus de la base après « Envoyer pour validation »', () => {
  it('un refus du « Pourquoi » se dit sous le champ, traduit (T66, m268)', () => {
    expect(
      lireRefusSuggestion({
        code: 'P0001',
        message: "N'écrivez aucun nom ni information personnelle.",
      }),
    ).toEqual({
      ou: 'champ',
      message: 'Retirez de votre texte les emails, liens, numéros et noms de personnes.',
    })
    expect(lireRefusSuggestion({ code: 'P0001', message: '280 caractères au plus.' }).ou).toBe(
      'champ',
    )
  })

  it('la limite, le doublon et la suggestion inconnue se disent sous le bouton, traduits (m233, T59)', () => {
    const limites = { ajouts: 3, ajouts_max: 3, lignes: 30, lignes_max: 30 }
    for (const [message, phrase] of [
      [
        'Votre ministère a déjà 3 indicateurs à lui. Retirez-en un pour en ajouter un autre.',
        // Le même texte que le contrôle avant l'envoi (guide, 10.9) : depuis T62, le ministère
        // retire lui-même un de ses ajouts.
        explicationLimiteAjouts(limites),
      ],
      [
        "Votre fiche compte déjà 30 indicateurs. Demandez à EJP Tech d'en retirer un.",
        explicationLimiteLignes(limites),
      ],
      ['Votre fiche a déjà « Demandes reçues ».', 'Votre fiche a déjà « Demandes reçues ».'],
      [
        "Cette suggestion n'existe pas.",
        'Cet indicateur prévu est introuvable. Rechargez la page.',
      ],
    ] as const) {
      expect(lireRefusSuggestion({ code: 'P0001', message })).toEqual({
        ou: 'bouton',
        message: phrase,
      })
    }
  })

  it('un refus de droit, une connexion perdue, un refus inattendu', () => {
    expect(lireRefusSuggestion({ code: '42501', message: 'x' })).toEqual({
      ou: 'bouton',
      message: 'Cet élément est introuvable. Rechargez la page.',
    })
    expect(lireRefusSuggestion(new TypeError('Failed to fetch'))).toEqual({ ou: 'connexion' })
    expect(lireRefusSuggestion({ code: '23505', message: 'duplicate key' })).toEqual({
      ou: 'bouton',
      message:
        "L'enregistrement n'a pas abouti, votre saisie est gardée. Réessayez, et si le problème revient, prévenez EJP Tech.",
    })
  })
})
