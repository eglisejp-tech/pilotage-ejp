// Catalogue des indicateurs prévus par la coordination (`v_catalogue`, lu par l'administration et
// EJP Tech) : les modèles, un par ministère de la liste de la coordination, et leurs prévus. Les
// suggestions communes (modèle « suggestion ») ne sont pas des prévus : elles s'ajoutent une à une
// sur la fiche, avec leur « Pourquoi » (étape 6, lot L3b et L4).

import type { CalculIndicateur, NatureIndicateur } from '@/lib/base'
import type { LigneCatalogue } from '@/data/indicateursConfiguration'
import { comparerNoms, majusculeInitiale } from '@/lib/metier/texte'

/** Valeur de `creer_indicateurs_prevus` pour un ministère qui n'a aucun prévu (Protocole). */
export const MODELE_AUCUN = 'aucun'

/** Modèle des suggestions communes : jamais créé par « Créer ». */
export const MODELE_SUGGESTION = 'suggestion'

/** Un prévu du catalogue. */
export interface PrevuCatalogue {
  code: string
  libelle: string
  nature: NatureIndicateur
  calcul: CalculIndicateur | null
  ordre: number
}

/** Un modèle : le nom du ministère de la liste de la coordination et ses prévus, dans leur ordre. */
export interface ModeleCatalogue {
  /** Nom normalisé du ministère de la liste (« coordo fij », « sante »). */
  code: string
  /** Nom écrit pour l'écran (« Coordo FIJ », « Santé »). */
  nom: string
  prevus: PrevuCatalogue[]
}

// Noms de la liste de la coordination, écrits comme dans `docs/conception/vague-1-decisions.md`
// (un titre par ministère). Un modèle absent de cette liste s'écrit avec une majuscule initiale.
const NOMS_MODELES: Readonly<Record<string, string>> = {
  communication: 'Communication',
  coordination: 'Coordination',
  'coordo fij': 'Coordo FIJ',
  eagles: 'Eagles',
  entretien: 'Entretien',
  film: 'Film',
  formation: 'Formation',
  integration: 'Intégration',
  kumi: 'Kumi',
  mcad: 'MCAD',
  mds: 'MDS',
  merch: 'Merch',
  mpi: 'MPI',
  multilingue: 'Multilingue',
  'prodiges junior': 'Prodiges Junior',
  'prodiges musique': 'Prodiges Musique',
  production: 'Production',
  sante: 'Santé',
  securite: 'Sécurité',
  social: 'Social',
  tech: 'Tech',
}

/** Nom d'un modèle pour l'écran. */
export function nomDuModele(code: string): string {
  return NOMS_MODELES[code] ?? majusculeInitiale(code)
}

/**
 * Modèles du catalogue, rangés par ordre alphabétique de leur nom, chacun avec ses prévus dans
 * l'ordre du catalogue. Les suggestions n'en font pas partie.
 */
export function modelesDuCatalogue(catalogue: readonly LigneCatalogue[]): ModeleCatalogue[] {
  const parModele = new Map<string, PrevuCatalogue[]>()
  for (const ligne of catalogue) {
    if (ligne.modele === MODELE_SUGGESTION) continue
    const prevus = parModele.get(ligne.modele) ?? []
    prevus.push({
      code: ligne.code,
      libelle: ligne.libelle,
      nature: ligne.nature,
      calcul: ligne.calcul,
      ordre: ligne.ordre,
    })
    parModele.set(ligne.modele, prevus)
  }
  return [...parModele.entries()]
    .map(([code, prevus]) => ({
      code,
      nom: nomDuModele(code),
      prevus: [...prevus].sort((a, b) => a.ordre - b.ordre || (a.code < b.code ? -1 : 1)),
    }))
    .sort((a, b) => comparerNoms(a.nom, b.nom))
}
