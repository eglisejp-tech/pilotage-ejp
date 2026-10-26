import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { traduireErreurBase } from '../../supabase/functions/_shared/base.ts'
import { phraseErreur } from '@/data/echecEnvoi'
import { MESSAGES_ECRITURE } from '@/data/indicateursEcriture'
import {
  CLES_REFUS_DE_DROIT,
  CLES_REFUS_DE_SAISIE,
  estErreurConfiguration,
  lireErreurBase,
  MESSAGES_COMMUNS,
  phraseLecture,
  surSessionChangee,
} from '@/data/messagesBase'
import { MESSAGES_POINT } from '@/data/pointsEcriture'
import { TEXTES_EVENEMENT } from '@/features/evenements/textes'
import { MESSAGES_MOIS, schemaPourquoi } from '@/features/indicateurs/schemas'
import { MOTIF_TROP_LONG } from '@/features/indicateurs/validation/textes'
import {
  explicationLimiteAjouts,
  explicationLimiteLignes,
  MESSAGES_BASE_RETRAIT,
  MESSAGES_BASE_SUGGESTION,
} from '@/features/mes-indicateurs/textes'
import { messageSommeDepasse, TEXTES_CHIFFRES } from '@/features/saisie-chiffres/textes'
import { MESSAGES_FIJ } from '@/features/saisie-fij/schemas'
import { TEXTES_BLOC_SIGNALEMENTS, TEXTES_SIGNALEMENT } from '@/features/signalement/textes'
import { MESSAGES_PRENOM } from '@/lib/metier/declaration'

/** Les messages du « Pourquoi » que le schéma partagé dit avant l'envoi (m233). */
const messageDe = (resultat: { error?: { issues: { message: string }[] } }) =>
  resultat.error?.issues[0]?.message ?? ''
const schemaPourquoiCourt = messageDe(schemaPourquoi.safeParse('court'))
const schemaPourquoiLong = messageDe(schemaPourquoi.safeParse('a'.repeat(281)))

const refus = (message: string, code = 'P0001') => ({ code, message, details: null, hint: null })

