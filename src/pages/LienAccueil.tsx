import { Link } from 'react-router'
import { useAccueil } from '@/features/navigation/useAccueil'

/** Bouton « Revenir à l'accueil » des pages non disponible et introuvable (LISEZMOI). */
export function LienAccueil() {
  const accueil = useAccueil()
  return (
    <Link
      to={accueil}
      className="mt-8 inline-flex min-h-14 items-center bg-lumiere px-6 text-[15px] font-semibold text-encre"
    >
      Revenir à l'accueil
    </Link>
  )
}
