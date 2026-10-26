import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { LibelleEnvoi } from '@/components/etats/LibelleEnvoi'
import { cn } from '@/lib/utils'

/**
 * Le modèle de bouton (proposition 6, T69) : une base commune, trois couleurs et l'échelle
 * fermée des hauteurs des maquettes. Pour un lien qui a l'air d'un bouton (« Retour à
 * l'accueil »), `classesBouton({ variante, taille })` donne les mêmes classes.
 *
 * - variante : `principal` (jaune, l'un des trois usages de la lumière), `secondaire` (fond
 *   papier, bordure encre), `sombre` (fond encre, « Masquer le texte » de la maquette 15 et le
 *   « plus » de la saisie), `lien` (texte souligné, sans fond ni bordure : une action rare d'une
 *   ligne, qui n'attire pas l'œil, proposition 12 ; « Supprimer » de l'écran 13, T75).
 * - taille : `ligne` 44 px (boutons de ligne, 15 px), `ligne-dense` 44 px en 14 px (maquettes 01
 *   à 04 et lignes de 12), `accueil` 48 px (actions de l'accueil), `ajout` 52 px (« Ajouter un
 *   ministère »), `principal` 56 px (bouton principal d'un écran), `enregistrer` 58 px (17 px gras,
 *   « Enregistrer » d'une saisie : écart de la maquette 08 étendu aux saisies, LISEZMOI), `lien`
 *   44 px de haut, peu de marge sur les côtés (le soulignement désigne l'action).
 */
export const classesBouton = cva(
  'retour-appui inline-flex items-center justify-center gap-2 text-center leading-tight font-semibold aria-disabled:cursor-not-allowed',
  {
    variants: {
      variante: {
        principal: 'bg-lumiere text-encre',
        secondaire: 'border border-encre bg-papier text-encre',
        sombre: 'retour-clair bg-encre text-papier',
        lien: 'font-normal text-encre-2 underline underline-offset-4',
      },
      taille: {
        ligne: 'min-h-cible px-4.5 py-2 text-interface',
        'ligne-dense': 'min-h-cible px-4 py-2 text-detail',
        accueil: 'min-h-12 px-4.5 py-2 text-interface',
        ajout: 'min-h-13 px-4.5 py-2 text-interface',
        principal: 'min-h-14 px-4.5 py-2 text-interface',
        enregistrer: 'min-h-14.5 px-4 py-2 text-enregistrer',
        lien: 'min-h-cible px-1 py-2 text-interface',
      },
      pleineLargeur: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variante: 'secondaire',
      taille: 'ligne',
      pleineLargeur: false,
    },
  },
)

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> &
  VariantProps<typeof classesBouton> & {
    ref?: Ref<HTMLButtonElement>
    /**
     * Envoi en cours : `aria-disabled`, le curseur d'attente, jamais grisé ; le bouton garde le
     * focus et sa place au clavier. Avec `libelleEnCours`, la petite flamme et « … en cours »
     * remplacent le libellé (T65, moment 4). Le clic n'est pas bloqué : le code qui envoie garde
     * son verrou (un second appui n'envoie rien).
     */
    enCours?: boolean
    /** « Envoi en cours », « Enregistrement en cours » : ce que fait le bouton pendant l'envoi. */
    libelleEnCours?: string
    /**
     * Momentanément indisponible (« plus » à son maximum, saisie déjà enregistrée) :
     * `aria-disabled` et estompé, toujours de la même façon.
     */
    indisponible?: boolean
    children: ReactNode
  }

/**
 * Bouton de l'outil (BRIEF, section 10 ; maquettes). Jamais `disabled` : un bouton inactif reste
 * dans l'ordre du clavier (`aria-disabled`) pour que le focus ne se perde pas. Retour visible au
 * survol et à l'appui (classe `retour-appui`, src/styles/fondations.css).
 */
export function Bouton({
  variante,
  taille,
  pleineLargeur,
  enCours = false,
  libelleEnCours,
  indisponible = false,
  type = 'button',
  className,
  children,
  ...attributs
}: Props) {
  const inactif = enCours || indisponible
  return (
    <button
      {...attributs}
      type={type}
      aria-disabled={inactif ? true : undefined}
      className={cn(
        classesBouton({ variante, taille, pleineLargeur }),
        enCours && 'aria-disabled:cursor-wait',
        indisponible && !enCours && 'opacity-40',
        className,
      )}
    >
      {libelleEnCours === undefined ? (
        children
      ) : (
        <LibelleEnvoi enCours={enCours} libelleEnCours={libelleEnCours}>
          {children}
        </LibelleEnvoi>
      )}
    </button>
  )
}