describe('lireErreurBase : le code décide d’abord', () => {
  it('sans code (fetch rejeté, délai, réponse perdue, bogue) : technique, `lireEchec` en dit l’issue (T76)', () => {
    for (const erreur of [
      { code: '', message: 'TypeError: Failed to fetch' },
      { code: '', message: 'TypeError: Load failed' },
      { code: '', message: 'TimeoutError: signal timed out' },
      { code: '', message: 'ReponsePerdue: statut 200, corps perdu' },
      { code: '', message: "TypeError: undefined is not an object (evaluating 'x.y')" },
      new TypeError('Failed to fetch'),
      new Error('Limites absentes.'),
      new DOMException('signal timed out', 'TimeoutError'),
      { message: '<html>502 Bad Gateway</html>' },
      'chaîne levée',
    ]) {
      expect(lireErreurBase(erreur)).toEqual({ genre: 'technique' })
    }
  })

  it('requête partie sans jeton (« permission denied for function », rôle anon) : connexion expirée (T76, Q8)', () => {
    for (const message of [
      'permission denied for function ajouter_evenement',
      'permission denied for table reunion',
    ]) {
      expect(lireErreurBase(refus(message, '42501'))).toEqual({
        genre: 'message',
        nature: 'expiree',
        message: MESSAGES_COMMUNS.connexionExpiree,
        champ: null,
      })
    }
  })

  it('401 sans code PostgREST (corps de la passerelle « JWT expired ») : connexion expirée (m271)', () => {
    for (const corps of [{ message: 'JWT expired' }, { message: 'Invalid JWT' }]) {
      expect(lireErreurBase(corps)).toEqual({
        genre: 'message',
        nature: 'expiree',
        message: MESSAGES_COMMUNS.connexionExpiree,
        champ: null,
      })
    }
  })

  it('jeton expiré ou refusé (PGRST301 à PGRST303) : se reconnecter (m271)', () => {
    for (const code of ['PGRST301', 'PGRST302', 'PGRST303']) {
      expect(lireErreurBase(refus('JWT expired', code))).toEqual({
        genre: 'message',
        nature: 'expiree',
        message: 'Votre connexion a expiré. Reconnectez-vous.',
        champ: null,
      })
    }
  })

  it('42501 « Double authentification requise. » : connexion expirée, pas « introuvable » (m271)', () => {
    expect(lireErreurBase(refus('Double authentification requise.', '42501'))).toMatchObject({
      nature: 'expiree',
      message: MESSAGES_COMMUNS.connexionExpiree,
    })
  })

  it('42501 « Session inconnue : reconnectez-vous. » (prénom, T56) : connexion expirée (m271)', () => {
    expect(lireErreurBase(refus('Session inconnue : reconnectez-vous.', '42501'))).toMatchObject({
      nature: 'expiree',
      message: MESSAGES_COMMUNS.connexionExpiree,
    })
  })

  it('refus du prénom (T56) : la phrase du contrôle avant l’envoi, sous le champ prénom', () => {
    for (const message of Object.values(MESSAGES_PRENOM)) {
      expect(lireErreurBase(refus(message))).toEqual({
        genre: 'message',
        nature: 'refus',
        message,
        champ: 'prenom',
      })
    }
    expect(lireErreurBase(refus('Seul EJP Tech efface un prénom.', '42501'))).toEqual({
      genre: 'acces',
    })
    expect(lireErreurBase(refus('Motif inconnu.'))).toMatchObject({ nature: 'repli' })
  })

  it('42501 « Compte inactif ou inconnu. » : compte désactivé, contacter EJP Tech (m272)', () => {
    expect(lireErreurBase(refus('Compte inactif ou inconnu.', '42501'))).toMatchObject({
      nature: 'desactive',
      message: 'Ce compte est désactivé. Contactez EJP Tech.',
    })
  })

  it('tout autre 42501 (RLS, élément hors de portée) : refus d’accès, dit par l’écran', () => {
    expect(
      lireErreurBase(
        refus('new row violates row-level security policy for table "reunion"', '42501'),
      ),
    ).toEqual({ genre: 'acces' })
    expect(
      lireErreurBase(refus("Cet élément n'existe pas ou vous n'y avez pas accès.", '42501')),
    ).toEqual({ genre: 'acces' })
    // Comptages de l'église lus par un autre ministère (T68, E4).
    expect(
      lireErreurBase(
        refus(
          "Seuls Coordination, le berger, le conseil et EJP Tech lisent les comptages de l'église.",
          '42501',
        ),
      ),
    ).toEqual({ genre: 'acces' })
  })

  it('P0001 sur une heure d’événement (T68) : sa phrase sous le champ de l’heure', () => {
    expect(lireErreurBase(refus("L'heure prévue est invalide."))).toEqual({
      genre: 'message',
      nature: 'refus',
      message: 'Choisissez une heure valide.',
      champ: 'heure_prevue',
    })
    expect(
      lireErreurBase(refus("L'heure de début se saisit le jour de l'événement ou après.")),
    ).toMatchObject({
      message: "L'heure de début se saisit le jour de l'événement ou après.",
      champ: 'heure_debut',
    })
    // Un contrôle Zod de la couche data sur une heure : sous son champ.
    const verification = z
      .object({ heure_debut: z.number().max(1439, 'Choisissez une heure valide.') })
      .safeParse({ heure_debut: 1440 })
    expect(lireErreurBase(verification.error)).toMatchObject({ champ: 'heure_debut' })
  })

  it('42501 d’un garde-fou technique : le repli, jamais le texte de la base (m274)', () => {
    const lue = lireErreurBase(
      refus(
        "La table mesure est en ajout seul : elle ne se modifie pas et ne s'efface pas.",
        '42501',
      ),
    )
    expect(lue).toMatchObject({ nature: 'repli', message: MESSAGES_COMMUNS.repliSaisie })
  })

  it('P0001 de la table : sa phrase et son champ', () => {
    expect(
      lireErreurBase(refus('Les STARs en FIJ ne peuvent pas dépasser les STARs actifs.')),
    ).toEqual({
      genre: 'message',
      nature: 'refus',
      message: "« Dont en FIJ » dépasse « STARs actifs ». Corrigez l'un des deux chiffres.",
      champ: 'en_fij',
    })
    // Le dimanche vient de l'adresse : aucun champ de date, la phrase va sous le bouton.
    expect(
      lireErreurBase(refus("La date doit être un dimanche passé ou aujourd'hui.")),
    ).toMatchObject({
      message: "Choisissez un dimanche passé ou celui d'aujourd'hui.",
      champ: null,
    })
    expect(lireErreurBase(refus('Ce chiffre se calcule : il ne se saisit pas.'))).toMatchObject({
      message: 'Ce chiffre se calcule seul. Rechargez la page, puis réessayez.',
    })
  })

  it('P0001 complété par la base : les valeurs reprennent leur place (m210, m228)', () => {
    expect(
      lireErreurBase(refus("Une session Bâtir l'Église est déjà déclarée le samedi 10 octobre.")),
    ).toMatchObject({
      message:
        "Une session Bâtir l'Église existe déjà le samedi 10 octobre. Choisissez une autre date.",
      champ: 'date',
    })
    expect(
      lireErreurBase(
        refus(
          'La fiche a déjà « Demandes reçues » : retirez-le avant de créer les indicateurs prévus.',
        ),
      ),
    ).toMatchObject({
      message:
        'La fiche a déjà « Demandes reçues ». Retirez-le, puis créez les indicateurs prévus.',
    })
    expect(
      lireErreurBase(
        refus('Avec les indicateurs prévus, la fiche compterait 33 indicateurs : 30 au plus.'),
      ),
    ).toMatchObject({
      message:
        "Avec les indicateurs prévus, la fiche aurait 33 indicateurs : 30 au plus. Retirez-en d'abord.",
    })
    expect(lireErreurBase(refus('Cette fiche a déjà « Visiteurs ».'))).toMatchObject({
      message: 'Cette fiche a déjà un indicateur « Visiteurs ». Choisissez un autre nom.',
    })
    expect(lireErreurBase(refus('Votre fiche a déjà « Visiteurs ».'))).toMatchObject({
      message: 'Votre fiche a déjà « Visiteurs ».',
    })
  })

  it('le contact est EJP Tech, jamais l’administration de l’église (T59, T60)', () => {
    expect(
      lireErreurBase(
        refus("Votre fiche compte déjà 30 indicateurs. Demandez à EJP Tech d'en retirer un."),
      ),
    ).toMatchObject({
      message: "Votre fiche compte déjà 30 indicateurs. Demandez à EJP Tech d'en retirer un.",
    })
  })

  it('P0001 absent de la table, autres codes SQL : le repli, jamais le texte brut (m270)', () => {
    for (const erreur of [
      refus('Un nouveau refus que personne n’a traduit.'),
      refus('duplicate key value violates unique constraint "x"', '23505'),
      refus('new row violates check constraint "x"', '23514'),
      refus('insert or update violates foreign key constraint "x"', '23503'),
      refus('value out of range', '22003'),
      refus('invalid input syntax for type uuid', '22P02'),
      refus('JSON object requested, multiple (or no) rows returned', 'PGRST116'),
      Object.assign(new Error('boom'), { code: 'XX000' }),
    ]) {
      expect(lireErreurBase(erreur)).toEqual({
        genre: 'message',
        nature: 'repli',
        message:
          "L'enregistrement n'a pas abouti, votre saisie est gardée. Réessayez, et si le problème revient, prévenez EJP Tech.",
        champ: null,
      })
    }
  })

  it('une action sans formulaire prend le repli d’action', () => {
    expect(lireErreurBase(refus('Inconnu.'), { formulaire: false })).toMatchObject({
      message: "L'action n'a pas abouti. Réessayez, et si le problème revient, prévenez EJP Tech.",
    })
  })

  it('contrôle Zod de la couche data : sa consigne sous son champ ; message par défaut : le repli', () => {
    const consigne = z.object({ titre: z.string().min(1, 'Donnez un titre au point.') })
    expect(lireErreurBase(consigne.safeParse({ titre: '' }).error)).toEqual({
      genre: 'message',
      nature: 'refus',
      message: 'Donnez un titre au point.',
      champ: 'titre',
    })
    const pourquoi = z.object({ pourquoi: z.string().min(10, 'Expliquez pourquoi.') })
    expect(lireErreurBase(pourquoi.safeParse({ pourquoi: '' }).error)).toMatchObject({
      champ: 'texte',
    })
    const parDefaut = z.object({ n: z.number() })
    expect(lireErreurBase(parDefaut.safeParse({ n: 'a' }).error)).toMatchObject({
      nature: 'repli',
    })
  })

  it('un schéma qui reprend un filet de la base prend le repli, comme la base (m098)', () => {
    const doublon = z.object({
      valeurs: z.array(z.string()).refine((liste) => new Set(liste).size === liste.length, {
        message: MESSAGES_FIJ.doublon,
      }),
    })
    expect(lireErreurBase(doublon.safeParse({ valeurs: ['a', 'a'] }).error)).toMatchObject({
      nature: 'repli',
    })
  })

  it.each([
    'Un envoi compte 30 chiffres au plus.',
    "Un indicateur ne se saisit qu'une fois par envoi.",
  ])('filet « %s » : le repli, jamais le texte de la base (m098)', (message) => {
    expect(lireErreurBase(refus(message))).toMatchObject({
      nature: 'repli',
      message: MESSAGES_COMMUNS.repliSaisie,
    })
  })
})

