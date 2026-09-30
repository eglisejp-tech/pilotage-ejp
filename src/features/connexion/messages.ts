// Messages des écrans de connexion (BRIEF section 8, « Messages d'erreur », et
// docs/reference/maquettes/LISEZMOI.md, « États »). L'étape 2 traduit chaque erreur de
// Supabase Auth vers l'un de ces textes ; les écrans les affichent tels quels.
export const messagesConnexion = {
  identifiantsIncorrects:
    "Email ou mot de passe incorrect. Vérifiez l'un et l'autre, puis réessayez.",
  codeFaux: 'Ce code ne correspond pas. Attendez le code suivant et réessayez.',
  connexionExpiree: 'Votre connexion a expiré. Reconnectez-vous.',
  sessionExpiree: 'Votre session a expiré. Reconnectez-vous.',
  compteDesactive: "Ce compte est désactivé. Adressez-vous à l'administration de l'église.",
  googleSansCompte:
    "Cette adresse n'a pas encore de compte actif. Si vous avez reçu une invitation, ouvrez d'abord le lien de l'email. Sinon, adressez-vous à l'administration de l'église.",
  tropDeTentatives: 'Trop de tentatives. Attendez quelques minutes, puis réessayez.',
  echecReseau: 'La connexion a échoué. Réessayez.',
  lienEnvoye:
    'Si un compte existe pour cette adresse, un lien vient de lui être envoyé. Pensez à regarder les courriers indésirables.',
  lienInvalide: "Ce lien n'est plus valable",
  lienInvalideInvitation: "Demandez à l'administration de l'église de relancer l'invitation.",
  lienInvalideRecuperation: "Demandez un nouveau lien depuis l'écran de connexion.",
} as const
