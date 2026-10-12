// Textes des panneaux et des fenêtres de la configuration des indicateurs (lot L3b ;
// configuration-indicateurs.md, 6.1, 7.2 et 7.7). Français simple, voix active, aucun tiret
// cadratin. Aucun composant n'écrit un de ces textes en dur. Les textes marqués « Proposé » ne sont
// pas dans le texte de conception : ils attendent la validation de la personne responsable.

import { accorder, listeNoms } from '@/lib/metier/texte'

export const TEXTES_PANNEAUX = {
  actions: {
    ajouterIndicateur: 'Ajouter un indicateur',
    ajouterCalcul: 'Ajouter un calcul',
    /** Pour EJP Tech seulement : la fiche du ministère, avec ses valeurs (T29). */
    voirFiche: 'Voir la fiche',
    corriger: 'Corriger',
    remplacer: 'Remplacer',
    retirer: 'Retirer',
    retirerConfidentialite: 'Retirer pour confidentialité',
  },
  /** Mots communs aux panneaux et aux fenêtres. */
  annuler: 'Annuler',
  enCours: 'Envoi en cours',
  reessayer: 'Réessayer',
  /** Proposé : la connexion échoue pendant un envoi, le formulaire garde ce qui est écrit. */
  connexionFormulaire:
    'La connexion a échoué. Ce que vous avez écrit est encore dans le formulaire : réessayez.',
  connexionFenetre: 'La connexion a échoué. Réessayez.',
  /** Proposé : les limites de la fiche n'ont pas pu être lues. */
  limitesIllisibles:
    "Les limites de la fiche n'ont pas pu être lues. La base les vérifiera à l'envoi.",
  /** Ce qui change et ce qui ne change pas, au pied de chaque panneau et de chaque fenêtre. */
  ceQuiChange: 'Ce qui change',
  ceQuiResteIdentique: 'Ce qui ne change pas',
  ajout: {
    titre: 'Ajouter un indicateur',
    libelle: 'Ce que vous comptez',
    definition: "Ce qu'on compte exactement",
    quand: 'Quand le saisir',
    quandOptions: {
      dimanche: 'Chaque dimanche, avec les chiffres du dimanche',
      mois: "Chaque mois, le total d'un mois",
      a_ce_jour: "À ce jour, où on en est aujourd'hui",
    },
    sorte: 'Sorte de nombre',
    sorteOptions: {
      nombre: "Un compte (jusqu'à 9 999)",
      grand_nombre: "Un grand compte (jusqu'à 9 999 999)",
      euros: 'Des euros',
    },
    sensible: 'Domaine sensible (santé, accompagnement, enfants)',
    sensibleConsequence: 'Saisi chaque mois, mois en cours compris.',
    pasSensible: "Ce n'est pas un domaine sensible",
    apercu: 'Aperçu de la saisie',
    bouton: "Ajouter l'indicateur",
    change: (ministere: string) => `Un indicateur de plus sur la fiche de ${ministere}.`,
    resteIdentique: 'Les autres indicateurs et toutes leurs saisies.',
  },
  remplacement: {
    titre: "Remplacer l'indicateur",
    bouton: "Remplacer l'indicateur",
    /** « Remplace « Problèmes signalés » (chaque dimanche). Ses saisies restent sous l'ancien indicateur. » */
    phrase: (libelle: string, rythme: string) =>
      `Remplace « ${libelle} » (${rythme}). Ses saisies restent sous l'ancien indicateur.`,
    change: "L'ancien indicateur est retiré et le nouveau prend sa place.",
    resteIdentique:
      "Les saisies de l'ancien indicateur restent sur la fiche, sous son nom. La courbe du nouveau repart de zéro.",
    sensibleVerrouille: 'Un indicateur sensible reste sensible quand on le remplace.',
  },
  calcul: {
    titre: 'Ajouter un calcul',
    titreRemplacement: 'Remplacer le calcul',
    libelle: 'Nom du calcul',
    definition: "Ce qu'on calcule",
    haut: 'Chiffre du haut',
    bas: 'Chiffre du bas',
    choisir: 'Choisissez un chiffre',
    noteBas: 'Du même rythme que le chiffre du haut, ou « à ce jour ».',
    afficher: 'Afficher',
    types: { taux: 'En pourcentage', moyenne: 'En moyenne' },
    apercu: 'Aperçu du calcul',
    bouton: 'Ajouter le calcul',
    boutonRemplacement: 'Remplacer le calcul',
    change: (ministere: string) =>
      `Un calcul de plus sur la fiche de ${ministere} : il se calcule tout seul, il ne se saisit pas.`,
    resteIdentique: "Les deux chiffres qu'il utilise et toutes leurs saisies.",
    changeRemplacement: "L'ancien calcul est retiré et le nouveau prend sa place.",
    resteIdentiqueRemplacement:
      "Les deux chiffres qu'ils utilisent et leurs saisies. L'ancien calcul reste sous « Retirés ».",
    /** Proposé : la fiche n'a pas deux chiffres qui se calculent ensemble. */
    pasAssezDeSources:
      "Un calcul demande deux indicateurs saisis, actifs, sans domaine sensible, qui se calculent ensemble. Cette fiche n'en a pas assez.",
    lectureTermes: 'Lecture du calcul.',
    termesIllisibles: "Le calcul n'a pas pu être lu.",
  },
  correction: {
    titre: "Corriger l'indicateur",
    note: "Vous pouvez corriger le libellé et la définition tant que rien n'est saisi. Ensuite, remplacez l'indicateur.",
    bouton: 'Enregistrer la correction',
    change: 'Le libellé et la définition.',
    resteIdentique:
      "Le rythme, la sorte de nombre et le domaine : pour les changer, remplacez l'indicateur.",
    resteIdentiqueCalcul: 'Le type de calcul et les deux chiffres qu’il utilise.',
  },
  retrait: {
    titre: (libelle: string) => `Retirer « ${libelle} » ?`,
    motif: 'Motif du retrait',
    bouton: "Retirer l'indicateur",
    /** Proposé : le motif manque. */
    motifManquant: 'Choisissez le motif du retrait.',
    avecSaisies:
      'Il ne sera plus proposé à la saisie. Ses saisies restent sur la fiche. Un indicateur retiré ne revient pas.',
    sansSaisie:
      "Il ne sera plus proposé à la saisie. Il n'a aucune saisie : il disparaîtra de la fiche. Un indicateur retiré ne revient pas.",
    calcul:
      "Il ne s'affichera plus sur la fiche. Les deux chiffres qu'il utilise et leurs saisies restent sur la fiche. Un indicateur retiré ne revient pas.",
    reprendre:
      'Pour reprendre ce chiffre plus tard, ajoutez un nouvel indicateur : sa courbe repart de zéro.',
    change: "L'indicateur n'est plus proposé à la saisie.",
    resteIdentique: 'Ses saisies : rien ne se supprime.',
    lectureCalculs: 'Lecture des calculs liés.',
    calculsIllisibles: "Les calculs liés n'ont pas pu être lus.",
  },
  confidentialite: {
    titre: (libelle: string) => `Retirer « ${libelle} » pour confidentialité ?`,
    texte:
      "Le libellé et la définition seront remplacés par « [retiré pour confidentialité] ». L'indicateur et ses valeurs disparaîtront de toutes les fiches. Cette action est définitive.",
    bouton: 'Retirer pour confidentialité',
    change:
      "Le libellé et la définition sont masqués. L'indicateur ne s'affiche plus sur aucune fiche.",
    resteIdentique: 'Les valeurs saisies : rien ne se supprime, elles ne s’affichent plus.',
  },
} as const

