import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { auditerAxe, decrireFautes } from './outils/axe.ts'
import {
  LARGEUR_MINIMALE,
  ciblesTropPetites,
  debordementHorizontal,
  decrireRapportClavier,
  parcourirAuClavier,
  problemesEchapDesAides,
  problemesEchapDuMenu,
  problemesDeStructure,
  problemesPiegeDuFocus,
} from './outils/controles.ts'
import { marquerFauteConnue } from './outils/fautes-connues.ts'

// Audit transversal de l'étape 7 (plan, section 3.3, lot F2) sur TOUS les aperçus de
// développement et sur les pages publiques : aucune faute axe (WCAG 2.1 A et AA), aucun
// défilement horizontal à 360 px et à 200 % de zoom, cibles de 44 px, Tab jusqu'à chaque
// action (l'action principale comprise), anneau de focus visible, Échap qui ferme les bulles
// d'aide et le menu, piège du focus des panneaux. Trois formats par les projets Playwright :
// 1440, 834 et 390 px. Les panneaux des aperçus ont une fermeture sans effet : que Échap ferme
// vraiment un panneau se vérifie sur les pages réelles, dans e2e/base/accessibilite.spec.ts.
// Le test qui échoue reste dans la suite jusqu'à sa correction (lot F3).

type Ecran = {
  nom: string
  adresse: string
  /** Zones de l'aperçu qui ne sont pas l'écran audité (barres de choix d'aperçu). */
  exclure?: string[]
}

const BARRES_CETTE_SEMAINE = [
  'nav[aria-label="Profil de l\'aperçu"]',
  'nav[aria-label="État de l\'aperçu"]',
]

const PROFILS = ['berger', 'conseil', 'ministere', 'admin_eglise', 'admin_plateforme'] as const

// Écrans de connexion : chaque écran avec chacun de ses états simulés (src/features/connexion/
// apercu/scenarios.ts). « outils=non » retire la barre de réglages de l'aperçu.
const ETATS_CONNEXION: Record<string, string[]> = {
  connexion: [
    'normal',
    'en-cours',
    'en-cours-google',
    'erreur-identifiants',
    'erreur-google',
    'erreur-desactive',
    'erreur-expiree',
    'erreur-session',
    'erreur-tentatives',
  ],
  activation: ['normal', 'chargement', 'en-cours', 'erreur-code'],
  code: ['normal', 'en-cours', 'erreur-code', 'erreur-tentatives', 'erreur-expiree'],
  'acces-invitation': ['normal', 'en-cours', 'lien-invalide', 'erreur-reseau'],
  'acces-recuperation': ['normal', 'en-cours', 'lien-invalide', 'erreur-reseau'],
  'choisir-mot-de-passe': ['normal', 'en-cours', 'erreur-reseau'],
  'nouveau-mot-de-passe': ['normal', 'en-cours', 'erreur-reseau'],
  'mot-de-passe-oublie': ['normal', 'en-cours', 'envoye', 'erreur-tentatives'],
  'compte-desactive': ['normal'],
}

const CONNEXION: Ecran[] = [
  ...Object.entries(ETATS_CONNEXION).flatMap(([ecran, etats]) =>
    etats.map((etat) => ({
      nom: `connexion ${ecran} ${etat}`,
      adresse: `/apercu/connexion?outils=non&ecran=${ecran}&etat=${etat}`,
    })),
  ),
  {
    nom: 'connexion activation compte personnel',
    adresse: '/apercu/connexion?outils=non&ecran=activation&compte=personnel',
  },
]

const PUBLICS: Ecran[] = [
  { nom: 'public connexion', adresse: '/connexion' },
  { nom: 'public confidentialité', adresse: '/confidentialite' },
  { nom: 'public conditions', adresse: '/conditions' },
  { nom: 'public compte désactivé', adresse: '/compte-desactive' },
  { nom: 'public lien sans jeton', adresse: '/acces?type=invite' },
]

const CETTE_SEMAINE: Ecran[] = [
  ...PROFILS.flatMap((profil) =>
    ['semaine', 'premier-dimanche', 'session-jamais-tenue', 'chargement', 'erreur'].map((etat) => ({
      nom: `cette-semaine ${profil} ${etat}`,
      adresse: `/apercu/cette-semaine?profil=${profil}&etat=${etat}`,
      exclure: BARRES_CETTE_SEMAINE,
    })),
  ),
  {
    nom: 'cette-semaine berger anti-dispersion',
    adresse: '/apercu/cette-semaine?profil=berger&session=anti-dispersion',
    exclure: BARRES_CETTE_SEMAINE,
  },
]

const NAVIGATION: Ecran[] = PROFILS.map((profil) => ({
  nom: `navigation ${profil}`,
  adresse: `/apercu/navigation?profil=${profil}`,
}))

