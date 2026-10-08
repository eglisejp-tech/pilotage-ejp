// Même forme que DateIso (src/lib/metier/dates.ts), redéclarée pour que les parcours e2e puissent importer ce fichier.
type DateIso = string

// Contenu du bandeau d'avancement (docs/decisions.md, T50). À mettre à jour dans le commit qui
// livre : déplacer une partie de `prevu` vers `livre` avec sa date, puis changer MISE_A_JOUR.

export type Partie = { quoi: string; date: DateIso }

export type Etape = {
  numero: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  titre: string
  pourQui: string
  /** Parties déjà en ligne, avec leur date de mise en ligne. */
  livre: readonly Partie[]
  /** Parties à venir, avec la date du plan (elle peut bouger). */
  prevu: readonly Partie[]
}

/** Jour de la dernière livraison. Quand il change, le bandeau fermé réapparaît une fois. */
export const MISE_A_JOUR: DateIso = '2026-10-08'

export const ETAPES: readonly Etape[] = [
  {
    numero: 1,
    titre: 'Base et sécurité',
    pourQui: "Toute l'église",
    livre: [{ quoi: 'Base et sécurité', date: '2026-10-07' }],
    prevu: [],
  },
  {
    numero: 2,
    titre: 'Connexion et double authentification',
    pourQui: 'Tous les profils',
    livre: [{ quoi: 'Connexion et double authentification', date: '2026-10-07' }],
    prevu: [],
  },
  {
    numero: 3,
    titre: "Vue de l'église",
    pourQui: 'Berger, conseil et administration',
    livre: [{ quoi: "Vue de l'église", date: '2026-10-07' }],
    prevu: [],
  },
  {
    numero: 4,
    titre: 'Fiches, saisies et événements',
    pourQui: 'Ministères',
    livre: [{ quoi: 'Fiches, saisies et événements', date: '2026-10-07' }],
    prevu: [],
  },
  {
    numero: 5,
    titre: "Points d'attention",
    pourQui: 'Tous les profils',
    livre: [{ quoi: "Points d'attention", date: '2026-10-08' }],
    prevu: [],
  },
  {
    numero: 6,
    titre: 'Comptes, sessions, journal et modération',
    pourQui: 'Administration et EJP Tech',
    livre: [
      { quoi: 'Ministères et comptes', date: '2026-10-07' },
      { quoi: 'Indicateurs prévus', date: '2026-10-07' },
    ],
    prevu: [
      { quoi: 'Sessions', date: '2026-10-09' },
      { quoi: 'Journal et modération', date: '2026-10-14' },
      { quoi: 'Mes indicateurs et validation', date: '2026-10-16' },
    ],
  },
  {
    numero: 7,
    titre: 'Finitions',
    pourQui: 'Tous les profils',
    livre: [{ quoi: 'Bandeau hors ligne', date: '2026-10-07' }],
    prevu: [{ quoi: 'Accessibilité', date: '2026-10-16' }],
  },
  {
    numero: 8,
    titre: 'Mise en ligne',
    pourQui: "Toute l'église",
    livre: [{ quoi: 'Mise en ligne', date: '2026-10-07' }],
    prevu: [],
  },
]
