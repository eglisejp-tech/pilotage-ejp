import { expect, test as preparation } from '@playwright/test'
import { COMPTES_PROFILS, fichierSession, seConnecter } from '../comptes.ts'

// Projet « connexion » (BRIEF section 8, « Tests obligatoires ») : chaque profil passe une fois
// par les écrans 16 et 18, puis sa session est enregistrée (e2e/.auth/, hors du dépôt) et
// réutilisée par les autres tests. Supabase limite la vérification des codes à 15 par minute :
// les connexions se suivent, une par une, au rythme de attendreTourDeVerification.
preparation.describe.configure({ mode: 'serial' })

for (const compte of COMPTES_PROFILS) {
  preparation(`${compte.profil} : mot de passe, puis code`, async ({ page }) => {
    await seConnecter(page, compte.email)
    await expect(page.getByRole('heading', { level: 1, name: compte.accueil.titre })).toBeVisible()
    await expect(page).toHaveURL((url) => url.pathname === compte.accueil.chemin)
    await page.context().storageState({ path: fichierSession(compte.profil) })
  })
}
