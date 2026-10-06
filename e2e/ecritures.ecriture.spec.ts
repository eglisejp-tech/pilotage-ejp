import { expect, test } from '@playwright/test'

// Parcours d'essai du projet « ecritures » (plan de l'étape 4, W0) : il ne touche à rien. Il
// prouve que le projet démarre après les trois projets de lecture et que les projets de lecture
// ne le lancent pas (testIgnore). Les parcours qui écrivent (`e2e/base/*.ecriture.spec.ts`, lots
// E3 à E8) le rejoignent, en série et à 1440 px.
test('le projet « ecritures » démarre, à 1440 px', ({ viewport }, testInfo) => {
  expect(testInfo.project.name).toBe('ecritures')
  expect(viewport).toEqual({ width: 1440, height: 900 })
})