describe('le même texte avant l’envoi et après le refus de la base (guide, 10.8 et 10.9)', () => {
  const phrase = (message: string) => {
    const lue = lireErreurBase(refus(message))
    return lue.genre === 'message' ? lue.message : lue.genre
  }
  const limites = { ajouts: 3, ajouts_max: 3, lignes: 30, lignes_max: 30 }

  it.each([
    ['Donnez un libellé de 2 à 60 caractères.', MESSAGES_ECRITURE.libelle],
    ["Expliquez ce qu'on compte en 10 à 140 caractères.", MESSAGES_ECRITURE.definition],
    ['Choisissez la sorte de nombre.', MESSAGES_ECRITURE.sorte],
    ['Un calcul se fait sur des chiffres distincts.', MESSAGES_ECRITURE.distincts],
    ['Choisissez le rythme : chaque dimanche, chaque mois ou à ce jour.', MESSAGES_ECRITURE.rythme],
    ['Expliquez pourquoi en 10 caractères au moins.', MESSAGES_BASE_SUGGESTION.pourquoiCourt],
    ['280 caractères au plus.', MESSAGES_BASE_SUGGESTION.pourquoiLong],
    ['Expliquez pourquoi en 10 caractères au moins.', schemaPourquoiCourt],
    ['280 caractères au plus.', schemaPourquoiLong],
    ["Cette suggestion n'existe pas.", MESSAGES_BASE_SUGGESTION.inexistante],
    ['Le motif dépasse 280 caractères.', MESSAGES_BASE_RETRAIT.motifLong],
    ['Le motif dépasse 280 caractères.', MOTIF_TROP_LONG],
    [
      'Votre ministère a déjà 3 indicateurs à lui. Retirez-en un pour en ajouter un autre.',
      explicationLimiteAjouts(limites),
    ],
    [
      "Votre fiche compte déjà 30 indicateurs. Demandez à EJP Tech d'en retirer un.",
      explicationLimiteLignes(limites),
    ],
    [
      "Rien n'a changé : ce statut et cette date sont déjà enregistrés.",
      TEXTES_SIGNALEMENT.ligneIdentique,
    ],
    ['La date ne peut pas être passée.', TEXTES_SIGNALEMENT.dateRefuseeAjout],
    [
      "La nouvelle date doit être aujourd'hui ou plus tard.",
      TEXTES_SIGNALEMENT.dateRefuseeMiseAJour,
    ],
    ['Saisissez au moins un chiffre.', TEXTES_CHIFFRES.aucunChiffre],
    ['Saisissez au moins une valeur.', MESSAGES_FIJ.aucuneValeur],
    ['La somme des catégories (9) dépasse le total du mois (7).', messageSommeDepasse(9, 7)],
    // Points (T66, m137 à m151) et signalements (m167 à m173).
    ['La description dépasse 280 caractères.', MESSAGES_POINT.controle.description],
    ["L'action attendue dépasse 80 caractères.", MESSAGES_POINT.controle.attendu],
    ["L'échéance ne peut pas être passée.", MESSAGES_POINT.controle.echeancePassee],
    ['Ce ministère ne peut pas être mentionné.', MESSAGES_POINT.controle.mentionRefusee],
    ['Le signalement dépasse 280 caractères.', TEXTES_SIGNALEMENT.erreurLong],
    ["Choisissez l'écran concerné dans la liste.", TEXTES_SIGNALEMENT.erreurEcran],
    [
      'Les crochets et « texte masqué » sont réservés à la modération.',
      TEXTES_SIGNALEMENT.erreurCrochets,
    ],
    [
      'Le commentaire fait 10 caractères au moins, ou reste vide.',
      TEXTES_BLOC_SIGNALEMENTS.erreurCommentaireCourt,
    ],
    // Sessions (T66, t313 et m124) et événements (m124).
    ["Un ministère coché n'est pas actif.", TEXTES_EVENEMENT.erreurMention],
    // Heures d'un événement (T68) : E2 et E3 reprennent les consignes du contrôle avant l'envoi.
    [
      "L'heure de début se saisit pour un événement terminé.",
      TEXTES_EVENEMENT.erreurHeureDebutSansTermine,
    ],
    ["L'heure prévue est invalide.", TEXTES_EVENEMENT.erreurHeure],
    [
      "L'heure de début se saisit le jour de l'événement ou après.",
      "L'heure de début se saisit le jour de l'événement ou après.",
    ],
    ["Ce mois n'est pas encore commencé.", MESSAGES_MOIS.futur],
    ['Un mois se saisit à la date de son 1er jour.', MESSAGES_MOIS.invalide],
    ['Ce mois est trop ancien pour être saisi.', MESSAGES_MOIS.trop_ancien],
    ['Indiquez votre prénom.', MESSAGES_PRENOM.vide],
    ['30 caractères au plus.', MESSAGES_PRENOM.long],
    ['Écrivez seulement votre prénom, en lettres.', MESSAGES_PRENOM.lettres],
  ])('« %s »', (base, avantEnvoi) => {
    expect(phrase(base)).toBe(avantEnvoi)
  })
})

