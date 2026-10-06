import { matchPath } from 'react-router'
import type { TypeCompte } from '@/lib/base'
import { DECIDEURS, LECTEURS } from '@/lib/metier/droits'

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
  // EJP Tech lit aussi « Cette semaine », comme le berger, en lecture seule (T29).
  admin_plateforme: [
    { libelle: 'Modération', chemin: '/moderation' },
    { libelle: 'Cette semaine', chemin: '/' },
    { libelle: 'Journal technique', chemin: '/journal-technique' },
  ],
}

/** Accueil du profil : son premier onglet (/moderation pour EJP Tech). */
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

/**
 * Table des adresses (BRIEF section 9, « Adresses » ; plan de l'étape 4, section 4). Les saisies
 * arrivent aux étapes 4 et 5 ; l'étape 4 les déclare toutes une fois, ce fichier est ensuite figé
 * jusqu'au lot I.
 * Les adresses de lecture du berger s'ouvrent à LECTEURS (berger, conseil, et EJP Tech en
 * lecture seule, T29) ; leurs boutons d'action se montrent par estDecideur
 * (src/lib/metier/droits.ts), jamais par ce droit d'adresse.
 */
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
  // Saisies du ministère (étape 4, plan section 4, « Adresses »). EJP Tech lit tout et ne saisit
  // rien (T29) : aucune de ces adresses ne lui est ouverte, ni à l'administration de l'église.
  // Les deux saisies FIJ sont ouvertes au profil « ministère » ici : le lot E4 réserve la page au
  // ministère `fij` (un autre ministère reçoit la page non disponible).
  { chemin: '/saisir/dimanche', profils: ['ministere'], titre: 'Chiffres du dimanche', etape: 4 },
  { chemin: '/saisir/mois', profils: ['ministere'], titre: 'Chiffres du mois', etape: 4 },
  {
    chemin: '/saisir/session/:id',
    profils: ['ministere'],
    titre: "Saisie d'une session",
    etape: 4,
  },
  { chemin: '/saisir/fij', profils: ['ministere'], titre: 'Carte des FIJ', etape: 4 },
  {
    chemin: '/saisir/fij-statistiques',
    profils: ['ministere'],
    titre: 'Chiffres par département',
    etape: 4,
  },
  {
    chemin: '/saisir/evenement',
    profils: ['ministere'],
    titre: 'Ajouter un événement',
    etape: 4,
  },
  {
    chemin: '/saisir/evenement/:id',
    profils: ['ministere'],
    titre: "Mettre à jour l'événement",
    etape: 4,
  },
  { chemin: '/saisir/reunion', profils: ['ministere'], titre: 'Prochaine réunion', etape: 4 },
  // « Signaler une difficulté » (T39) : le ministère seul écrit, EJP Tech lit dans le bloc
  // « Signalements » de /moderation, le berger et le conseil n'y ont aucun accès.
  { chemin: '/signaler', profils: ['ministere'], titre: 'Signaler une difficulté', etape: 4 },
  {
    chemin: '/points',
    profils: ['ministere', ...LECTEURS],
    titre: "Points d'attention",
    etape: 5,
  },
  // EJP Tech lit le journal complet par son onglet « Journal technique » (étape 6).
  {
    chemin: '/journal',
    profils: ['ministere', ...DECIDEURS, 'admin_eglise'],
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
