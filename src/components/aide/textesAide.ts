// Catalogue des aides contextuelles (T38) : la seule source des textes. Un écran n'écrit jamais
// un texte d'aide dans son composant : il passe le code au composant `Aide`. Une aide de plus ou
// de moins passe par docs/conception/aides-contextuelles.md, puis par ce fichier, que le lot W0
// remplit une fois pour toutes (31 textes) et que le lot I seul retouche.
//
// Règles (aides-contextuelles.md, section 2) : 120 caractères au plus, une ou deux phrases, voix
// active, aucun tiret cadratin, aucun nom de personne, aucune donnée de la base. Statut de tous
// les textes : « Proposé », à valider par la personne responsable.

export const TEXTES_AIDE = {
  // Saisie du dimanche (maquette 08, lot E3)
  'dimanche.service': "Ce nombre alimente le total de l'église et l'écart avec dimanche dernier.",
  'dimanche.actifs':
    "Ce nombre reste valable jusqu'à votre prochaine saisie. L'église additionne ceux de tous les ministères.",
  'dimanche.enFij':
    "L'outil calcule le pourcentage de STARs en FIJ à partir de ce nombre. Vous n'avez pas à le saisir.",
  'dimanche.propres':
    "Ces chiffres s'affichent sur votre fiche, avec leur courbe. Ils n'apparaissent jamais sur la vue de l'église.",

  // Chiffres du mois (lot E3)
  'mois.periode':
    "Saisissez le total du mois entier. Un mois oublié se rattrape jusqu'en janvier de l'an dernier.",
  'mois.sensible':
    'Le berger et le conseil voient « moins de 3 » à la place de 1 ou 2, mois en cours compris.',
  'mois.repartition':
    "Les catégories viennent de la coordination. Ce que vous ne répartissez pas s'affiche « non réparti ».",
  'mois.aValider':
    "EJP Tech doit encore valider cet indicateur. Vous pouvez le saisir, mais il n'entre dans aucun total.",

  // Saisie d'une session (maquette 09, lot E4)
  'session.presents':
    "Le total de l'église ne compte pas deux fois un STAR présent dans deux ministères.",
  'session.dejaComptes':
    "Exemple : 13 présents dont 2 déjà comptés. Votre ministère ajoute 11 au total de l'église.",
  'session.completude':
    'Le total de la session est complet quand tous les ministères attendus ont saisi.',

  // Carte des FIJ et Chiffres par département (lot E4)
  'fij.carte':
    "Saisissez le nombre de FIJ de chaque département. La carte de l'église se met à jour dès l'envoi.",
  'fij.departements':
    'Chaque rubrique se saisit par département. Le total dit combien de départements ont une valeur.',
  'fij.completudeDep':
    '« 6 dép. sur 8 » : il manque deux départements. Ils ne comptent pas pour 0.',

  // Ajouter et mettre à jour un événement (maquette 11, lot E5)
  'evenement.date':
    "Seuls le jour et le nom s'enregistrent : l'outil ne garde ni l'heure ni le lieu.",
  'evenement.statut':
    "Un événement « En attente de validation » déclenche un rappel dans l'outil, 3 jours avant sa date.",
  'evenement.mentions':
    "Le ministère mentionné voit l'événement sur sa fiche et reçoit le rappel, mais ne peut pas le modifier.",
  'evenement.report':
    "L'ancienne date reste dans l'historique : le berger et le conseil voient que l'événement a été reporté.",

  // Prochaine réunion (lot E5)
  'reunion.date': "Seule la prochaine réunion compte. Une réunion passée disparaît d'elle-même.",
  'reunion.decision':
    'Ce que la réunion doit trancher, en quelques mots. Le berger la lit sur votre fiche.',

  // Fiche d'un ministère (maquettes 04 et 12, lot E2)
  'fiche.sommeAnnee':
    '« 9 mois sur 9 » : mois saisis sur mois attendus depuis le départ. Un mois absent ne compte pas pour 0.',
  'fiche.moinsDe3':
    "« Moins de 3 » remplace 1 ou 2 pour la santé, l'écoute, l'accompagnement et les enfants. Cela protège les personnes.",
  'fiche.calcule': "L'outil calcule ce chiffre à partir de vos saisies. Vous n'avez rien à saisir.",
  'fiche.courbe':
    'Dix derniers dimanches ou douze derniers mois. Un trou signale une période sans saisie, jamais un zéro.',
  'fiche.fraicheur':
    "Date de la dernière action de ce ministère : vert jusqu'à 7 jours, orange jusqu'à 30, rouge au-delà.",
  'fiche.repartition':
    "« Masqué » : une catégorie de plus est cachée, pour qu'aucune soustraction ne redonne un « moins de 3 ».",

  // Vue de l'église (écrans 01 à 03, branchée par le lot I)
  'eglise.completude':
    "« 6 sur 8 » : 6 ministères sur 8 ont saisi. Le total n'inclut que ceux-là, les autres ne comptent pas pour 0.",
  'eglise.pourcentageFij':
    "L'outil calcule ce pourcentage : STARs en FIJ divisés par STARs actifs, sur les ministères qui ont les deux chiffres.",
  'eglise.ecart':
    'Écart avec dimanche dernier, calculé sur les seuls ministères qui ont saisi les deux fois.',
  'eglise.courbe':
    'Un cercle vide marque un dimanche incomplet. Un trou marque un dimanche sans aucune saisie.',
  'eglise.carte':
    'Plus la teinte est foncée, plus le département compte de FIJ par rapport aux autres.',

  // Accueil du ministère et blocs d'alerte (lots E6 et E7)
  'accueil.points':
    'Les points que vous avez créés et ceux qui vous mentionnent. Un point traité reste visible 7 jours.',
  'accueil.aConfirmer':
    'Événements « En attente de validation » à 3 jours de leur date ou passés. Ils disparaissent au changement de statut.',
} as const

/** Code d'une aide : « dimanche.actifs », « eglise.completude »... */
export type CodeAide = keyof typeof TEXTES_AIDE

/** Texte d'une aide. */
export function texteAide(code: CodeAide): string {
  return TEXTES_AIDE[code]
}