describe('un refus qui dit que la session a changé la fait relire (m271, m272)', () => {
  afterEach(() => surSessionChangee(null))

  it('connexion expirée ou compte désactivé : le rappel de la session part après la lecture', async () => {
    const relire = vi.fn()
    surSessionChangee(relire)
    for (const erreur of [
      refus('JWT expired', 'PGRST303'),
      refus('Double authentification requise.', '42501'),
      refus('Session inconnue : reconnectez-vous.', '42501'),
      { message: 'JWT expired' },
      refus('Compte inactif ou inconnu.', '42501'),
    ]) {
      lireErreurBase(erreur)
    }
    // Jamais pendant la lecture : un écran peut lire l'erreur pendant son rendu.
    expect(relire).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(relire).toHaveBeenCalledTimes(5))
  })

  it('un autre refus, une coupure ou le repli ne relisent pas la session', async () => {
    const relire = vi.fn()
    surSessionChangee(relire)
    lireErreurBase(refus('row-level security', '42501'))
    lireErreurBase(refus('Les STARs en FIJ ne peuvent pas dépasser les STARs actifs.'))
    lireErreurBase(new TypeError('Failed to fetch'))
    lireErreurBase({ message: '<html>502 Bad Gateway</html>' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(relire).not.toHaveBeenCalled()
  })
})

describe('mauvais déploiement (m253)', () => {
  it('se reconnaît au nom de l’erreur, sans dépendre du client Supabase', () => {
    expect(
      estErreurConfiguration(Object.assign(new Error('x'), { name: 'ErreurConfiguration' })),
    ).toBe(true)
    expect(estErreurConfiguration(new TypeError('Failed to fetch'))).toBe(false)
    expect(estErreurConfiguration({ name: 'ErreurConfiguration' })).toBe(false)
  })
})

describe('phraseErreur et phraseLecture', () => {
  const ecran = { connexion: 'La connexion a échoué. Réessayez.', acces: 'Accès propre.' }

  it('une création sans réponse après 10 s : vérifier la liste avant de réessayer (m259)', () => {
    const delai = { code: '', message: 'TimeoutError: signal timed out' }
    expect(phraseErreur(delai, { ...ecran, creation: true })).toBe(
      'La connexion a échoué. Vérifiez la liste avant de réessayer.',
    )
    expect(phraseErreur(delai, ecran)).toBe(ecran.connexion)
    expect(phraseErreur({ code: '', message: 'TypeError: Failed to fetch' }, ecran)).toBe(
      ecran.connexion,
    )
  })

  it('refus d’accès : la phrase de l’écran, sinon la phrase commune', () => {
    const acces = refus('row-level security', '42501')
    expect(phraseErreur(acces, ecran)).toBe('Accès propre.')
    expect(phraseErreur(acces, { connexion: 'x' })).toBe(MESSAGES_COMMUNS.acces)
  })

  it('lecture abandonnée après 10 s : la réponse met trop de temps (m252)', () => {
    expect(phraseLecture({ code: '', message: 'TimeoutError: x' }, 'Échec.')).toBe(
      'La réponse met trop de temps. Réessayez.',
    )
    expect(phraseLecture(new TypeError('Failed to fetch'), 'Échec.')).toBe('Échec.')
  })
})

// --- Les migrations : chaque `raise exception` a sa phrase ou prend volontairement le repli ---

const MIGRATIONS = import.meta.glob<string>('../../supabase/migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
})

