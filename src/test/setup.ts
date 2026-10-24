import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { oublierReessai } from '@/components/etats/lectureImpossible'
import { passerOuverture } from '@/components/etats/ouverture'
import { DUREE_OUVERTURE_MS } from '@/components/etats/tempsChargement'

// Règle de temps des chargements (T65) : une lecture simulée qui dépasse 300 ms (ce qui n'arrive
// que sur un poste ou un runner de CI chargé, donc dans n'importe quel test, pas dans un test
// connu d'avance) garde son indicateur au moins 600 ms (900 ms en tout). L'ouverture de l'outil
// (T67) tient 2,5 s dès l'arrivée de la première garde, même si la session est déjà lue : les
// tests la passent (ci-dessous), sauf ceux qui la vérifient, avec de faux minuteurs. findBy et
// waitFor gardent leur seconde par défaut au-delà de la plus longue de ces tenues : 2,5 s + 1 s =
// 3,5 s. Un test réussi n'attend pas plus.
configure({ asyncUtilTimeout: DUREE_OUVERTURE_MS + 1000 })

beforeEach(() => {
  // Chaque fichier de test charge l'application à neuf : sans cela, sa première garde jouerait
  // l'ouverture et chaque écran attendrait 2,5 s. Les tests de l'ouverture l'oublient d'abord.
  passerOuverture()
})

afterEach(() => {
  cleanup()
  // Un « Réessayer » d'un test ne change jamais le message d'erreur du test suivant (m250).
  oublierReessai()
})
