/**
 * Tracés du logo d'EJP Tech (docs/sources/logo EJP TECH/logo-ejp-tech.svg, repris par
 * public/favicon.svg) et des trois formes de la flamme vivante, validés avec T65
 * (proposition « Animations de chargement », version 2). Repère commun : celui du logo.
 */

/** La flamme du logo, première des trois formes. */
export const FLAMME =
  'M84.6 87.5 C87.6 90.6 89.4 94.4 89.7 99 C93.6 101.6 96.6 106.2 96.3 111.6 C96 116.8 92.6 121 87.6 124.2 L86.8 124.6 C83.2 123.6 79.8 121.2 78.4 117.4 C77.4 114.4 77.3 110.8 77.9 108 C79.2 108.4 80.2 109 81 109.6 C80.4 105.6 80.7 100.8 81.6 96.8 C82.3 93.4 83.3 90.2 84.6 87.5 Z'

/** Deuxième forme : la flamme s'élance vers la gauche. */
const FLAMME_ELANCEE =
  'M83.4 86 C86.9 89.6 89 93.8 89.4 98.6 C93.4 101.4 96 105.8 95.8 111.2 C95.6 116.6 92.4 121 87.6 124.2 L86.8 124.6 C83.2 123.6 79.6 121 78.2 117.2 C77.2 114.2 77.4 110.4 78.2 107.4 C79.4 107.9 80.3 108.6 81 109.2 C80.2 105 80.4 100 81.1 95.9 C81.7 92.4 82.4 89 83.4 86 Z'

/** Troisième forme : la flamme se ramasse vers la droite. */
const FLAMME_RAMASSEE =
  'M86 88.9 C88.6 91.6 90 95 90.2 99.4 C94 101.9 97 106.4 96.7 111.9 C96.3 117 92.8 121.1 87.6 124.2 L86.8 124.6 C83.3 123.7 80 121.3 78.6 117.6 C77.6 114.6 77.4 111.2 77.8 108.5 C79.1 108.9 80.1 109.4 80.9 110 C80.6 106 81.1 101.4 82.2 97.6 C83.1 94.4 84.4 91.4 86 88.9 Z'

/** Les trois formes en boucle (1,9 s), qui reviennent à la première. */
export const FORMES_FLAMME = [FLAMME, FLAMME_ELANCEE, FLAMME_RAMASSEE, FLAMME].join(';')

/** Les deux reflets clairs de la flamme. */
export const REFLETS = [
  'M80.8 109.3 C84.4 110.8 86.5 114.6 87 121.8 C85.9 117 84 113 80.8 109.3 Z',
  'M89.6 99.2 C91.9 103.6 91.5 109.6 88.6 113.6 C87.6 115.5 87.3 118.8 87.4 122 C86.6 118.6 86.9 114.8 88 112.2 C89.6 108.5 90.2 103.5 89.6 99.2 Z',
]

/** Les quatre traits du monogramme « ejp » : le « e », le « j », le fût et la boucle du « p ». */
export const MONOGRAMME = [
  'M35 229.5 C29 212 20 190 16.5 165 C14.5 150 15.5 137 19 128 Q24.2 114.6 33 114.6 L71 114.6 L51.6 178.4 L44.6 165 L55 128 L37 128 Q31 128.5 29.5 136 C27.5 146 28.4 158 30 166 C34 186 42 208 48.4 229.5 Z',
  'M80.6 127.6 L91.6 127.6 L91.6 200 C91.6 230 89 255 82 268 Q76.6 278 70 282.7 L61 282.7 L61 265 L69.4 265 Q74 258 76.5 245 C79.6 228 80.6 215 80.6 200 Z',
  'M105.6 142 L117.6 142 L117.6 230 L105.6 230 Z',
  'M106.4 115 L144 115 Q153.6 115 153.6 125 L153.6 158 C153.6 170 140 188 117.6 202 L117.6 185 C133 174 142 162 142 150 L142 130 Q142 128 140 128 L106.4 128 Z',
]