interface Levee {
  code: string
  modele: string
  suite: string
  fonction: string
}

/** Types des paramètres d'une fonction, sans leurs noms ni leurs valeurs par défaut. */
function signature(parametres: string): string {
  const morceaux: string[] = []
  let profondeur = 0
  let courant = ''
  for (const caractere of parametres) {
    if (caractere === '(') profondeur += 1
    if (caractere === ')') profondeur -= 1
    if (caractere === ',' && profondeur === 0) {
      morceaux.push(courant)
      courant = ''
    } else courant += caractere
  }
  if (courant.trim() !== '') morceaux.push(courant)
  return morceaux
    .map((morceau) =>
      morceau
        .trim()
        .replace(/\s+default\s+[\s\S]*$/i, '')
        .replace(/^(in|out|inout)\s+/i, '')
        .replace(/^p_\w+\s+/i, '')
        .replace(/\s+/g, ' ')
        .toLowerCase(),
    )
    .join(',')
}

/** Corps de la dernière définition de chaque fonction (une fonction supprimée n'en a plus). */
function dernieresDefinitions(): Map<string, string> {
  const corps = new Map<string, string>()
  const fichiers = Object.keys(MIGRATIONS).sort()
  for (const fichier of fichiers) {
    const texte = (MIGRATIONS[fichier] ?? '').replace(/--[^\n]*/g, '')
    const expression =
      /(create\s+(?:or\s+replace\s+)?function|drop\s+function(?:\s+if\s+exists)?)\s+([a-z0-9_.]+)\s*\(([^)]*(?:\([^)]*\)[^)]*)*)\)([\s\S]*?)(?:\$(\w*)\$([\s\S]*?)\$\5\$|;)/gi
    for (const trouve of texte.matchAll(expression)) {
      const cle = `${trouve[2]}(${signature(trouve[3] ?? '')})`
      if (/^drop/i.test(trouve[1] ?? '')) corps.delete(cle)
      else corps.set(cle, trouve[6] ?? '')
    }
  }
  return corps
}

