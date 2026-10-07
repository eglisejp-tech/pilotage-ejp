import { test } from '@playwright/test'

const UTILISATEUR = '00000000-0000-4000-8000-000000000001'
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')

test('debug', async ({ page }) => {
  test.setTimeout(60_000)
  const exp = Math.floor(Date.now() / 1000) + 3600
  const jeton = [
    b64({ alg: 'HS256', typ: 'JWT' }),
    b64({ sub: UTILISATEUR, role: 'authenticated', aal: 'aal2', exp }),
    'sig',
  ].join('.')
  const session = {
    access_token: jeton,
    refresh_token: 'r',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: exp,
    user: {
      id: UTILISATEUR,
      aud: 'authenticated',
      email: 'b@e.test',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  }
  await page.addInitScript(([k, v]) => window.localStorage.setItem(k, v), [
    'sb-127-auth-token',
    JSON.stringify(session),
  ] as const)
  const t0 = Date.now()
  const stamp = () => String(Date.now() - t0).padStart(6)
  page.on('request', (r) => {
    if (!r.url().includes('localhost:5183')) console.log(stamp(), 'REQ', r.method(), r.url())
  })
  page.on('requestfailed', (r) => console.log(stamp(), 'FAIL', r.url(), r.failure()?.errorText))
  page.on('console', (m) => console.log(stamp(), 'CONSOLE', m.text().slice(0, 300)))
  page.on('pageerror', (e) => console.log(stamp(), 'PAGEERROR', e.message.slice(0, 300)))
  page.on('response', (r) => {
    if (r.url().includes('localhost:5183')) console.log(stamp(), r.status(), r.url().slice(0, 100))
  })
  await page.goto('/', { waitUntil: 'commit' })
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const texte = await Promise.race([
      page
        .locator('body')
        .innerText({ timeout: 2000 })
        .catch((e) => 'ERR ' + e.message.slice(0, 80)),
    ])
    console.log(stamp(), 'BODY', JSON.stringify(texte.slice(0, 200)))
  }
})
