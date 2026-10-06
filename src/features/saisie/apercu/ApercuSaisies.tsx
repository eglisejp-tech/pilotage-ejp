import { useState } from 'react'
import { Aide } from '@/components/aide/Aide'
import { ChampNombre } from '@/features/saisie/ChampNombre'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import { plafondUnite } from '@/lib/metier/unites'

/**
 * Aperçu de développement des briques de saisie : le panneau de la saisie du dimanche (maquette
 * 08) avec ses quatre aides en bulle « flux », sans base ni envoi. Adresse : /apercu/saisies.
 * Données d'exemple. Le lot E3 le remplace par sa vraie saisie, en gardant les aides, car
 * `e2e/aide.spec.ts` s'appuie sur cette adresse. Enregistrée seulement en développement.
 */
export function ApercuSaisies() {
  const plafond = plafondUnite('nombre')
  const [service, setService] = useState('10')
  const [actifs, setActifs] = useState('14')
  const [enFij, setEnFij] = useState('11')
  const [propre, setPropre] = useState('3')
  const [message, setMessage] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)

  return (
    <>
      <title>Aperçu, Saisie du dimanche, Pilotage EJP</title>
      <PanneauSaisie
        surtitre="Chiffres du dimanche"
        titre="Dimanche 27 septembre"
        onFermer={() => undefined}
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={(evenement) => {
            evenement.preventDefault()
            setMessage('Chiffres du dimanche 27 sept. enregistrés.')
            setEnvoi((precedent) => precedent + 1)
          }}
        >
          <ChampNombre
            id="apercu-service"
            libelle="STARs au service ce dimanche"
            aide="dimanche.service"
            definition="Les STARs qui ont servi dans votre ministère ce dimanche. Si personne n'a servi, enregistrez 0."
            valeur={service}
            onChange={setService}
            max={plafond}
            note="Dimanche dernier : 9"
          />
          <ChampNombre
            id="apercu-actifs"
            libelle="STARs actifs"
            aide="dimanche.actifs"
            valeur={actifs}
            onChange={setActifs}
            max={plafond}
            variante="compact"
            note="Saisi le 24 sept."
          />
          <ChampNombre
            id="apercu-en-fij"
            libelle="Dont en FIJ"
            aide="dimanche.enFij"
            valeur={enFij}
            onChange={setEnFij}
            max={plafond}
            variante="compact"
            note="79 % des actifs"
          />
          <div className="flex flex-col gap-1.5">
            <div className="flex min-h-cible flex-wrap items-center">
              <p className="text-[15px] font-semibold">Indicateurs du ministère</p>
              <Aide code="dimanche.propres" libelle="Indicateurs du ministère" />
            </div>
            <ChampNombre
              id="apercu-propre"
              libelle="Répétitions de la semaine"
              valeur={propre}
              onChange={setPropre}
              max={plafond}
              variante="compact"
            />
          </div>
          <p className="text-note text-encre-3">
            Votre saisie s'ajoute à l'historique, elle ne remplace rien.
          </p>
          <button
            type="submit"
            className="min-h-14.5 w-full bg-lumiere px-4 text-[17px] font-bold text-encre"
          >
            Enregistrer les chiffres
          </button>
          <MessageReussite message={message} envoi={envoi} />
          <LienSignalement ecran="saisie_dimanche" />
        </form>
      </PanneauSaisie>
    </>
  )
}
