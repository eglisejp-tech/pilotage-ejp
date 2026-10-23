// Catalogue des aides contextuelles (T38) : la seule source des textes. Un écran n'écrit jamais
// un texte d'aide dans son composant : il passe le code au composant `Aide`. Une aide de plus ou
// de moins passe par docs/conception/aides-contextuelles.md, puis par ce fichier.
//
// Règles (aides-contextuelles.md, section 2) : 120 caractères au plus, une ou deux phrases, voix
// active, on dit ce qu'est le chiffre ou ce qui se passe (jamais ce que la personne ne doit pas
// savoir), un exemple chiffré quand il aide, aucun tiret cadratin, aucun nom de personne, aucune
// donnée de la base. Statut de tous les textes : « Proposé, réécrit le 7 octobre 2026 après les
// remarques de la personne responsable », puis revu par T66 (19 octobre 2026) : une bulle définit
// un chiffre ou un terme qu'une personne nouvelle ne peut pas deviner (guide de rédaction, section
// 4) ; ce qui est nécessaire pour remplir devient une indication visible sous le champ.

export const TEXTES_AIDE = {
  // Saisie du dimanche (maquette 08, lot E3)
  'dimanche.actifs':
    "Les STARs dont votre ministère est le ministère principal, qu'ils aient servi ou non.",
  'dimanche.enFij': 'Parmi vos STARs actifs, ceux qui participent à une FIJ.',

  // Présence à une session (maquette 09, lot E4)
  'session.presents':
    'Tous vos STARs venus à la session, même ceux dont le ministère principal est un autre.',

  // Chiffres par département (lot E4)
  'fij.completudeDep':
    "Départements qui ont un chiffre cette semaine. Le total n'additionne que ceux-là.",

  // Ajouter et mettre à jour un événement (maquette 11, lot E5)
  'evenement.statut': 'Mettez le statut à jour dès que vous connaissez la décision.',

  // Prochaine réunion (lot E5)
  'reunion.decision':
    "Ce que la réunion doit trancher. Exemple : choisir la date de la sortie d'équipe.",

  // Fiche d'un ministère (maquettes 04 et 12, lot E2)
  'fiche.sommeAnnee': 'Total depuis la date indiquée. « 8 mois sur 9 » : 1 mois manque au total.',
  'fiche.courbe': 'Les 10 derniers dimanches ou les 12 derniers mois. Trou : aucune saisie.',

  // Vue de l'église (écrans 01 à 03). Ces trois aides sont au catalogue depuis W0 (6 octobre),
  // mais aucun écran ne les affiche : la vue de l'église n'a pas de bouton « ? ». T66 (t195) :
  // la négation courte est permise depuis le guide (section 9, règle 3 assouplie).
  'eglise.completude': "Ministères qui ont saisi ce chiffre. Le total n'additionne que ceux-là.",
  'eglise.ecart': 'Écart avec dimanche dernier, sur les ministères qui ont saisi les deux fois.',
  'eglise.courbe': "Cercle vide : des ministères n'ont pas saisi. Trou : aucune saisie.",

  // ÉTAPES 5 ET 6 (lot C0, plan des étapes 5 à 8, section 3.0). Ajoutées à la fin du catalogue
  // seulement ; statut « Proposé, écrit le 7 octobre 2026 », à valider par la personne
  // responsable (question Q7 du plan), avec les règles de aides-contextuelles.md, section 2.
  // Le catalogue de ce document les reprend au lot d'intégration.

  // Ministères et comptes (écran 13, lot L1, BRIEF section 9). Tableau : en-tête « Double
  // authentification » (`comptes.etat`, états de `v_etat_comptes`). T66 : l'email d'un ministère
  // porte une indication visible sous le champ, l'email personnel et la colonne « Indicateurs
  // propres » se comprennent seuls. Texte de T66 (t268), tel qu'accepté.
  'comptes.etat':
    "« Invitation envoyée » : le lien n'est pas encore ouvert. « À activer » : le code reste à activer.",

  // Configuration des indicateurs (configuration-indicateurs.md, 7.1 et 7.2, lot L3a).
  // `indicateurs.nombre` : colonne « Indicateurs » de /indicateurs (« 8 sur 30 » : la base limite
  // une fiche à 30 lignes, `limites_indicateurs.lignes_max`, décision X7 ; le « 12 » du texte de
  // conception est dépassé).
  // `indicateurs.prevus` : colonne « Prévus » de /indicateurs et titre du bloc « Indicateurs
  // prévus » de /indicateurs/:id. `indicateurs.usage` : première ligne d'usage (« Saisi 4 mois sur
  // 5 ») de /indicateurs/:id. Revu par T66 (t324, t326, t343) : la bulle définit le chiffre, sans
  // dire qui a prévu la liste. `indicateurs.modele` part (t334) : son texte devient l'indication
  // sous « Nom du ministère dans la liste ».
  'indicateurs.nombre': '« 8 sur 30 » : 8 indicateurs suivis, 30 au plus par ministère.',
  'indicateurs.prevus':
    "Liste prévue pour ce ministère. Une fois créés, ils s'ajoutent à ses saisies.",
  'indicateurs.usage': "Mois ou dimanches saisis depuis l'ajout. « 4 mois sur 5 » : 1 mois manque.",

  // Points d'attention (étape 5) : plus aucune bulle depuis T66. L'attendu et l'échéance d'un
  // nouveau point portent une indication visible sous le champ, le statut « En attente de
  // décision » est défini par la note sous les statuts ; la priorité et le filtre de l'écran 05 se
  // comprennent seuls (l'ordre de tri et le fonctionnement d'un filtre ne s'expliquent pas).

  // Sessions (écran 14) : plus de bulle depuis T66. « Ministères attendus » porte une indication
  // visible sous son titre, la colonne « Saisies » (« 6 sur 8 ») se comprend seule.

  // Panneaux de la configuration des indicateurs (lot L3b, statut Proposé) : indicateurs.domaine sur
  // la case « Domaine sensible » du panneau d'ajout, indicateurs.calcul sur « Chiffre du haut » du
  // panneau de calcul. Les conséquences d'un choix (« Saisi chaque mois, mois en cours compris. »)
  // restent des textes visibles sous le champ.
  'indicateurs.domaine':
    'Santé, accompagnement ou enfants : seuls le ministère, le berger, le conseil et EJP Tech voient ses valeurs.',
  'indicateurs.calcul':
    'Le haut est divisé par le bas. Exemple : 16 résolues (haut) sur 20 demandes (bas) donnent 80 %.',
  // « Mes indicateurs » (lot L4, statut Proposé ; validation-metier.md, 2.2) : indicateurs.pourquoi
  // sur le champ « Pourquoi cet indicateur ? » du panneau d'ajout. Le texte vient de la conception
  // (T30). Le champ n'a pas de rappel sur les données personnelles (exception voulue).
  'indicateurs.pourquoi':
    'Ce que ce chiffre vous aidera à voir ou à décider. EJP Tech le lit avant de valider.',
} as const

/** Code d'une aide : « dimanche.actifs », « eglise.completude »... */
export type CodeAide = keyof typeof TEXTES_AIDE

/** Texte d'une aide. */
export function texteAide(code: CodeAide): string {
  return TEXTES_AIDE[code]
}
