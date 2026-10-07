import { expect, test } from '@playwright/test'
import { auditerAxe, decrireFautes } from './outils/axe.ts'
import {
  ciblesTropPetites,
  debordementHorizontal,
  decrireRapportClavier,
  parcourirAuClavier,
  problemesDeStructure,
  problemesEchapDesAides,
  problemesPiegeDuFocus,
} from './outils/controles.ts'

// Les outils de l'audit (e2e/outils) se vérifient eux-mêmes sur de petites pages construites
// pour avoir une faute précise. Un outil qui ne voit rien ferait passer l'audit au vert à tort :
// ces tests prouvent que chaque contrôle sait échouer, et qu'il laisse passer une page saine.
// Aucun serveur, aucun écran de l'application : la page est écrite dans le test.

const PAGE_SAINE = `
  <html lang="fr"><head><title>Page saine</title>
  <style>
    :focus-visible { outline: 2px solid #111; outline-offset: 2px; }
    a, button, input { min-height: 44px; min-width: 44px; }
  </style></head>
  <body><main><h1>Page saine</h1>
    <label for="nom">Nom du champ</label><input id="nom" type="text">
    <a href="/ailleurs">Un lien</a>
    <button type="submit">Envoyer</button>
  </main></body></html>`

test.describe('outils de l’audit', () => {
  test('page saine : aucun contrôle ne signale rien', async ({ page }) => {
    await page.setContent(PAGE_SAINE)
    expect(decrireFautes(await auditerAxe(page))).toEqual([])
    expect(await debordementHorizontal(page)).toBeLessThanOrEqual(0)
    expect(await ciblesTropPetites(page)).toEqual([])
    const clavier = await parcourirAuClavier(page)
    expect(decrireRapportClavier(clavier)).toEqual([])
    expect(clavier.actionPrincipale).toEqual({ nom: 'button « Envoyer »', atteinte: true })
  })

  test('axe : une image sans texte alternatif et un champ sans étiquette', async ({ page }) => {
    await page.setContent(`
      <html lang="fr"><head><title>Fautes</title></head>
      <body><main><h1>Fautes</h1>
        <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
        <input type="text">
      </main></body></html>`)
    const regles = (await auditerAxe(page)).map((faute) => faute.regle)
    expect(regles).toContain('image-alt')
    expect(regles).toContain('label')
  })

  test('défilement horizontal : un bloc plus large que la fenêtre', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 700 })
    await page.setContent(
      '<html lang="fr"><head><meta name="viewport" content="width=device-width"></head><body style="margin:0"><div style="width:500px">trop large</div></body></html>',
    )
    expect(await debordementHorizontal(page)).toBe(140)
  })

  test('cibles : un bouton de 20 px est signalé, un lien dans une phrase non', async ({ page }) => {
    await page.setContent(`
      <html lang="fr"><body>
        <p>Une phrase avec <a href="/dedans">un lien en ligne</a> dedans.</p>
        <button style="width:20px;height:20px;padding:0">x</button>
        <button disabled style="width:20px;height:20px;padding:0">inactif</button>
      </body></html>`)
    const lignes = await ciblesTropPetites(page)
    expect(lignes).toHaveLength(1)
    expect(lignes[0]).toContain('button')
    expect(lignes[0]).toContain('20 x 20 px')
  })

  test('clavier : un champ au contour supprimé et un élément hors de portée', async ({ page }) => {
    await page.setContent(`
      <html lang="fr"><body><main>
        <button type="button" style="outline:none;box-shadow:none">Sans anneau</button>
        <button type="button" tabindex="-1" role="button" data-test="ignore">Retiré</button>
      </main></body></html>`)
    const rapport = await parcourirAuClavier(page)
    expect(decrireRapportClavier(rapport)).toEqual(['focus invisible : button « Sans anneau »'])
  })

  test('clavier : un bouton d’envoi caché derrière un élément qui retient le focus', async ({
    page,
  }) => {
    await page.setContent(`
      <html lang="fr"><body><main>
        <input id="piege" aria-label="Piège">
        <button type="submit">Envoyer</button>
        <script>
          const champ = document.getElementById('piege')
          champ.addEventListener('keydown', (evenement) => {
            if (evenement.key === 'Tab') evenement.preventDefault()
          })
        </script>
      </main></body></html>`)
    const rapport = await parcourirAuClavier(page)
    expect(rapport.actionPrincipale?.atteinte).toBe(false)
    expect(decrireRapportClavier(rapport)).toContain(
      "l'action principale n'est pas atteinte : button « Envoyer »",
    )
  })

  test('boutons radio : Tab n’en atteint qu’un par groupe, sans que ce soit une faute', async ({
    page,
  }) => {
    await page.setContent(`
      <html lang="fr"><head><style>:focus-visible{outline:2px solid #111}</style></head><body><main>
        <fieldset><legend>Choix</legend>
          <label><input type="radio" name="g" value="a">A</label>
          <label><input type="radio" name="g" value="b">B</label>
          <label><input type="radio" name="g" value="c">C</label>
        </fieldset>
      </main></body></html>`)
    expect(decrireRapportClavier(await parcourirAuClavier(page))).toEqual([])
  })

  test('piège du focus : une fenêtre modale qui laisse sortir le focus est signalée', async ({
    page,
  }) => {
    await page.setContent(`
      <html lang="fr"><body>
        <button type="button">Dehors</button>
        <div role="dialog" aria-modal="true" aria-label="Fenêtre">
          <button type="button" id="dedans">Dedans</button>
        </div>
        <script>document.getElementById('dedans').focus()</script>
      </body></html>`)
    const problemes = await problemesPiegeDuFocus(page)
    expect(problemes.some((ligne) => ligne.includes('fait sortir le focus'))).toBe(true)
  })

  test('structure : deux titres de niveau 1, pas de titre d’onglet, pas de zone main', async ({
    page,
  }) => {
    await page.setContent('<html><body><h1>Un</h1><h1>Deux</h1></body></html>')
    expect(await problemesDeStructure(page)).toEqual([
      '2 titre(s) de niveau 1 (un attendu)',
      "le titre de l'onglet est vide",
      'langue de la page : «  » (fr attendu)',
      '0 zone(s) main (une attendue)',
    ])
    await page.setContent(PAGE_SAINE)
    expect(await problemesDeStructure(page)).toEqual([])
  })

  test('Échap des aides : une bulle qui reste ouverte est signalée', async ({ page }) => {
    await page.setContent(`
      <html lang="fr"><body>
        <button type="button" aria-label="Aide : le chiffre" aria-expanded="false" id="aide">?</button>
        <script>
          const aide = document.getElementById('aide')
          aide.addEventListener('click', () => aide.setAttribute('aria-expanded', 'true'))
        </script>
      </body></html>`)
    expect(await problemesEchapDesAides(page)).toEqual([
      'Aide : le chiffre : Échap ne la ferme pas',
    ])
  })
})