/** Texte des calculs retirés avec l'indicateur : « Le calcul « Taux » sera retiré aussi. » */
export function phraseCalculsLies(libelles: readonly string[]): string | null {
  if (libelles.length === 0) return null
  const noms = listeNoms(libelles.map((libelle) => `« ${libelle} »`))
  return libelles.length === 1
    ? `Le calcul ${noms} sera retiré aussi.`
    : `Les calculs ${noms} seront retirés aussi.`
}

/** Réussites (7.7), annoncées pendant 6 secondes. Proposé : « Calcul ajouté. », « Indicateur remplacé. », « Correction enregistrée. » */
export const REUSSITES_INDICATEURS = {
  ajout: 'Indicateur ajouté.',
  calcul: 'Calcul ajouté.',
  remplacement: 'Indicateur remplacé.',
  remplacementCalcul: 'Calcul remplacé.',
  correction: 'Correction enregistrée.',
  confidentialite: 'Indicateur retiré pour confidentialité.',
} as const

/** « Indicateur retiré, ses saisies restent sur la fiche. » ou, sans saisie, « Indicateur retiré. » */
export function reussiteRetrait(sansSaisie: boolean, calculsRetires: number): string {
  const base = sansSaisie
    ? 'Indicateur retiré.'
    : 'Indicateur retiré, ses saisies restent sur la fiche.'
  return calculsRetires > 0
    ? `${base} ${calculsRetires} ${accorder(calculsRetires, 'calcul retiré', 'calculs retirés')} avec lui.`
    : base
}

/** « Indicateur retiré pour confidentialité. », avec les calculs qui sont partis avec lui. */
export function reussiteConfidentialite(calculsRetires: number): string {
  return calculsRetires > 0
    ? `${REUSSITES_INDICATEURS.confidentialite} ${calculsRetires} ${accorder(calculsRetires, 'calcul retiré', 'calculs retirés')} avec lui.`
    : REUSSITES_INDICATEURS.confidentialite
}

/** Nom accessible d'une action de ligne : il commence par le texte visible du bouton. */
export function nomAction(action: string, libelle: string): string {
  return `${action} « ${libelle} »`
}
