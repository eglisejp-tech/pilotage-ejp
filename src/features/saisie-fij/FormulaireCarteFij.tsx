import { useState } from 'react'
import type { FormEvent } from 'react'
import { ChampNombre } from '@/features/saisie/ChampNombre'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import {
  champsCarte,
  ligneTotalCarte,
  MESSAGE_REUSSITE_CARTE,
  valeursCarte,
} from '@/features/saisie-fij/calculs'
import type { ChampsDepartements } from '@/features/saisie-fij/calculs'
import {
  DEPARTEMENTS_FIJ,
  libelleDepartement,
  VALEUR_FIJ_MAX,
} from '@/features/saisie-fij/departements'
import { erreurValeurFij } from '@/features/saisie-fij/schemas'
import type { SaisieCarteFij } from '@/features/saisie-fij/schemas'
import { BoutonEnregistrer } from '@/features/saisie-session/BoutonEnregistrer'
import { LigneAvecAide } from '@/features/saisie-session/LigneAvecAide'
import { leJourAHeure } from '@/features/saisie-session/session'
import { useEnvoiSaisie } from '@/features/saisie-session/useEnvoiSaisie'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import type { Departement } from '@/lib/base'

interface Props {
  /** Dernière valeur de chaque département (`v_carte_fij`) : la carte part préremplie. */
  carte: readonly { departement: Departement; valeur: number; saisi_le: string }[]
  /** Enregistre les 8 départements en un envoi ; rejette en cas d'échec (les valeurs restent). */
  enregistrer: (valeurs: SaisieCarteFij) => Promise<void>
}

type ErreursCarte = Partial<Record<Departement, string>>

/** « Dernier envoi : le 21 sept. à 20 h 30. », ou la phrase du premier envoi. */
function ligneDernierEnvoi(carte: Props['carte']): string {
  const dernier = carte.reduce<string | null>(
    (plusRecent, ligne) =>
      plusRecent === null || new Date(ligne.saisi_le) > new Date(plusRecent)
        ? ligne.saisi_le
        : plusRecent,
    null,
  )
  return dernier === null
    ? "Aucune carte enregistrée pour l'instant : saisissez les 8 départements."
    : `Dernier envoi : ${leJourAHeure(dernier)}. Votre envoi remplacera la carte.`
}

/**
 * Carte des FIJ (panneau dérivé de 08, ministère FIJ seulement ; BRIEF section 9) : 8 champs
 * numériques préremplis, deux colonnes sous 600 px et quatre au-delà, la ligne « Total : 29 FIJ »
 * en direct, puis « Enregistrer la carte ». Les 8 départements partent en un seul envoi.
 */
export function FormulaireCarteFij({ carte, enregistrer }: Props) {
  const [champs, setChamps] = useState<ChampsDepartements>(() => champsCarte(carte))
  const [erreurs, setErreurs] = useState<ErreursCarte>({})
  const envoi = useEnvoiSaisie()
  const signature = DEPARTEMENTS_FIJ.map(({ code }) =>
    champs[code] === '' ? '' : String(Number(champs[code])),
  ).join(',')

  const changer = (departement: Departement) => (valeur: string) => {
    setChamps((precedents) => ({ ...precedents, [departement]: valeur }))
    setErreurs((precedentes) => ({ ...precedentes, [departement]: undefined }))
  }

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    if (envoi.enCours) return
    const trouvees: ErreursCarte = {}
    for (const { code } of DEPARTEMENTS_FIJ) {
      const erreur = erreurValeurFij(champs[code], true)
      if (erreur) trouvees[code] = erreur
    }
    setErreurs(trouvees)
    const premier = DEPARTEMENTS_FIJ.find(({ code }) => trouvees[code])
    if (premier) {
      document.getElementById(`carte-${premier.code}`)?.focus()
      return
    }
    await envoi.envoyer(() => enregistrer(valeursCarte(champs)), MESSAGE_REUSSITE_CARTE, signature)
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={(e) => void soumettre(e)}>
      <LigneAvecAide code="fij.carte" libelle="Carte des FIJ" classe="font-semibold">
        Nombre de FIJ par département
      </LigneAvecAide>
      <p className="text-sm leading-normal text-encre-3">{ligneDernierEnvoi(carte)}</p>
      <div className="grid grid-cols-2 items-start gap-x-3 gap-y-4 min-[600px]:grid-cols-4">
        {DEPARTEMENTS_FIJ.map((departement) => (
          <ChampNombre
            key={departement.code}
            id={`carte-${departement.code}`}
            libelle={libelleDepartement(departement)}
            valeur={champs[departement.code]}
            onChange={changer(departement.code)}
            max={VALEUR_FIJ_MAX}
            variante="compact"
            erreur={erreurs[departement.code]}
          />
        ))}
      </div>
      <p className="text-[15px] leading-normal font-semibold" aria-live="polite">
        {ligneTotalCarte(champs)}
      </p>
      <BoutonEnregistrer
        libelle="Enregistrer la carte"
        enCours={envoi.enCours}
        dejaEnvoye={envoi.dejaEnvoye(signature)}
        doublon={envoi.doublonRefuse(signature)}
      />
      {envoi.echec ? <ErreurFormulaire message={envoi.echec.message ?? undefined} /> : null}
      <MessageReussite
        message={envoi.reussite?.message ?? null}
        envoi={envoi.reussite?.envoi ?? 0}
      />
      <LienSignalement ecran="saisie_fij" />
    </form>
  )
}