const FICHE: Ecran[] = [
  ...(['berger', 'conseil', 'admin_plateforme', 'ministere', 'admin_eglise'] as const).map(
    (profil) => ({ nom: `fiche ${profil}`, adresse: `/apercu/fiche?ecran=fiche&profil=${profil}` }),
  ),
  ...['fiche-vide', 'fiche-erreur-bloc', 'fiche-erreur-points', 'fiche-erreur-details'].map(
    (ecran) => ({ nom: `fiche ${ecran}`, adresse: `/apercu/fiche?ecran=${ecran}&profil=berger` }),
  ),
  {
    nom: 'fiche fiche-vide ministere',
    adresse: '/apercu/fiche?ecran=fiche-vide&profil=ministere',
  },
  { nom: 'fiche chargement', adresse: '/apercu/fiche?ecran=chargement' },
  { nom: 'fiche erreur', adresse: '/apercu/fiche?ecran=erreur' },
  { nom: 'fiche introuvable', adresse: '/apercu/fiche?ecran=introuvable' },
  { nom: 'ministères berger', adresse: '/apercu/fiche?ecran=ministeres&profil=berger' },
  {
    nom: 'ministères admin_plateforme',
    adresse: '/apercu/fiche?ecran=ministeres&profil=admin_plateforme',
  },
  { nom: 'ministères vide', adresse: '/apercu/fiche?ecran=ministeres-vide&profil=conseil' },
  { nom: 'ministères erreur', adresse: '/apercu/fiche?ecran=ministeres-erreur&profil=berger' },
]

// Lot E3 : saisie du dimanche (maquette 08) et « Chiffres du mois », chacune dans ses états
// (src/features/saisie-chiffres/apercu/etatsApercu.ts).
const SAISIES: Ecran[] = [
  ...['correction', 'matin', 'matin-vide', 'refuse', 'chargement', 'erreur', 'coupure'].map(
    (etat) => ({
      nom: `saisies dimanche ${etat}`,
      adresse: `/apercu/saisies?profil=ministere&ecran=dimanche&etat=${etat}`,
    }),
  ),
  { nom: 'saisies dimanche', adresse: '/apercu/saisies?profil=ministere' },
  ...[
    'correction',
    'masquee',
    'sans-categories',
    'sans-indicateur',
    'refuse',
    'chargement',
    'erreur',
    'coupure',
    'refus-precision',
  ].map((etat) => ({
    nom: `saisies mois ${etat}`,
    adresse: `/apercu/saisies?profil=ministere&ecran=mois&etat=${etat}`,
  })),
  { nom: 'saisies mois', adresse: '/apercu/saisies?profil=ministere&ecran=mois' },
  { nom: 'saisies page non disponible (berger)', adresse: '/apercu/saisies?profil=berger' },
]

// Lot E8 : « Signaler une difficulté » (ministère) et bloc « Signalements » (EJP Tech).
const SIGNALEMENTS: Ecran[] = [
  ...['formulaire', 'premier-usage', 'liste-probleme', 'lien-long'].map((vue) => ({
    nom: `signalements ministère ${vue}`,
    adresse: `/apercu/signalements?profil=ministere&ecran=saisie_evenement&vue=${vue}`,
  })),
  ...[
    'bloc',
    'bloc-lien-long',
    'bloc-sans-ouvert',
    'bloc-vide',
    'bloc-chargement',
    'bloc-probleme',
  ].map((vue) => ({
    nom: `signalements ejp-tech ${vue}`,
    adresse: `/apercu/signalements?profil=admin_plateforme&vue=${vue}`,
  })),
  { nom: 'signalements berger', adresse: '/apercu/signalements?profil=berger' },
]

// Lot E6 : calendrier de la fiche, prochaine réunion, événements à confirmer.
const CALENDRIER: Ecran[] = [
  ['fiche', 'berger'],
  ['fiche', 'ministere'],
  ['fiche-alerte', 'berger'],
  ['fiche-alerte', 'ministere'],
  ['fiche-alerte', 'admin_plateforme'],
  ['fiche-vide', 'berger'],
  ['fiche-vide', 'ministere'],
  ['fiche-erreur', 'berger'],
  ['fiche-chargement', 'berger'],
  ['a-confirmer', 'berger'],
  ['a-confirmer-un', 'conseil'],
  ['a-confirmer-vide', 'berger'],
  ['a-confirmer-erreur', 'berger'],
].map(([ecran, profil]) => ({
  nom: `calendrier ${ecran} ${profil}`,
  adresse: `/apercu/calendrier?ecran=${ecran}&profil=${profil}`,
}))

const SAISIES_E4: Ecran[] = [
  ['session', 'ministere', null],
  ['session', 'ministere', 'correction'],
  ['choix-session', 'ministere', null],
  ['choix-session', 'ministere', 'vide'],
  ['choix-session', 'ministere', 'toutes-saisies'],
  ['carte-fij', 'ministere', null],
  ['carte-fij', 'ministere', 'premier-usage'],
  ['chiffres-departement', 'ministere', null],
  ['chiffres-departement', 'ministere', 'premier-usage'],
  ['bloc-departements', 'berger', null],
  ['bloc-departements', 'berger', 'semaine-vide'],
  ['bloc-departements', 'ministere', 'premier-usage'],
  ['bloc-departements', 'admin_plateforme', 'premier-usage'],
  ['bloc-departements', 'berger', 'erreur'],
].map(([ecran, profil, etat]) => ({
  nom: `saisies-e4 ${[ecran, profil, etat].filter(Boolean).join(' ')}`,
  adresse: `/apercu/saisies-e4?ecran=${ecran}&profil=${profil}${etat ? `&etat=${etat}` : ''}`,
}))

