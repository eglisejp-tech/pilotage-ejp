import { messagesConnexion } from '@/features/connexion/messages'

/** État simulé d'un écran dans l'aperçu : les mêmes propriétés que l'étape 2 fournira. */
export type EtatSimule = {
  libelle: string
  enCours?: boolean
  /** Pour l'écran 16 : l'action en cours est la redirection vers Google. */
  google?: boolean
  erreur?: string
  envoye?: boolean
  lienInvalide?: boolean
  /** Pour l'écran 17 : QR code pas encore reçu. */
  chargement?: boolean
}

export const etatNormal: EtatSimule = { libelle: 'Normal' }

const erreurReseau: EtatSimule = {
  libelle: 'Erreur : réseau',
  erreur: messagesConnexion.echecReseau,
}
const erreurTentatives: EtatSimule = {
  libelle: 'Erreur : trop de tentatives',
  erreur: messagesConnexion.tropDeTentatives,
}
const erreurCode: EtatSimule = { libelle: 'Erreur : code faux', erreur: messagesConnexion.codeFaux }
const erreurExpiree: EtatSimule = {
  libelle: 'Erreur : connexion expirée',
  erreur: messagesConnexion.connexionExpiree,
}
const etatsAcces: Record<string, EtatSimule> = {
  normal: etatNormal,
  'en-cours': { libelle: 'Vérification du lien', enCours: true },
  'lien-invalide': { libelle: 'Lien plus valable', lienInvalide: true },
  'erreur-reseau': erreurReseau,
}
const etatsMotDePasse: Record<string, EtatSimule> = {
  normal: etatNormal,
  'en-cours': { libelle: 'Enregistrement en cours', enCours: true },
  'erreur-reseau': erreurReseau,
}

export const clesEcransSimules = [
  'connexion',
  'activation',
  'code',
  'acces-invitation',
  'acces-recuperation',
  'choisir-mot-de-passe',
  'nouveau-mot-de-passe',
  'mot-de-passe-oublie',
  'compte-desactive',
] as const

export type CleEcranSimule = (typeof clesEcransSimules)[number]

export const ecransSimules: Record<
  CleEcranSimule,
  { libelle: string; etats: Record<string, EtatSimule> }
> = {
  connexion: {
    libelle: 'Connexion (16)',
    etats: {
      normal: etatNormal,
      'en-cours': { libelle: 'Connexion en cours', enCours: true },
      'en-cours-google': { libelle: 'Ouverture de Google', enCours: true, google: true },
      'erreur-identifiants': {
        libelle: 'Erreur : email ou mot de passe',
        erreur: messagesConnexion.identifiantsIncorrects,
      },
      'erreur-google': {
        libelle: 'Erreur : adresse Google sans compte',
        erreur: messagesConnexion.googleSansCompte,
      },
      'erreur-desactive': {
        libelle: 'Erreur : compte désactivé',
        erreur: messagesConnexion.compteDesactive,
      },
      'erreur-expiree': erreurExpiree,
      'erreur-session': {
        libelle: 'Erreur : session expirée',
        erreur: messagesConnexion.sessionExpiree,
      },
      'erreur-tentatives': erreurTentatives,
    },
  },
  activation: {
    libelle: 'Activation de la double authentification (17)',
    etats: {
      normal: etatNormal,
      chargement: { libelle: 'QR code en préparation', chargement: true },
      'en-cours': { libelle: 'Activation en cours', enCours: true },
      'erreur-code': erreurCode,
    },
  },
  code: {
    libelle: 'Code à chaque connexion (18)',
    etats: {
      normal: etatNormal,
      'en-cours': { libelle: 'Vérification en cours', enCours: true },
      'erreur-code': erreurCode,
      'erreur-tentatives': erreurTentatives,
      'erreur-expiree': erreurExpiree,
    },
  },
  'acces-invitation': { libelle: 'Accès par lien : invitation', etats: etatsAcces },
  'acces-recuperation': { libelle: 'Accès par lien : mot de passe oublié', etats: etatsAcces },
  'choisir-mot-de-passe': { libelle: 'Choisissez votre mot de passe', etats: etatsMotDePasse },
  'nouveau-mot-de-passe': { libelle: 'Nouveau mot de passe', etats: etatsMotDePasse },
  'mot-de-passe-oublie': {
    libelle: 'Mot de passe oublié',
    etats: {
      normal: etatNormal,
      'en-cours': { libelle: 'Envoi en cours', enCours: true },
      envoye: { libelle: 'Lien envoyé', envoye: true },
      'erreur-tentatives': erreurTentatives,
    },
  },
  'compte-desactive': { libelle: 'Compte désactivé', etats: { normal: etatNormal } },
}

export function estCleEcranSimule(valeur: string | null): valeur is CleEcranSimule {
  return valeur !== null && Object.hasOwn(ecransSimules, valeur)
}
