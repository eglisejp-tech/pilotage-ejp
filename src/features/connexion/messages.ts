// Messages des écrans de connexion (BRIEF section 8, « Messages d'erreur », et
// docs/reference/maquettes/LISEZMOI.md, « États »). L'étape 2 traduit chaque erreur de
// Supabase Auth vers l'un de ces textes ; les écrans les affichent tels quels. Le contact pour
// toute demande ou tout blocage est EJP Tech (T59, 12 octobre 2026).
export const messagesConnexion = {
  identifiantsIncorrects:
    "Email ou mot de passe incorrect. Vérifiez l'un et l'autre, puis réessayez.",
  codeFaux: 'Ce code ne correspond pas. Attendez le code suivant et réessayez.',
  connexionExpiree: 'Votre connexion a expiré. Reconnectez-vous.',
  sessionExpiree: 'Votre session a expiré. Reconnectez-vous.',
  /** Proposé (m015, T59) : la même phrase partout où un compte désactivé se présente. */
  compteDesactive: 'Ce compte est désactivé. Contactez EJP Tech.',
  /** Proposé (m013, T59) : Google ou mot de passe d'une adresse sans compte actif. */
  googleSansCompte:
    'Aucun compte actif pour cette adresse. Ouvrez votre invitation ou demandez un compte à EJP Tech.',
  /** Proposé (m014) : fenêtre de Google fermée ou refusée, ou retour de Google non reconnu. */
  googleInterrompu:
    "La connexion avec Google n'a pas abouti. Réessayez, ou connectez-vous avec votre email.",
  tropDeTentatives: 'Trop de tentatives. Attendez quelques minutes, puis réessayez.',
  /** Aucune réponse : réseau coupé, hors ligne, délai dépassé. */
  echecReseau: 'La connexion a échoué. Réessayez.',
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
    'Si un compte existe pour cette adresse, un lien vient de lui être envoyé. Pensez à regarder les courriers indésirables.',
  lienInvalide: "Ce lien n'est plus valable",
  /** Proposé (m029, T59). */
  lienInvalideInvitation: "Demandez à EJP Tech de renvoyer l'invitation.",
  lienInvalideRecuperation: "Demandez un nouveau lien depuis l'écran de connexion.",
} as const
