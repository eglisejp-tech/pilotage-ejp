import { describe, expect, it } from 'vitest'
import { MESSAGE_ACCES_REFUSE, messageErreurEnvoi } from '@/features/saisie-session/erreurs'
import {
  erreursSession,
  MESSAGES_SESSION,
  schemaParticipation,
} from '@/features/saisie-session/schemas'
import {
  adresseSaisieSession,
  adresseSaisirUneSession,
  comptesDansTotal,
  ligneComptesDansTotal,
  ligneDejaSaisi,
  lignesChoixSession,
  messageReussiteSession,
  phraseCompletudeSession,
} from '@/features/saisie-session/session'
import type { SessionAChoisir } from '@/features/saisie-session/session'

const TIRETS = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)
const IDS = { sessionId: 's1', ministereId: 'm1' }

describe('présents moins déjà comptés (BRIEF, règle 5)', () => {
  it('« Comptés dans le total de l’église : 11. » pour 13 présents dont 2 déjà comptés', () => {
    expect(comptesDansTotal({ presents: '13', dejaComptes: '2' })).toBe(11)
    expect(ligneComptesDansTotal({ presents: '13', dejaComptes: '2' })).toBe(
      "Comptés dans le total de l'église : 11.",
    )
  })

  it('un champ « déjà comptés » vide vaut 0 dans la ligne calculée', () => {
    expect(comptesDansTotal({ presents: '13', dejaComptes: '' })).toBe(13)
  })

  it('0 présent est une vraie valeur : « 0. »', () => {
    expect(ligneComptesDansTotal({ presents: '0', dejaComptes: '0' })).toBe(
      "Comptés dans le total de l'église : 0.",
    )
  })

  it('sans présents, ou avec plus de déjà comptés que de présents, aucun nombre faux', () => {
    expect(comptesDansTotal({ presents: '', dejaComptes: '0' })).toBeNull()
    expect(comptesDansTotal({ presents: '3', dejaComptes: '5' })).toBeNull()
    expect(ligneComptesDansTotal({ presents: '', dejaComptes: '0' })).toBe(
      "Comptés dans le total de l'église : saisissez d'abord les présents.",
    )
  })
})

describe('schemaParticipation, partagé entre le formulaire et l’appel', () => {
  it('accepte 13 présents dont 2 déjà comptés', () => {
    expect(schemaParticipation.safeParse({ ...IDS, valeur: 13, dejaComptes: 2 }).success).toBe(true)
  })

  it('refuse plus de déjà comptés que de présents, sous le second champ', () => {
    expect(erreursSession({ presents: '3', dejaComptes: '5' }, IDS)).toEqual({
      dejaComptes: 'Ce nombre ne peut pas dépasser les présents.',
    })
  })

  it('un champ vide n’est jamais un 0 : les présents sont demandés', () => {
    expect(erreursSession({ presents: '', dejaComptes: '0' }, IDS)).toEqual({
      presents: MESSAGES_SESSION.presentsManquants,
    })
  })

  it('refuse un nombre négatif, décimal ou au-delà de 999', () => {
    for (const presents of ['-1', '2.5', '1000']) {
      expect(erreursSession({ presents, dejaComptes: '0' }, IDS).presents, presents).toBe(
        'Entre 0 et 999.',
      )
    }
  })

  it('accepte 0 présent et 0 déjà compté', () => {
    expect(erreursSession({ presents: '0', dejaComptes: '0' }, IDS)).toEqual({})
  })
})

describe('phrase de complétude de la session (maquette 09)', () => {
  it('« 6 ministères sur 8 ont déjà saisi. Il manque », puis les manquants', () => {
    expect(phraseCompletudeSession(6, 8, ['Coordination', 'Intégration'])).toEqual({
      texte: '6 ministères sur 8 ont déjà saisi. Il manque ',
      manquants: 'Coordination et Intégration',
    })
  })

  it('accorde au singulier, et dit quand personne n’a saisi', () => {
    expect(phraseCompletudeSession(1, 8, []).texte).toBe('1 ministère sur 8 a déjà saisi.')
    expect(phraseCompletudeSession(0, 3, ['A', 'B', 'C']).texte).toBe(
      "Aucun des 3 ministères attendus n'a encore saisi. Il manque ",
    )
  })

  it('tout est fait : aucun manquant', () => {
    expect(phraseCompletudeSession(8, 8, [])).toEqual({
      texte: 'Les 8 ministères attendus ont saisi.',
      manquants: null,
    })
  })
})

describe('Choisir la session', () => {
  const sessions: SessionAChoisir[] = [
    {
      sessionId: 'a',
      type: 'anti_dispersion',
      intitule: null,
      date: '2026-09-19',
      presentsSaisis: 1,
    },
    { sessionId: 'b', type: 'batir', intitule: null, date: '2026-09-26', presentsSaisis: null },
    {
      sessionId: 'c',
      type: 'autre',
      intitule: 'Soirée de rentrée',
      date: '2026-09-12',
      presentsSaisis: 12,
    },
  ]

  it('les plus récentes d’abord, « à saisir » ou « 12 présents saisis »', () => {
    const lignes = lignesChoixSession(sessions)
    expect(lignes.map((ligne) => `${ligne.libelle} : ${ligne.etat}`)).toEqual([
      "Bâtir l'Église, samedi 26 sept. : à saisir",
      'Anti-Dispersion, samedi 19 sept. : 1 présent saisi',
      'Soirée de rentrée, samedi 12 sept. : 12 présents saisis',
    ])
    expect(lignes[0]?.vers).toBe('/saisir/session/b')
    expect(lignes.map((ligne) => ligne.aSaisir)).toEqual([true, false, false])
  })

  it('« Saisir une session » ouvre la seule session à saisir, sinon le choix', () => {
    expect(adresseSaisirUneSession(['b'])).toBe('/saisir/session/b')
    expect(adresseSaisirUneSession(['a', 'b'])).toBe('/saisir/session/choisir')
    expect(adresseSaisirUneSession([])).toBe('/saisir/session/choisir')
    expect(adresseSaisieSession()).toBe('/saisir/session/choisir')
  })
})

describe('textes de la saisie', () => {
  it('« Présence enregistrée pour Bâtir l’Église du 26 sept. » (LISEZMOI, Réussite)', () => {
    expect(messageReussiteSession('batir', null, '2026-09-26')).toBe(
      "Présence enregistrée pour Bâtir l'Église du 26 sept.",
    )
  })

  it('« Déjà saisi » dit la saisie la plus récente, à l’heure de Paris', () => {
    const ligne = ligneDejaSaisi({ valeur: 13, deja_comptes: 2, saisi_le: '2026-09-27T16:30:00Z' })
    expect(ligne).toBe(
      'Déjà saisi : 13 présents, dont 2 déjà comptés, le 27 sept. à 18 h 30. Votre saisie la remplacera dans les totaux.',
    )
    expect(ligne).not.toMatch(TIRETS)
  })
})

describe('message d’un envoi refusé', () => {
  it('une erreur de saisie de la base s’affiche telle quelle', () => {
    expect(messageErreurEnvoi({ code: 'P0001', message: 'Saisissez au moins une valeur.' })).toBe(
      'Saisissez au moins une valeur.',
    )
  })

  it('un refus de droit prend le message du contrat', () => {
    expect(messageErreurEnvoi({ code: '42501', message: 'new row violates...' })).toBe(
      MESSAGE_ACCES_REFUSE,
    )
  })

  it('une coupure de connexion : null (le message de LISEZMOI par défaut)', () => {
    expect(messageErreurEnvoi(new TypeError('Failed to fetch'))).toBeNull()
  })
})
