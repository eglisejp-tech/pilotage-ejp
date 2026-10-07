import { useEnLigne } from '@/components/etats/useEnLigne'

export const TEXTE_HORS_LIGNE = 'Pas de connexion internet. Les chiffres affichés peuvent dater.'

/**
 * Bandeau hors ligne (T25), au-dessus du routeur : visible sur toute page, connexion comprise,
 * tant que le navigateur n'a pas de réseau. Il informe seulement : il ne bloque aucun bouton et
 * disparaît seul au retour de la connexion. Absent de la page quand la connexion est là, pour ne
 * pas ajouter une région `role="status"` de plus aux écrans.
 */
export function BandeauHorsLigne() {
  const enLigne = useEnLigne()
  if (enLigne) return null
  return (
    <p
      role="status"
      className="bg-alerte-fond px-4 py-3 text-center text-[15px] leading-normal text-alerte"
    >
      {TEXTE_HORS_LIGNE}
    </p>
  )
}
