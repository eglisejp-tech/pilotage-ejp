// Catalogue des aides contextuelles (T38) : la seule source des textes. Un écran n'écrit jamais
// un texte d'aide dans son composant : il passe le code au composant `Aide`. Une aide de plus ou
// de moins passe par docs/conception/aides-contextuelles.md, puis par ce fichier.
//
// Règles (aides-contextuelles.md, section 2) : 120 caractères au plus, une ou deux phrases, voix
// active, on dit ce qu'est le chiffre ou ce qui se passe (jamais ce que la personne ne doit pas
// savoir), un exemple chiffré quand il aide, aucun tiret cadratin, aucun nom de personne, aucune
// donnée de la base. Statut de tous les textes : « Proposé, réécrit le 7 octobre 2026 après les
// remarques de la personne responsable ».

export const TEXTES_AIDE = {
  // Saisie du dimanche (maquette 08, lot E3)
  'dimanche.service':
    "C'est l'ensemble des STARs qui ont servi dans votre ministère ce dimanche, et l'écart avec dimanche dernier.",
  'dimanche.actifs':
    "Les STARs dont votre ministère est le ministère principal, qu'ils aient servi ou non ce dimanche.",
  'dimanche.enFij':
    "Vos STARs actifs qui participent à une FIJ. Exemple : 9 sur 12 actifs, l'outil affiche 75 %.",
  'dimanche.propres': "Ces chiffres s'affichent sur votre fiche, avec leur courbe.",

  // Chiffres du mois (lot E3)
  'mois.periode':
    'Le total du mois choisi. Pour le mois en cours, saisissez le total à ce jour, puis le total complet en fin de mois.',
  'mois.sensible':
    'Saisissez la valeur exacte. Seuls votre ministère, le berger, le conseil et EJP Tech la voient.',
  'mois.repartition':
    'Indiquez combien du total va dans chaque catégorie. Exemple : sur 10, 6 « Malaise » et 4 « Autre ».',
  'mois.aValider':
    "Indicateur en attente de validation par EJP Tech. Saisissez-le déjà : vos chiffres compteront s'il est validé.",

  // Saisie d'une session (maquette 09, lot E4)
  'session.presents':
    'Tous les STARs qui servent dans votre ministère et sont venus à la session, même si leur ministère principal est autre.',
  'session.dejaComptes':
    'Parmi vos présents, ceux dont le ministère principal est un autre ministère : ce ministère les compte déjà.',

  // Carte des FIJ et Chiffres par département (lot E4)
  'fij.carte':
    "Le nombre actuel de FIJ dans chaque département. La carte de l'église, vue par tous les comptes, l'affiche dès l'envoi.",
  'fij.departements':
    'Le berger et le conseil les lisent sur votre fiche : un total par rubrique, avec sa courbe.',
  'fij.completudeDep':
    "Nombre de départements qui ont un chiffre cette semaine. « 6 dép. sur 8 » : le total n'inclut que ces 6.",

  // Ajouter et mettre à jour un événement (maquette 11, lot E5)
  'evenement.statut':
    'Mettez-le à jour dès que la validation est connue. Encore en attente 3 jours avant la date, il passe en alerte.',
  'evenement.mentions':
    "Ils reçoivent aussi son alerte s'il reste en attente. Seul votre ministère change son statut.",

  // Prochaine réunion (lot E5)
  'reunion.date':
    "Le berger et le conseil la voient jusqu'au jour de la réunion. Ensuite, déclarez la suivante.",
  'reunion.decision':
    "Ce que la réunion doit trancher, en une phrase. Exemple : choisir la date de la sortie d'équipe.",

  // Fiche d'un ministère (maquettes 04 et 12, lot E2)
  'fiche.sommeAnnee':
    'Total des mois ou dimanches saisis depuis la date indiquée. « 8 mois sur 9 » : un mois non saisi manque au total.',
  'fiche.calcule':
    'Calculé à partir de deux chiffres du ministère. Exemple : 30 présences pour 10 séances donnent 3 par séance.',
  'fiche.courbe':
    'Évolution sur les 10 derniers dimanches ou les 12 derniers mois. Un trou marque une période non saisie.',
  'fiche.fraicheur':
    "Dernière action du ministère dans l'outil, saisie ou point. Vert jusqu'à 7 jours, orange jusqu'à 30, rouge au-delà.",

  // Vue de l'église (écrans 01 à 03, branchée par le lot I)
  'eglise.completude':
    'Ministères qui ont saisi ce chiffre. « 6 sur 8 » : le total additionne ces 6 ministères, 2 manquent encore.',
  'eglise.pourcentageFij':
    'Part des STARs actifs qui sont en FIJ. Exemple : 64 en FIJ sur 83 actifs donnent 77 %.',
  'eglise.ecart':
    'Différence avec dimanche dernier, sur les seuls ministères qui ont saisi les deux fois. « +3 » : 3 de plus.',
  'eglise.courbe':
    'Évolution du total sur les derniers dimanches ou sessions. Cercle vide : des ministères manquent ; trou : aucune saisie.',
  'eglise.carte':
    'Nombre de FIJ par département. Plus la case est foncée, plus le département a de FIJ par rapport aux autres.',

  // Accueil du ministère et blocs d'alerte (lots E6 et E7)
  'accueil.points':
    'Les points créés par votre ministère ou qui le mentionnent. Un point traité reste affiché 7 jours.',
  'accueil.aConfirmer':
    'Événements encore « En attente de validation » à 3 jours ou moins de leur date, ou déjà passés.',

  // CODES À RETIRER (réécriture du 7 octobre 2026). Ces trois aides sont supprimées du catalogue
  // de référence, mais un écran les appelle encore : le code reste donc ici, avec son ancien
  // texte, pour que le build passe. Chaque écran concerné doit retirer son appel (voir
  // CODES_A_RETIRER et docs/conception/aides-contextuelles.md, section 6), puis ce bloc disparaît.
  // `fiche.moinsDe3` et `fiche.repartition` sont déjà partis : la fiche n'affiche plus que des
  // valeurs exactes (P52), aucun écran ne les appelle.
  'session.completude':
    'Le total de la session est complet quand tous les ministères attendus ont saisi.',
  'evenement.date':
    "Seuls le jour et le nom s'enregistrent : l'outil ne garde ni l'heure ni le lieu.",
  'evenement.report':
    "L'ancienne date reste dans l'historique : le berger et le conseil voient que l'événement a été reporté.",

  // ÉTAPES 5 ET 6 (lot C0, plan des étapes 5 à 8, section 3.0). Ajoutées à la fin du catalogue
  // seulement ; statut « Proposé, écrit le 7 octobre 2026 », à valider par la personne
  // responsable (question Q7 du plan), avec les règles de aides-contextuelles.md, section 2.
  // Le catalogue de ce document les reprend au lot d'intégration.

  // Ministères et comptes (écran 13, lot L1, BRIEF section 9). Panneaux : `comptes.emailMinistere`
  // sur « Email partagé du ministère » (remplace le texte du BRIEF, écrit en négatif, règle 3) et
  // `comptes.emailPersonnel` sur « Email personnel » (berger, conseil, EJP Tech). Tableau : en-tête
  // « Double authentification » (`comptes.etat`, états de `v_etat_comptes`) et colonne des
  // indicateurs (`comptes.indicateurs`, un nombre et un lien vers /indicateurs, 7.1).
  'comptes.emailMinistere':
    "La boîte mail que partage l'équipe du ministère. Toutes les personnes du ministère se connectent avec elle.",
  'comptes.emailPersonnel':
    "L'adresse de la personne qui utilisera ce compte. L'invitation à se connecter part à cette adresse.",
  'comptes.etat':
    '« Invitation envoyée » : la personne doit encore ouvrir le lien reçu. « À activer » : elle doit encore activer son code.',
  'comptes.indicateurs':
    'Indicateurs que le ministère suit en plus des chiffres communs, calculs compris.',

  // Configuration des indicateurs (configuration-indicateurs.md, 7.1 et 7.2, lot L3a).
  // `indicateurs.nombre` : colonne « Indicateurs » de /indicateurs (« 8 sur 30 » : la base limite
  // une fiche à 30 lignes, `limites_indicateurs.lignes_max`, décision X7 ; le « 12 » du texte de
  // conception est dépassé).
  // `indicateurs.prevus` : colonne « Prévus » de /indicateurs et titre du bloc « Prévus par la
  // coordination » de /indicateurs/:id. `indicateurs.modele` : choix « Choisir dans la liste de la
  // coordination », quand le nom du ministère n'est pas reconnu. `indicateurs.usage` : première
  // ligne d'usage (« Saisi 4 mois sur 5 ») de /indicateurs/:id.
  'indicateurs.nombre':
    'Indicateurs du ministère, actifs ou à valider, calculs compris. « 8 sur 30 » : 8 suivis, 30 au plus par fiche.',
  'indicateurs.prevus':
    'Indicateurs que la coordination a choisis pour ce ministère. Une fois créés, ils entrent dans ses saisies et sa fiche.',
  'indicateurs.modele':
    'La liste de la coordination nomme les ministères à sa façon. Choisissez le nom qui correspond à ce ministère.',
  'indicateurs.usage':
    "Périodes saisies depuis l'ajout de l'indicateur. « 4 mois sur 5 » : un mois attendu reste sans saisie.",
} as const

/**
 * Aides supprimées du catalogue de référence, encore appelées par un écran (le 7 octobre 2026).
 * Chacune part dès que son écran (formulaire de session, ajout et mise à jour d'un événement)
 * retire son appel.
 */
export const CODES_A_RETIRER = [
  'session.completude',
  'evenement.date',
  'evenement.report',
] as const satisfies readonly (keyof typeof TEXTES_AIDE)[]

/** Code d'une aide : « dimanche.actifs », « eglise.completude »... */
export type CodeAide = keyof typeof TEXTES_AIDE

/** Texte d'une aide. */
export function texteAide(code: CodeAide): string {
  return TEXTES_AIDE[code]
}
