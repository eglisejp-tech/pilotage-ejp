import type { Connexion, Personne } from '@/data/personnes'

// Exemples de l'onglet « Personnes » (T56), pour l'aperçu de développement : deux personnes sur
// le compte de Communication (Marie D. et Paul, connectés au même moment sur deux appareils),
// une sur Intégration, un prénom déjà effacé et des déclarations de plus de 12 mois.

const COMMUNICATION = '20000000-0000-4000-8000-000000000001'
const INTEGRATION = '20000000-0000-4000-8000-000000000005'

export const LIBELLES_EXEMPLE = new Map([
  [COMMUNICATION, 'Ministère Communication'],
  [INTEGRATION, 'Ministère Intégration'],
])

export const PERSONNES_EXEMPLE: Personne[] = [
  {
    compte: COMMUNICATION,
    compte_libelle: 'Ministère Communication',
    prenom: 'Marie D.',
    intervenant_id: 41,
    connexions_30_jours: 4,
    jours_30_jours: 6,
    actions_30_jours: 9,
    derniere_activite: '2026-10-11T09:00:00+00:00',
    declarations_anciennes: 0,
  },
  {
    compte: COMMUNICATION,
    compte_libelle: 'Ministère Communication',
    prenom: 'Paul',
    intervenant_id: 42,
    connexions_30_jours: 1,
    jours_30_jours: 1,
    actions_30_jours: 0,
    derniere_activite: '2026-10-11T09:00:30+00:00',
    declarations_anciennes: 0,
  },
  {
    compte: INTEGRATION,
    compte_libelle: 'Ministère Intégration',
    prenom: 'Joël',
    intervenant_id: 37,
    connexions_30_jours: 2,
    jours_30_jours: 3,
    actions_30_jours: 2,
    derniere_activite: '2026-10-04T17:12:00+00:00',
    declarations_anciennes: 2,
  },
  {
    compte: INTEGRATION,
    compte_libelle: 'Ministère Intégration',
    prenom: '[prénom effacé]',
    intervenant_id: 12,
    connexions_30_jours: 1,
    jours_30_jours: 1,
    actions_30_jours: 1,
    derniere_activite: '2026-09-27T10:40:00+00:00',
    declarations_anciennes: 0,
  },
  {
    compte: INTEGRATION,
    compte_libelle: 'Ministère Intégration',
    prenom: 'Ancien',
    intervenant_id: 3,
    connexions_30_jours: 0,
    jours_30_jours: 0,
    actions_30_jours: 0,
    derniere_activite: '2025-08-31T10:40:00+00:00',
    declarations_anciennes: 1,
  },
]

/** 55 connexions d'exemple : « Afficher 50 de plus » en montre 5 de plus. */
export const CONNEXIONS_EXEMPLE: Connexion[] = Array.from({ length: 55 }, (_, rang) => {
  const id = 60 - rang
  const prenoms = ['Marie D.', 'Paul', 'Joël']
  return {
    id,
    compte: rang % 3 === 2 ? INTEGRATION : COMMUNICATION,
    prenom: prenoms[rang % 3] ?? 'Marie D.',
    declare_le: new Date(Date.UTC(2026, 9, 11, 9, 0) - rang * 19 * 3600 * 1000).toISOString(),
  }
})
