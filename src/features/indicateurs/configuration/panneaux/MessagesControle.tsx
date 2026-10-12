import type { VerificationLibelle } from '@/lib/base'

interface Props {
  verifications: readonly VerificationLibelle[]
}

/**
 * Ce que la base dit du libellé pendant la frappe (`verifier_libelle`) : un refus en couleur
 * d'alerte, un simple avis en encre douce. Le mot décrit le message, jamais la couleur seule.
 */
export function MessagesControle({ verifications }: Props) {
  if (verifications.length === 0) return null
  return (
    <>
      {verifications.map((verification) => (
        <p
          key={verification.famille}
          className={`text-[15px] leading-normal ${verification.bloquant ? 'text-alerte' : 'text-encre-2'}`}
        >
          {verification.message}
        </p>
      ))}
    </>
  )
}
