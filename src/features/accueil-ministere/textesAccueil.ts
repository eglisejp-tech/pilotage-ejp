// Textes de l'accueil du ministère (maquette 07, lot E7). Les textes de la phrase et du bouton
// principal viennent de `phraseDAccueil` et `libelleBoutonPrincipal` (src/lib/metier/phrases.ts),
// ceux des lignes de « Vos saisies » des lots de saisie (lignes*.ts).

export const TEXTES_ACCUEIL = {
  titreSaisies: 'Vos saisies',
  titrePoints: 'Vos points',
  /** Complément du titre « Vos points » (maquette 07). */
  complementPoints: 'Créés ou mentionnés',
  /** Mot d'état d'une ligne de « Vos saisies », toujours écrit : jamais la couleur seule. */
  etat: { fait: 'Fait', a_faire: 'À faire' },
  /** Boutons secondaires (BRIEF, section 9). */
  saisirUneSession: 'Saisir une session',
  nouveauPoint: 'Nouveau point',
  carteFij: 'Mettre à jour la carte des FIJ',
  /** Nom de la liste des boutons de l'ouverture, pour les lecteurs d'écran. */
  actions: 'Saisies à faire',
  /** LISEZMOI, « États » (07). */
  aucunPoint: 'Aucun point ouvert pour votre ministère.',
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',
} as const
