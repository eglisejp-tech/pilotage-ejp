// Messages des écrans de connexion (BRIEF section 8, « Messages d'erreur », et
// docs/reference/maquettes/LISEZMOI.md, « États »). L'étape 2 traduit chaque erreur de
// Supabase Auth vers l'un de ces textes ; les écrans les affichent tels quels. Le contact pour
// toute demande ou tout blocage est EJP Tech (T59, 12 octobre 2026). Textes revus par T66.
export const messagesConnexion = {
  identifiantsIncorrects:
    "L'email ou le mot de passe ne correspond pas. Vérifiez les deux, puis réessayez.",
  codeFaux: "Ce code ne correspond pas. Saisissez le code affiché maintenant dans l'application.",
  /** « session » est réservé aux sessions de l'église (T66, m017) : un seul texte, « connexion ». */
  connexionExpiree: 'Votre connexion a expiré. Reconnectez-vous.',
  /** T66 (m038) : la connexion du lien se perd pendant le choix du mot de passe. */
  connexionExpireeLien:
    "Votre connexion a expiré. Demandez un nouveau lien depuis l'écran de connexion.",
  /** Proposé (m015, T59) : la même phrase partout où un compte désactivé se présente. */
  compteDesactive: 'Ce compte est désactivé. Contactez EJP Tech.',
  /**
   * Proposé (m013, T59) : retour de Google d'une adresse sans compte actif. Une adresse inconnue
   * saisie avec un mot de passe garde `identifiantsIncorrects` (aucune énumération des comptes).
   */
  googleSansCompte:
    'Aucun compte actif pour cette adresse. Ouvrez votre invitation ou demandez un compte à EJP Tech.',
  /** Proposé (m014) : fenêtre de Google fermée ou refusée, ou retour de Google non reconnu. */
  googleInterrompu:
    "La connexion avec Google n'a pas abouti. Réessayez, ou connectez-vous avec votre email.",
  tropDeTentatives: 'Trop de tentatives. Attendez quelques minutes, puis réessayez.',
  /** T66 (m023) : limite d'envoi d'emails atteinte, un lien est peut-être déjà parti. */
  lienDejaParti:
    'Un lien vient peut-être déjà de partir. Regardez votre messagerie, ou réessayez dans quelques minutes.',
  /** Aucune réponse : réseau coupé, hors ligne, délai dépassé. */
  echecReseau: 'La connexion a échoué. Réessayez.',
  /** T66 (m027) : le jeton n'est consommé qu'à la réussite, le lien reste valable. */
  echecReseauLien: 'La connexion a échoué. Le lien reste valable : réessayez.',
  /** Proposé (m019) : le serveur d'Auth répond par une panne (5xx, code inconnu). */
  panneConnexion:
    "La connexion n'a pas abouti. Réessayez dans quelques minutes, et si le problème revient, prévenez EJP Tech.",
  /** Proposé (m253) : adresse ou clé publique absente, ou clé secrète fournie (déploiement). */
  indisponible: "Pilotage EJP n'est pas disponible pour le moment. Prévenez EJP Tech.",
  /** Proposé (m060) : sur l'écran de connexion, après « Se déconnecter ». */
  deconnecte: 'Compte déconnecté.',
  motDePasseFaible: 'Ce mot de passe est trop facile à deviner. Choisissez-en un autre.',
  memeMotDePasse: "Choisissez un mot de passe différent de l'ancien.",
  lienEnvoye:
    "Si un compte existe pour cette adresse, un lien vient d'être envoyé. Regardez aussi les courriers indésirables.",
  lienInvalide: "Ce lien n'est plus valable",
  /** Proposé (m029, T59). Un lien de récupération refusé n'a pas de phrase : le lien dessous
   * « Demander un nouveau lien » fait l'action (T66, t014). */
  lienInvalideInvitation: "Demandez à EJP Tech de renvoyer l'invitation.",
} as const
