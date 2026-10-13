import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { oublierReessai } from '@/components/etats/lectureImpossible'

afterEach(() => {
  cleanup()
  // Un « Réessayer » d'un test ne change jamais le message d'erreur du test suivant (m250).
  oublierReessai()
})
