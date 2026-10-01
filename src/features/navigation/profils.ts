import { matchPath } from 'react-router'
import type { TypeCompte } from '@/lib/base'

// Navigation par profil (BRIEF sections 2 et 9, maquette 00) et table des adresses de
// l'application. Un profil ne voit jamais les onglets d'un autre ; chaque adresse déclare ses
// profils, et la garde lit le type de compte avant tout appel de données.

export type Onglet = { libelle: string; chemin: string }

/** Onglets de chaque profil. Le premier est l'accueil. */
export const ONGLETS: Record<TypeCompte, readonly Onglet[]> = {
  ministere: [
    { libelle: 'Cette semaine', chemin: '/' },
    { libelle: 'Ma fiche', chemin: '/ma-fiche' },
    { libelle: 'Mes points', chemin: '/points' },
    { libelle: 'Mon journal', chemin: '/journal' },
  ],
  berger: [
    { libelle: 'Cette semaine', chemin: '/' },
    { libelle: 'Ministères', chemin: '/ministeres' },
    { libelle: "Points d'attention", chemin: '/points' },
    { libelle: 'Journal', chemin: '/journal' },
  ],
  conseil: [
    { libelle: 'Cette semaine', chemin: '/' },
    { libelle: 'Ministères', chemin: '/ministeres' },
    { libelle: "Points d'attention", chemin: '/points' },
    { libelle: 'Journal', chemin: '/journal' },
  ],
  admin_eglise: [
    { libelle: 'Cette semaine', chemin: '/' },
    { libelle: 'Ministères et comptes', chemin: '/comptes' },
    { libelle: 'Sessions', chemin: '/sessions' },
    { libelle: 'Journal', chemin: '/journal' },
  ],
  admin_plateforme: [
    { libelle: 'Modération', chemin: '/moderation' },
    { libelle: 'Journal technique', chemin: '/journal-technique' },
  ],
}

/** Accueil du profil : son premier onglet (EJP Tech est renvoyé vers /moderation). */
export function accueil(type: TypeCompte): string {
  return ONGLETS[type][0]?.chemin ?? '/'
}

export type AdresseApplication = {
  /** Motif React Router (« /ministeres/:id »). */
  chemin: string
  profils: readonly TypeCompte[]
  /** Titre par défaut ; l'onglet du profil, s'il existe, donne le sien (« Mes points »). */
  titre: string
  /** Étape du plan (BRIEF section 13) qui construit l'écran. */
  etape: number
}

const LECTEURS: readonly TypeCompte[] = ['berger', 'conseil']

/** Table des adresses (BRIEF section 9, « Adresses »). Les saisies arrivent aux étapes 4 et 5. */
export const ADRESSES_APPLICATION: readonly AdresseApplication[] = [
  {
    chemin: '/',
    profils: ['ministere', ...LECTEURS, 'admin_eglise'],
    titre: 'Cette semaine',
    etape: 3,
  },
  { chemin: '/ma-fiche', profils: ['ministere'], titre: 'Ma fiche', etape: 4 },
  { chemin: '/ministeres', profils: LECTEURS, titre: 'Ministères', etape: 4 },
  { chemin: '/ministeres/:id', profils: LECTEURS, titre: 'Fiche du ministère', etape: 4 },
  {
    chemin: '/points',
    profils: ['ministere', ...LECTEURS],
    titre: "Points d'attention",
    etape: 5,
  },
  {
    chemin: '/journal',
    profils: ['ministere', ...LECTEURS, 'admin_eglise'],
    titre: 'Journal',
    etape: 6,
  },
  { chemin: '/comptes', profils: ['admin_eglise'], titre: 'Ministères et comptes', etape: 6 },
  { chemin: '/sessions', profils: ['admin_eglise'], titre: 'Sessions', etape: 6 },
  { chemin: '/moderation', profils: ['admin_plateforme'], titre: 'Modération', etape: 6 },
  {
    chemin: '/journal-technique',
    profils: ['admin_plateforme'],
    titre: 'Journal technique',
    etape: 6,
  },
]

/** Adresse de l'application qui correspond au chemin, ou null (page introuvable). */
export function trouverAdresse(chemin: string): AdresseApplication | null {
  return (
    ADRESSES_APPLICATION.find((adresse) => matchPath({ path: adresse.chemin }, chemin) !== null) ??
    null
  )
}

/** Titre de l'écran pour ce profil : le libellé de son onglet s'il en a un. */
export function titrePour(adresse: AdresseApplication, type: TypeCompte): string {
  return ONGLETS[type].find((onglet) => onglet.chemin === adresse.chemin)?.libelle ?? adresse.titre
}

/** Le profil a-t-il droit à ce chemin ? Un chemin inconnu n'est à personne. */
export function profilAutorise(chemin: string, type: TypeCompte): boolean {
  return trouverAdresse(chemin)?.profils.includes(type) ?? false
}
