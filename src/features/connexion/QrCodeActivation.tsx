import { useEffect, useState } from 'react'

const DELAI_CHARGEMENT = 300

type Proprietes = {
  /** Image du QR code (adresse data:), absente tant que l'enrôlement n'a pas répondu. */
  qrCode?: string
}

/**
 * Encadré du QR code (maquette 17). Pendant sa préparation, « Chargement » apparaît après
 * 300 ms, sans animation, avec aria-busy (docs/reference/maquettes/LISEZMOI.md, « États »).
 */
export function QrCodeActivation({ qrCode }: Proprietes) {
  const [chargementVisible, setChargementVisible] = useState(false)

  useEffect(() => {
    if (qrCode) return
    const minuterie = setTimeout(() => setChargementVisible(true), DELAI_CHARGEMENT)
    return () => clearTimeout(minuterie)
  }, [qrCode])

  return (
    <div
      aria-busy={qrCode ? undefined : true}
      className="flex justify-center border border-filet bg-papier p-4"
    >
      {qrCode ? (
        <img
          src={qrCode}
          alt="QR code d'activation de Pilotage EJP"
          width={200}
          height={200}
          className="box-content block size-50 bg-papier p-3"
        />
      ) : (
        <p className="flex size-56 items-center justify-center text-encre-3">
          {chargementVisible ? 'Chargement' : null}
        </p>
      )}
    </div>
  )
}
