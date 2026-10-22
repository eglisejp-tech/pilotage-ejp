import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'
import { oublierReessai } from '@/components/etats/lectureImpossible'
import { DELAI_INDICATEUR_MS, DUREE_OUVERTURE_MS } from '@/components/etats/tempsChargement'

// Règle de temps des chargements (T65) : une lecture simulée qui dépasse 300 ms (ce qui n'arrive
// que sur un poste ou un runner de CI chargé, donc dans n'importe quel test, pas dans un test
// connu d'avance) garde son indicateur au moins 600 ms, et l'ouverture de l'outil 1,2 s. findBy et
// waitFor gardent leur seconde par défaut au-delà de la plus longue de ces tenues : 300 ms +
// 1,2 s + 1 s = 2,5 s. Un test réussi n'attend pas plus ; les tests de la règle elle-même
// tournent avec de faux minuteurs.
configure({ asyncUtilTimeout: DELAI_INDICATEUR_MS + DUREE_OUVERTURE_MS + 1000 })

afterEach(() => {
  cleanup()
  // Un « Réessayer » d'un test ne change jamais le message d'erreur du test suivant (m250).
  oublierReessai()
})
