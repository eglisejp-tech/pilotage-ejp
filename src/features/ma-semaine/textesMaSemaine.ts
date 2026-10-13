// Textes de « Ma semaine », la page d'accueil d'un ministère (décision T57). Court et sans
// explication de la mécanique : un titre, des chiffres, un lien. « Vos saisies » et « Vos points »
// gardent leurs textes (`src/features/accueil-ministere/textesAccueil.ts`).

export const TEXTES_MA_SEMAINE = {
  /** Libellé de l'onglet et titre de l'écran, pour un compte de ministère seulement. */
  onglet: 'Ma semaine',
  titreChiffres: 'Vos chiffres de la semaine',
  titreEglise: "Dans l'église",
  /** Lien sous les chiffres : l'historique complet est sur « Ma fiche ». */
  lienFiche: 'Tous vos chiffres dans Ma fiche',
  presentsA: 'Présents à',
  /** Ministère FIJ seulement. */
  carteFij: 'Total de la carte des FIJ',
  statistiquesFij: 'Chiffres par département saisis',
  /** Indicateur du dimanche dont la dernière saisie n'est pas celle de cette semaine. */
  derniereSaisie: 'Dernière saisie :',
} as const