const EVENEMENTS: Ecran[] = [
  ...[
    'ajout',
    'sans-mention',
    'mise-a-jour',
    'a-confirmer',
    'pas-porteur',
    'introuvable',
    'probleme',
    'reunion',
    'reunion-modifier',
    'reunion-probleme',
  ].map((ecran) => ({
    nom: `evenements ${ecran}`,
    adresse: `/apercu/evenements?profil=ministere&ecran=${ecran}`,
  })),
  {
    nom: 'evenements chargement',
    adresse: '/apercu/evenements?profil=ministere&ecran=chargement',
  },
  {
    nom: 'evenements ajout envoi en échec',
    adresse: '/apercu/evenements?profil=ministere&ecran=ajout&envoi=echec',
  },
  { nom: 'evenements page non disponible', adresse: '/apercu/evenements?profil=berger' },
]

const ECRANS: Ecran[] = [
  ...CONNEXION,
  ...PUBLICS,
  ...CETTE_SEMAINE,
  ...NAVIGATION,
  ...FICHE,
  ...SAISIES,
  ...SAISIES_E4,
  ...EVENEMENTS,
  ...SIGNALEMENTS,
  ...CALENDRIER,
]

async function ouvrir(page: Page, ecran: Ecran) {
  // Les aperçus n'appellent aucun serveur : leurs écrans sont prêts au chargement, et les écrans
  // de chargement (`aria-busy`) sont audités tels quels.
  await page.goto(ecran.adresse)
  await expect(page.locator('main, h1').first()).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

test('le catalogue ne contient pas deux fois le même écran', () => {
  const noms = ECRANS.map((ecran) => ecran.nom)
  expect(new Set(noms).size).toBe(noms.length)
  const adresses = ECRANS.map((ecran) => ecran.adresse)
  expect(new Set(adresses).size).toBe(adresses.length)
})

for (const ecran of ECRANS) {
  test.describe(ecran.nom, () => {
    // Le premier chargement d'un aperçu compile ses modules : 60 s laissent de la marge.
    test.describe.configure({ timeout: 60_000 })
    // Une faute décrite dans l'audit (e2e/outils/fautes-connues.ts) marque le contrôle `test.fail()`.
    test('axe : aucune faute WCAG 2.1 A et AA', async ({ page }, testInfo) => {
      marquerFauteConnue(`${ecran.nom} | axe`, testInfo.project.name)
      await ouvrir(page, ecran)
      expect(decrireFautes(await auditerAxe(page, ecran.exclure))).toEqual([])
    })

    test('structure : un titre de niveau 1, un titre d’onglet, la langue, une zone main', async ({
      page,
    }, testInfo) => {
      marquerFauteConnue(`${ecran.nom} | structure`, testInfo.project.name)
      await ouvrir(page, ecran)
      expect(await problemesDeStructure(page, ecran.exclure)).toEqual([])
    })

    test('cibles de 44 px', async ({ page }, testInfo) => {
      marquerFauteConnue(`${ecran.nom} | cibles`, testInfo.project.name)
      await ouvrir(page, ecran)
      expect(await ciblesTropPetites(page, ecran.exclure)).toEqual([])
    })

    test('clavier : Tab atteint tout, focus visible, piège, Échap', async ({ page }, testInfo) => {
      marquerFauteConnue(`${ecran.nom} | clavier`, testInfo.project.name)
      await ouvrir(page, ecran)
      const problemes = [
        ...decrireRapportClavier(await parcourirAuClavier(page, ecran.exclure)),
        ...(await problemesPiegeDuFocus(page)),
        ...(await problemesEchapDesAides(page)),
        ...(await problemesEchapDuMenu(page)),
      ]
      expect(problemes).toEqual([])
    })

    test('360 px et zoom à 200 % : aucun défilement horizontal', async ({ page }, testInfo) => {
      // Les largeurs sont fixées ici : un seul projet suffit, pas trois.
      test.skip(testInfo.project.name !== 'ordinateur', 'mesuré une fois, à largeurs fixes')
      marquerFauteConnue(`${ecran.nom} | 360`, testInfo.project.name)
      const debords: string[] = []
      // 720 px de large : un écran de 1440 px à 200 % de zoom (WCAG 1.4.4).
      for (const largeur of [LARGEUR_MINIMALE, 720]) {
        await page.setViewportSize({ width: largeur, height: 800 })
        await ouvrir(page, ecran)
        const debord = await debordementHorizontal(page)
        if (debord > 0) debords.push(`${largeur} px : ${debord} px en trop à droite`)
      }
      expect(debords).toEqual([])
    })
  })
}