const DEFINITIONS = dernieresDefinitions()

function levees(): Levee[] {
  const toutes: Levee[] = []
  for (const [fonction, corps] of DEFINITIONS) {
    for (const trouve of corps.matchAll(/raise\s+exception\s+'((?:[^']|'')*)'([^;]*);/gi)) {
      const suite = trouve[2] ?? ''
      toutes.push({
        code: /errcode\s*=\s*'(\w+)'/i.exec(suite)?.[1] ?? 'P0001',
        modele: (trouve[1] ?? '').replace(/''/g, "'"),
        suite,
        fonction,
      })
    }
  }
  return toutes
}

/** Textes littéraux rendus par un `then` ou un `else` (les messages d'une expression case). */
function litteraux(texte: string): string[] {
  return [...texte.matchAll(/\b(?:then|else)\s+'((?:[^']|'')*)'/gi)].map((trouve) =>
    (trouve[1] ?? '').replace(/''/g, "'"),
  )
}

/** Messages possibles d'un `raise exception '%', ...` : littéraux de l'expression, ou de verifier_texte. */
function messagesDynamiques(levee: Levee): string[] {
  const directs = litteraux(levee.suite)
  if (directs.length > 0) return directs
  const verifierTexte = [...DEFINITIONS].find(([nom]) => nom.startsWith('private.verifier_texte('))
  return litteraux(verifierTexte?.[1] ?? '')
}

