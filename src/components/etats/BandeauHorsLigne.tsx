import { useEnLigne } from '@/components/etats/useEnLigne'

export const TEXTE_HORS_LIGNE = 'Pas de connexion internet. Les chiffres affichés peuvent dater.'

/**
 * Bandeau hors ligne (T25), au-dessus du routeur : visible sur toute page, connexion comprise,
 * tant que le navigateur n'a pas de réseau. Il informe seulement : il ne bloque aucun bouton et
 * disparaît seul au retour de la connexion.
 *
 * La région `role="status"` est toujours dans la page, vide et sans marge intérieure, et le texte
 * n'y entre qu'hors ligne : beaucoup de lecteurs d'écran n'annoncent que les changements d'une
 * région déjà présente, pas une région qui apparaît avec son contenu.
 */
export function BandeauHorsLigne() {
  const enLigne = useEnLigne()
  return (
    <div role="status">
      {enLigne ? null : (
        <p className="bg-alerte-fond px-4 py-3 text-center text-[15px] leading-normal text-alerte">
          {TEXTE_HORS_LIGNE}
        </p>
      )}
    </div>
  )
}
