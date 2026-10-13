import { useEffect, useRef, useState } from 'react'

const DELAI_CHARGEMENT = 300

/** La préparation du QR code a échoué (m044) : le cadre le dit, avec « Réessayer ». */
export const MESSAGE_QR_EN_ECHEC = "Le QR code n'a pas pu s'afficher. Réessayez."

type Proprietes = {
  /** Image du QR code (adresse data:), absente tant que l'enrôlement n'a pas répondu. */
  qrCode?: string
  /** L'enrôlement a échoué : le message et « Réessayer » remplacent « Chargement ». */
  enEchec?: boolean
  onReessayer?: () => void
}

/**
 * Encadré du QR code (maquette 17). Pendant sa préparation, « Chargement » apparaît après
 * 300 ms, sans animation, avec aria-busy (docs/reference/maquettes/LISEZMOI.md, « États »). Un
 * échec se dit dans le cadre même (role="alert"), avec « Réessayer » : l'écran n'oblige plus à
 * saisir un code pour relancer la préparation. Au clic, le focus reste sur le cadre, que le bouton
 * quitte pendant le nouvel essai.
 */
export function QrCodeActivation({ qrCode, enEchec = false, onReessayer }: Proprietes) {
  const [chargementVisible, setChargementVisible] = useState(false)
  const cadre = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (qrCode) return
    const minuterie = setTimeout(() => setChargementVisible(true), DELAI_CHARGEMENT)
    return () => clearTimeout(minuterie)
  }, [qrCode])

  return (
    <div
      ref={cadre}
      tabIndex={-1}
      aria-busy={qrCode || enEchec ? undefined : true}
      className="flex justify-center border border-filet bg-papier p-4 outline-hidden"
    >
      {qrCode ? (
        <img
          src={qrCode}
          alt="QR code d'activation de Pilotage EJP"
          width={200}
          height={200}
          className="box-content block size-50 bg-papier p-3"
        />
      ) : enEchec ? (
        <div className="flex min-h-56 w-full flex-col items-center justify-center gap-4 text-center">
          <p role="alert" className="text-[15px] leading-normal text-alerte">
            {MESSAGE_QR_EN_ECHEC}
          </p>
          {onReessayer ? (
            <button
              type="button"
              onClick={() => {
                cadre.current?.focus()
                onReessayer()
              }}
              className="inline-flex min-h-cible items-center border border-encre bg-papier px-4 text-sm font-semibold whitespace-nowrap text-encre hover:bg-fond"
            >
              Réessayer
            </button>
          ) : null}
        </div>
      ) : (
        <p className="flex size-56 items-center justify-center text-encre-3">
          {chargementVisible ? 'Chargement' : null}
        </p>
      )}
    </div>
  )
}
