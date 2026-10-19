import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'
import { oublierReessai } from '@/components/etats/lectureImpossible'

// Règle de temps des chargements (T65) : une lecture qui dépasse 300 ms, ce qui arrive quand le
// poste ou le runner de CI est chargé, garde son indicateur au moins 600 ms (1,2 s pour
// l'ouverture de l'outil). Les attentes de findBy et waitFor (1 s par défaut) passent à 4 s pour
// ne pas échouer sur ce temps voulu ; un test réussi n'attend pas plus.
configure({ asyncUtilTimeout: 4000 })

afterEach(() => {
  cleanup()
  // Un « Réessayer » d'un test ne change jamais le message d'erreur du test suivant (m250).
  oublierReessai()
})
