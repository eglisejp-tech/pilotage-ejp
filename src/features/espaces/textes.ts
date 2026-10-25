// Textes de « Changer d'espace » (T73), selon docs/conception/guide-de-redaction.md. Le mot
// « session » reste réservé aux sessions de l'église : on dit « connexion » et « compte ».

export const TEXTES_ESPACES = {
  /** Bouton de l'en-tête, et nom du panneau qu'il ouvre. */
  bouton: "Changer d'espace",
  /** Nom de la liste, pour les lecteurs d'écran. */
  liste: 'Comptes ouverts sur cet appareil',
  actif: 'espace actif',
  ajouter: 'Ajouter un compte',
  retirer: 'Retirer ce compte',
  changementEnCours: 'Changement en cours',
  ajoutEnCours: 'Ouverture en cours',
  retraitEnCours: 'Retrait en cours',
  /** Sous la liste, dès deux comptes : « Se déconnecter » ne ferme pas qu'un compte. */
  deconnexionDeTous: (nombre: number) => `« Se déconnecter » ferme les ${nombre} comptes.`,
  /** Un autre compte de la liste de l'en-tête. */
  passer: (libelle: string) => `Passer à ${libelle}`,
  /** Écrans de connexion et de code d'un espace en cours d'ajout ou expiré. */
  revenir: (libelle: string) => `Revenir à ${libelle}`,
  /** Écran de connexion d'un espace en cours d'ajout. */
  ajout: 'Connectez-vous avec le compte à ajouter. Vos autres comptes restent ouverts.',
  /** Écran de connexion d'un espace dont la connexion a pris fin. */
  connexionExpiree: (libelle: string) => `Votre connexion à ${libelle} a expiré. Reconnectez-vous.`,
  enregistrementEnCours: 'Un enregistrement est en cours. Réessayez dans un instant.',
  tropDeComptes:
    'Quatre comptes sont déjà ouverts sur cet appareil. Retirez-en un, puis réessayez.',
} as const