function expressionDuModele(modele: string): RegExp {
  const echappe = modele.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.+')
  return new RegExp(`^${echappe}$`, 's')
}

/** Un modèle de la base est couvert par une clé : identique, ou la clé en est un cas particulier. */
function couvert(modele: string, cles: readonly string[]): boolean {
  if (cles.includes(modele)) return true
  if (!modele.includes('%')) return false
  const expression = expressionDuModele(modele)
  return cles.some((cle) => expression.test(cle))
}

describe('table de traduction et migrations', () => {
  const toutes = levees()

  it('lit les levées des migrations (dernière définition de chaque fonction)', () => {
    expect(toutes.length).toBeGreaterThan(150)
    expect(toutes.some((levee) => levee.modele === 'Double authentification requise.')).toBe(true)
  })

  it('chaque refus de saisie (P0001) a sa phrase ou prend volontairement le repli', () => {
    const manquants = toutes
      .filter((levee) => levee.code === 'P0001')
      .flatMap((levee) => (levee.modele === '%' ? messagesDynamiques(levee) : [levee.modele]))
      .filter((modele) => !couvert(modele, CLES_REFUS_DE_SAISIE))
    expect(manquants).toEqual([])
  })

  it('chaque refus de droit (42501) est classé : expiré, désactivé, accès, phrase ou repli', () => {
    const manquants = toutes
      .filter((levee) => levee.code === '42501')
      .filter((levee) => !couvert(levee.modele, CLES_REFUS_DE_DROIT))
      .map((levee) => `${levee.fonction} : ${levee.modele}`)
    expect(manquants).toEqual([])
  })

  it('aucune levée n’emploie un autre code que P0001 et 42501 sans passer par le repli', () => {
    const autres = toutes.filter((levee) => levee.code !== 'P0001' && levee.code !== '42501')
    expect(autres.map((levee) => `${levee.fonction} : ${levee.code}`)).toEqual([])
  })

  it('chaque clé de la table existe dans une migration (une faute de frappe tomberait au repli)', () => {
    const modelesSaisie = toutes
      .filter((levee) => levee.code === 'P0001')
      .flatMap((levee) => (levee.modele === '%' ? messagesDynamiques(levee) : [levee.modele]))
    const modelesDroit = toutes
      .filter((levee) => levee.code === '42501')
      .map((levee) => levee.modele)
    const orphelines = [
      ...CLES_REFUS_DE_SAISIE.filter(
        (cle) => !modelesSaisie.some((modele) => couvert(modele, [cle])),
      ),
      ...CLES_REFUS_DE_DROIT.filter(
        (cle) => !modelesDroit.some((modele) => couvert(modele, [cle])),
      ),
    ]
    expect(orphelines).toEqual([])
  })

  it('les codes des fonctions serveur des comptes sont tous traduits par les Edge Functions', () => {
    const codes = toutes.map((levee) => levee.modele).filter((modele) => /^[a-z_]+$/.test(modele))
    expect(codes.length).toBeGreaterThan(0)
    for (const code of codes) {
      expect(traduireErreurBase({ code: 'P0001', message: code }).code, code).not.toBe(
        'erreur_interne',
      )
    }
  })
})
