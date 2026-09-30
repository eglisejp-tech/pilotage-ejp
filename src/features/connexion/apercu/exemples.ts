// Données factices de l'aperçu, comme celles de la maquette 17. Le vrai QR code et la vraie clé
// viennent de supabase.auth.mfa.enroll() à l'étape 2.

const COTE = 25
const REPERES = [
  [0, 0],
  [COTE - 7, 0],
  [0, COTE - 7],
] as const

function estNoir(x: number, y: number): boolean {
  for (const [origineX, origineY] of REPERES) {
    const dx = x - origineX
    const dy = y - origineY
    if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) {
      if (dx < 0 || dx > 6 || dy < 0 || dy > 6) return false
      const bord = dx === 0 || dx === 6 || dy === 0 || dy === 6
      const centre = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4
      return bord || centre
    }
  }
  return (x * 7 + y * 11 + ((x * y) % 5)) % 3 === 0
}

/**
 * QR code factice, au format de `totp.qr_code` (image SVG en adresse data:). Les modules n'ont
 * pas d'attribut de couleur : ils prennent le noir par défaut du SVG, comme le QR code de Supabase.
 */
export function qrCodeExemple(): string {
  const modules: string[] = []
  for (let y = 0; y < COTE; y += 1) {
    for (let x = 0; x < COTE; x += 1) {
      if (estNoir(x, y)) modules.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`)
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${COTE} ${COTE}" shape-rendering="crispEdges">${modules.join('')}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** Clé d'exemple de la maquette 17 (« JBSW Y3DP EHPK 3PXP »). */
export const cleExemple = 'JBSWY3DPEHPK3PXP'
