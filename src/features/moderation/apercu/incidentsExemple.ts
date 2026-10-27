import type { LigneIncident } from '@/lib/base'

// Incidents d'exemple de l'aperçu de la Modération (T76, lot C) : le cas réel du 26 octobre 2026
// (Coordination, iPhone, pas de réponse), puis des incidents variés jusqu'à 73.

const TOTAL = 73

const COORDINATION: LigneIncident = {
  reference: 'K7Q4MX',
  survenu_le: '2026-10-26T11:37:00Z',
  recu_le: '2026-10-26T11:37:05Z',
  profil: 'ministere',
  ministere_id: '10000000-0000-4000-8000-000000000003',
  ministere_nom: 'Coordination',
  ecran: '/saisir/evenement',
  operation: 'ajouter_evenement',
  genre: 'sans_reponse',
  issue: 'inconnue',
  rattrape: false,
  statut_http: null,
  code: null,
  nom_erreur: 'TypeError',
  duree_ms: 1234,
  en_ligne: true,
  visible: true,
  version: '3f2a1c9',
  navigateur: 'safari',
  version_navigateur: 26,
  systeme: 'ios',
  total: TOTAL,
}

const VARIANTES: Partial<LigneIncident>[] = [
  { genre: 'sans_reponse', rattrape: true, issue: 'inconnue' },
  {
    genre: 'reponse_illisible',
    statut_http: 502,
    operation: 'mesure',
    ecran: '/saisir/dimanche',
    ministere_nom: 'Communication',
    navigateur: 'chrome',
    version_navigateur: 140,
    systeme: 'android',
  },
  {
    genre: 'refus_inconnu',
    code: '23505',
    issue: 'rien_enregistre',
    profil: 'berger',
    ministere_id: null,
    ministere_nom: null,
    operation: 'marquer_traite',
    navigateur: 'safari',
    version_navigateur: 18,
    systeme: 'macos',
  },
  { genre: 'delai', operation: 'creer_point', ministere_nom: 'Jeunesse' },
  { genre: 'reponse_perdue', issue: 'enregistre', statut_http: 200, ministere_nom: null },
  {
    genre: 'session',
    issue: 'rien_enregistre',
    profil: 'admin_plateforme',
    ministere_id: null,
    ministere_nom: null,
    operation: 'creer-compte',
    navigateur: 'firefox',
    version_navigateur: 131,
    systeme: 'windows',
  },
  { genre: 'bogue', issue: 'rien_enregistre', operation: 'signaler_difficulte' },
]

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function reference(rang: number): string {
  let reste = rang
  let texte = ''
  for (let i = 0; i < 6; i += 1) {
    texte = (ALPHABET[reste % ALPHABET.length] ?? '2') + texte
    reste = Math.floor(reste / ALPHABET.length)
  }
  return texte
}

/** Les incidents des `pages` premières pages (50 par page), du plus récent au plus ancien. */
export function incidentsExemple(pages: number): LigneIncident[] {
  const lignes = Array.from({ length: TOTAL }, (_, rang): LigneIncident => {
    if (rang === 0) return COORDINATION
    const instant = new Date(Date.parse(COORDINATION.survenu_le) - rang * 5_400_000).toISOString()
    return {
      ...COORDINATION,
      ...VARIANTES[(rang - 1) % VARIANTES.length],
      reference: reference(1000 + rang),
      survenu_le: instant,
      recu_le: instant,
    }
  })
  return lignes.slice(0, Math.min(pages * 50, TOTAL))
}
