import { useRef } from 'react'
import { Arrivee } from '@/components/etats/Arrivee'
import { ChargementEnLigne } from '@/components/etats/ChargementEnLigne'
import { useAttenteChargement } from '@/components/etats/useAttenteChargement'

/** Pendant la préparation du QR code, avec la petite flamme (T65, moment 3). */
export const TEXTE_QR_EN_PREPARATION = 'Chargement du QR code'

/** La préparation du QR code a échoué (m044) : le cadre le dit, avec « Réessayer ». */
export const MESSAGE_QR_EN_ECHEC = "Le QR code n'a pas pu s'afficher. Réessayez."

type Proprietes = {
  /** Image du QR code (adresse data:), absente tant que l'enrôlement n'a pas répondu. */
  qrCode?: string
  /** L'enrôlement a échoué (connexion) : le message et « Réessayer » remplacent « Chargement ». */
  enEchec?: boolean
  onReessayer?: () => void
  /**
   * L'enrôlement est refusé pour une raison qu'un nouvel essai ne change pas tout de suite (trop
   * de tentatives, compte désactivé, connexion expirée) : ce message, sans « Réessayer ».
   */
  refus?: string
}

/**
 * Encadré du QR code (maquette 17). Pendant sa préparation, la petite flamme et « Chargement du
 * QR code » apparaissent après 300 ms, dans le cadre, avec aria-busy
 * (docs/reference/maquettes/LISEZMOI.md, « États » ; T65, moment 3), au moins 600 ms une fois
 * montrées ; le QR code arrive ensuite en fondu, à la même place. Un échec de connexion se dit
 * dans le cadre même (role="alert"), avec « Réessayer » : l'écran n'oblige plus à saisir un code
 * pour relancer la préparation. Au clic, le focus reste sur le cadre, que le bouton quitte pendant
 * le nouvel essai. Un refus précis se dit au même endroit, sans bouton : réessayer tout de suite
 * ne servirait à rien, ou aggraverait une limite.
 */
export function QrCodeActivation({ qrCode, enEchec = false, onReessayer, refus }: Proprietes) {
  const cadre = useRef<HTMLDivElement>(null)
  const enPreparation = !qrCode && !enEchec && !refus
  const { attente, fondu } = useAttenteChargement(enPreparation)

  return (
    <div
      ref={cadre}
      tabIndex={-1}
      aria-busy={attente ? true : undefined}
      className="flex justify-center border border-filet bg-papier p-4 outline-hidden"
    >
      {attente ? (
        <div className="flex size-56 items-center justify-center">
          <ChargementEnLigne texte={TEXTE_QR_EN_PREPARATION} />
        </div>
      ) : qrCode ? (
        <Arrivee fondu={fondu}>
          <img
            src={qrCode}
            alt="QR code d'activation de Pilotage EJP"
            width={200}
            height={200}
            className="box-content block size-50 bg-papier p-3"
          />
        </Arrivee>
      ) : refus ? (
        <div className="flex min-h-56 w-full flex-col items-center justify-center text-center">
          <p role="alert" className="text-[15px] leading-normal text-alerte">
            {refus}
          </p>
        </div>
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
      ) : null}
    </div>
  )
}
