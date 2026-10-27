#!/usr/bin/env bash
# Fonctions de l'export chiffré par clé publique (T79, docs/conception/export-chiffre.md),
# partagées par l'action « export » de scripts/production.sh, par restaurer.sh, empreintes.sh et
# l'essai de la CI (essai-restauration.sh). Ce fichier se charge par « source » ; seul, il ne
# lance rien.
#
# Règles tenues ici :
#   - le clair ne touche jamais le disque : pg_dump écrit vers age, en flux ;
#   - les identifiants temporaires de la base vivent dans des variables du script (ident_*),
#     jamais à l'écran, jamais dans un fichier, jamais dans les arguments d'un programme ;
#   - pg_dump ne reçoit que les variables PG* utiles, rien d'hérité (PGSERVICE, PGHOSTADDR...) ;
#   - la sortie ne dit que la forme du fichier : nom, taille, empreinte, nombre de tables ;
#   - tout écart arrête le script (« Arrêt : ... »), sans rien garder.

set -o pipefail

EXPORT_MOTIF_NOM='^ejp-[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{4}\.dump\.age$'
EXPORT_JOURS_GARDES=28
EXPORT_TAILLE_MIN=10240
EXPORT_CLE_ATTENTE='en-attente-de-la-cle-publique'
EXPORT_ENTETE_AGE='age-encryption.org/v1'

# Binaires du poste (docs/exploitation.md, 9.2), relevés le 27 octobre 2026 sur les fichiers
# installés depuis les archives vérifiées (age 1.3.2, PostgreSQL 17.11-5 d'EDB) : age.exe,
# pg_dump.exe et les DLL que pg_dump charge depuis pgsql/bin. Une autre version demande de relever
# ces sommes à nouveau, sur une branche, avec l'accord de la personne pour main.
EXPORT_EMPREINTES_POSTE=(
  '2821a4ed191da07372acd302e5f6feae7a7985e285e1417765ebe74025af45f0  age/age.exe'
  'eaa2d00935e0dd55a6ad7aa2f106d013dcb4e793b7e7d2c6df64bf5b60fbdcd7  pgsql/bin/pg_dump.exe'
  '9ed093bb84a0b93603ceb11011442342a4f8789fb1af44d96f6e1923f75b4812  pgsql/bin/libpq.dll'
  '1125ac8dc0c4f5c3ed4712e0d8ad29474099fcb55bb0e563a352ce9d03ef1d78  pgsql/bin/libintl-9.dll'
  '096af775241b3bd4b1c3d79c83b103bb8f02da54ec4cd76c5d49eef61a68ad01  pgsql/bin/liblz4.dll'
  '287e7e474961e8886a3d961e2c07da647a7ac8d60d97023545f3a3ecf604daba  pgsql/bin/libzstd.dll'
  '54c0a88da398559c3daec198d7af8f020ff6fbeead38dbacd97d21ae920c3a00  pgsql/bin/libcrypto-3-x64.dll'
  'ffe2d56375bb4e8bdee9037df6befc5016ddd8871d0d85027314dd5792f8fdc9  pgsql/bin/libwinpthread-1.dll'
  '3ee9786ab3eb8dfd791bdbd17c7e791dbe025734befcded0ee4170e1089f79df  pgsql/bin/libiconv-2.dll'
  '0ac3d836a2fa84dee83bd06a4abfaf8ab7ded689420edc76febc185500e2d6e1  pgsql/bin/libssl-3-x64.dll'
)
# DLL de l'archive d'EDB dans pgsql/bin. Une DLL en plus (au nom d'une DLL du système, par
# exemple) serait chargée avant celle du système : elle est refusée. Aucune DLL dans age/.
EXPORT_DLL_PGSQL=(
  icudt67.dll icuin67.dll icuio67.dll icutu67.dll icuuc67.dll libcrypto-3-x64.dll libcurl.dll
  libecpg.dll libecpg_compat.dll libiconv-2.dll libintl-9.dll liblz4.dll libpgtypes.dll libpq.dll
  libssl-3-x64.dll libwinpthread-1.dll libxml2.dll libxslt.dll libzstd.dll testplug.dll
  wxbase3211u_net_vc_x64_custom.dll wxbase3211u_vc_x64_custom.dll wxbase3211u_xml_vc_x64_custom.dll
  wxmsw3211u_adv_vc_x64_custom.dll wxmsw3211u_aui_vc_x64_custom.dll
  wxmsw3211u_core_vc_x64_custom.dll wxmsw3211u_html_vc_x64_custom.dll
  wxmsw3211u_xrc_vc_x64_custom.dll zlib1.dll
)
# Variables gardées quand le script se relance sous env -i (PATH est fixé à part) : celles dont
# Windows, node, npm, git et la CLI ont besoin. Ni BASH_ENV, ni SHELLOPTS, ni PG*, ni GIT_*, ni
# EXPORT_*.
EXPORT_VARIABLES_GARDEES=(
  HOME USERPROFILE APPDATA LOCALAPPDATA TEMP TMP SYSTEMROOT SYSTEMDRIVE WINDIR COMSPEC PATHEXT
  PROGRAMFILES PROGRAMDATA USERNAME USERDOMAIN COMPUTERNAME HOMEDRIVE HOMEPATH
  NUMBER_OF_PROCESSORS PROCESSOR_ARCHITECTURE OS MSYSTEM
)
# Variables que pg_dump garde en plus des PG* utiles (Windows en a besoin pour le réseau).
EXPORT_VARIABLES_PG_DUMP=(SYSTEMROOT SYSTEMDRIVE WINDIR TEMP TMP MSYS_NO_PATHCONV)

export_arreter() {
  echo "Arrêt : $1" >&2
  exit 1
}

# Vrai si l'environnement est déjà propre : aucune trace (-x, -v), ni BASH_ENV ni ENV, PATH égal à
# $1, aucune fonction exportée, et seulement des variables exportées de EXPORT_VARIABLES_GARDEES
# (plus PATH, MSYS_NO_PATHCONV, EXPORT_RELANCE et celles que bash pose lui-même).
export_environnement_propre() {
  local nom
  [[ $- != *x* && $- != *v* ]] || return 1
  [ -z "${BASH_ENV+x}" ] && [ -z "${ENV+x}" ] || return 1
  [[ :${SHELLOPTS:-}: != *:xtrace:* && :${SHELLOPTS:-}: != *:verbose:* ]] || return 1
  [ "$PATH" = "$1" ] || return 1
  [ -z "$(declare -Fx)" ] || return 1
  for nom in $(compgen -e); do
    case " PATH MSYS_NO_PATHCONV EXPORT_RELANCE PWD OLDPWD SHLVL _ ${EXPORT_VARIABLES_GARDEES[*]} " in
      *" $nom "*) ;;
      *) return 1 ;;
    esac
  done
}

# Relance le script $2 (ses arguments ensuite) sous env -i, PATH fixé à $1, par /usr/bin/bash
# --noprofile --norc, si l'environnement n'est pas propre. Une seule relance : si l'environnement
# reste sale après elle, arrêt.
export_relancer_propre() {
  local chemin=$1 script=$2 nom
  shift 2
  if export_environnement_propre "$chemin"; then return 0; fi
  [ "${EXPORT_RELANCE:-}" != 1 ] ||
    export_arreter "environnement impossible à nettoyer après la relance sous env -i."
  local variables=("PATH=$chemin" MSYS_NO_PATHCONV=1 EXPORT_RELANCE=1)
  for nom in "${EXPORT_VARIABLES_GARDEES[@]}"; do
    if [ -n "${!nom+x}" ]; then variables+=("$nom=${!nom}"); fi
  done
  exec /usr/bin/env -i "${variables[@]}" /usr/bin/bash --noprofile --norc "$script" "$@"
}

# git dans le dépôt $1, sans configuration globale ni système (ni règle url.*.insteadOf, ni
# assistant d'identification), sans objets de remplacement.
export__git_isole() {
  local depot=$1
  shift
  GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0 GIT_NO_REPLACE_OBJECTS=1 \
    git -C "$depot" "$@"
}

# Branche $3 du dépôt officiel $2 récupérée dans le clone $1 : refspec explicite vers
# refs/remotes/origin/$3 (le « origin » configuré n'est jamais lu), adresse neutralisée par -c
# contre toute réécriture, seul le protocole de $2 permis (file pour un chemin, dans les tests).
# Affiche le SHA. Une règle
# url.*.insteadOf dans la configuration du clone arrête tout.
export_recuperer() {
  local clone=$1 depot=$2 branche=$3 protocole=file regles sha
  case $depot in *://*) protocole=${depot%%://*} ;; esac
  regles=$(export__git_isole "$clone" config --get-regexp '^url\..*\.(insteadof|pushinsteadof)$' || true)
  [ -z "$regles" ] || export_arreter "le clone a une règle url.*.insteadOf : rien n'est lancé."
  export__git_isole "$clone" -c "url.$depot.insteadOf=$depot" -c http.sslVerify=true \
    -c protocol.allow=never -c "protocol.$protocole.allow=always" \
    fetch --quiet --no-tags "$depot" "+refs/heads/$branche:refs/remotes/origin/$branche" ||
    export_arreter "impossible de récupérer $branche depuis $depot."
  sha=$(export__git_isole "$clone" rev-parse --verify --quiet "refs/remotes/origin/$branche^{commit}") ||
    export_arreter "$branche introuvable après la récupération."
  echo "$sha"
}

# Date de Paris calculée par node (Git Bash ignore TZ=Europe/Paris). $1 : horodatage (AAAA-MM-JJ-HHMM),
# jour (AAAA-MM-JJ) ou seuil (jour de Paris moins EXPORT_JOURS_GARDES jours). $2 facultatif : un
# instant ISO, pour les tests.
export__date() {
  node -e '
const [mode, instant, jours] = process.argv.slice(1);
const d = instant ? new Date(instant) : new Date();
if (Number.isNaN(d.getTime())) process.exit(2);
const p = Object.fromEntries(
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d).map((x) => [x.type, x.value]),
);
const jour = `${p.year}-${p.month}-${p.day}`;
if (mode === "horodatage") console.log(`${jour}-${p.hour}${p.minute}`);
else if (mode === "jour") console.log(jour);
else if (mode === "seuil") {
  const s = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) - Number(jours)));
  console.log(s.toISOString().slice(0, 10));
} else process.exit(2);
' "$1" "${2:-}" "$EXPORT_JOURS_GARDES" || export_arreter "date de Paris illisible."
}

export_date_paris() { export__date horodatage "${1:-}"; }
export_jour_paris() { export__date jour "${1:-}"; }

# Lignes d'un texte, sans here-string : bash écrirait un gros here-string dans un fichier
# temporaire, et le texte lu ici peut contenir un mot de passe.
export__lignes() {
  local reste=$1
  EXPORT_LIGNES=()
  while [ -n "$reste" ]; do
    if [[ $reste == *$'\n'* ]]; then
      EXPORT_LIGNES+=("${reste%%$'\n'*}")
      reste=${reste#*$'\n'}
    else
      EXPORT_LIGNES+=("$reste")
      reste=""
    fi
  done
}

# Clé publique des exports : texte du fichier scripts/export/destinataires.txt en $1. Lignes vides
# et lignes « # » ignorées ; exactement une clé age (X25519) ; la valeur d'attente est refusée.
export_lire_cle() {
  local ligne cle="" n=0
  export__lignes "$1"
  for ligne in "${EXPORT_LIGNES[@]}"; do
    ligne=${ligne%$'\r'}
    ligne=${ligne#"${ligne%%[![:space:]]*}"}
    ligne=${ligne%"${ligne##*[![:space:]]}"}
    case $ligne in '' | '#'*) continue ;; esac
    [ "$ligne" != "$EXPORT_CLE_ATTENTE" ] ||
      export_arreter "la clé publique des exports est encore la valeur d'attente : la personne crée sa paire de clés et donne la clé publique (gestes G2 à G4, docs/exploitation.md, section 9.2)."
    n=$((n + 1))
    cle=$ligne
  done
  [ "$n" -eq 1 ] ||
    export_arreter "le fichier des destinataires doit contenir exactement une clé publique (trouvé : $n)."
  [[ $cle =~ ^age1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58}$ ]] ||
    export_arreter "la clé publique des exports n'est pas une clé age valide."
  echo "$cle"
}

# Identifiants temporaires : sortie de l'essai à blanc de la CLI en $1 (db dump --dry-run, qui
# imprime « export PGHOST="..." » ... « export PGPASSWORD="..." »). Chaque ligne exactement une
# fois, sans eval ; remplit ident_hote, ident_port, ident_utilisateur, ident_mot_de_passe,
# ident_base. N'affiche jamais rien de la sortie.
export_lire_identifiants() {
  local ligne nom valeur
  local -A vus=()
  ident_hote="" ident_port="" ident_utilisateur="" ident_mot_de_passe="" ident_base=""
  export__lignes "$1"
  for ligne in "${EXPORT_LIGNES[@]}"; do
    ligne=${ligne%$'\r'}
    [[ $ligne =~ ^export\ (PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE)=\"(.*)\"$ ]] || continue
    nom=${BASH_REMATCH[1]}
    valeur=${BASH_REMATCH[2]//\\\"/\"}
    vus[$nom]=$((${vus[$nom]:-0} + 1))
    case $nom in
      PGHOST) ident_hote=$valeur ;;
      PGPORT) ident_port=$valeur ;;
      PGUSER) ident_utilisateur=$valeur ;;
      PGPASSWORD) ident_mot_de_passe=$valeur ;;
      PGDATABASE) ident_base=$valeur ;;
    esac
  done
  EXPORT_LIGNES=()
  for nom in PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE; do
    if [ "${vus[$nom]:-0}" -ne 1 ]; then
      export_effacer_identifiants
      export_arreter "identifiants temporaires introuvables dans l'essai à blanc de la CLI (ligne $nom absente ou en double, sortie non affichée) : option B nécessaire (docs/conception/export-chiffre.md, 4.3)."
    fi
  done
  if [ -z "$ident_hote" ] || [ -z "$ident_utilisateur" ] || [ -z "$ident_mot_de_passe" ]; then
    export_effacer_identifiants
    export_arreter "identifiants temporaires vides dans l'essai à blanc de la CLI (sortie non affichée) : option B nécessaire (docs/conception/export-chiffre.md, 4.3)."
  fi
}

export_effacer_identifiants() {
  ident_hote="" ident_port="" ident_utilisateur="" ident_mot_de_passe="" ident_base=""
}

# Outil de l'export (CI et restauration ; jamais en production, voir export_outils_poste) :
# $EXPORT_OUTILS/age/<nom>.exe, $EXPORT_OUTILS/pgsql/bin/<nom>.exe, $EXPORT_PG_BIN/<nom>, puis le
# PATH.
export_trouver_outil() {
  local nom=$1 chemin candidats=()
  if [ -n "${EXPORT_OUTILS:-}" ]; then
    candidats+=("$EXPORT_OUTILS/age/$nom.exe" "$EXPORT_OUTILS/pgsql/bin/$nom.exe")
  fi
  if [ -n "${EXPORT_PG_BIN:-}" ]; then candidats+=("$EXPORT_PG_BIN/$nom"); fi
  for chemin in "${candidats[@]}"; do
    if [ -f "$chemin" ]; then
      echo "$chemin"
      return 0
    fi
  done
  if chemin=$(command -v "$nom" 2>/dev/null); then
    echo "$chemin"
    return 0
  fi
  export_arreter "outil absent : $nom (docs/exploitation.md, section 9.2, installation des outils)."
}

# Empreintes des binaires : $1 dossier des outils, puis des lignes « sha256  chemin » (chemin
# relatif à $1). Arrêt au premier fichier absent ou différent, ou si une DLL hors de
# EXPORT_DLL_PGSQL est dans pgsql/bin (ou une DLL quelconque dans age/).
export_verifier_binaires() {
  local dossier=$1 ligne attendue chemin reelle fichier nom
  shift
  for ligne in "$@"; do
    attendue=${ligne%%  *}
    chemin=${ligne#*  }
    [ -f "$dossier/$chemin" ] && [ ! -L "$dossier/$chemin" ] ||
      export_arreter "binaire absent : $chemin (docs/exploitation.md, section 9.2)."
    reelle=$(sha256sum "$dossier/$chemin" | cut -d ' ' -f 1)
    [ "$reelle" = "$attendue" ] ||
      export_arreter "empreinte inattendue pour $chemin, binaire refusé (docs/exploitation.md, section 9.2)."
  done
  for fichier in "$dossier"/pgsql/bin/*.[dD][lL][lL] "$dossier"/age/*.[dD][lL][lL]; do
    [ -e "$fichier" ] || continue
    nom=${fichier##*/}
    if [[ $fichier == "$dossier/age/"* ]] || [[ " ${EXPORT_DLL_PGSQL[*]} " != *" ${nom,,} "* ]]; then
      export_arreter "DLL inattendue : ${fichier#"$dossier/"} (docs/exploitation.md, section 9.2)."
    fi
  done
}

# Outils de l'export en production : ceux du dossier $1 seulement (ni EXPORT_PG_BIN, ni PATH),
# empreintes de EXPORT_EMPREINTES_POSTE vérifiées. Remplit EXPORT_AGE et EXPORT_PG_DUMP.
export_outils_poste() {
  export_verifier_binaires "$1" "${EXPORT_EMPREINTES_POSTE[@]}"
  EXPORT_AGE="$1/age/age.exe"
  EXPORT_PG_DUMP="$1/pgsql/bin/pg_dump.exe"
}

# Mode TLS de pg_dump en production : verify-full avec le certificat d'autorité de Supabase ($1,
# fichier public du dépôt) s'il est là ; sinon require, annoncé à l'écran. Un fichier présent mais
# illisible arrête l'export : jamais de repli vers require. Remplit EXPORT_SSLMODE et
# EXPORT_SSLROOTCERT.
export_mode_ssl() {
  if [ -e "$1" ]; then
    { [ -f "$1" ] && grep -q -- '-----BEGIN CERTIFICATE-----' "$1" &&
      grep -q -- '-----END CERTIFICATE-----' "$1"; } ||
      export_arreter "le certificat de Supabase ($1) n'est pas un certificat PEM : rien n'est lancé, sans repli vers require."
    EXPORT_SSLMODE=verify-full
    EXPORT_SSLROOTCERT=$1
    echo "Connexion : TLS vérifié (verify-full, certificat d'autorité de Supabase du dépôt)."
  else
    EXPORT_SSLMODE=require
    EXPORT_SSLROOTCERT=""
    echo "Connexion : TLS chiffré, serveur non vérifié (require) : certificat de Supabase absent du dépôt (geste G7, docs/exploitation.md, section 9.2)."
  fi
}

# Majeure de PostgreSQL de la base : supabase/.temp/postgres-version du dossier $1 (écrit par la
# CLI au lien), sinon major_version de supabase/config.toml.
export_majeure_base() {
  local v=""
  if [ -f "$1/supabase/.temp/postgres-version" ]; then
    v=$(head -n 1 "$1/supabase/.temp/postgres-version")
  fi
  if [[ $v =~ ^([0-9]+)\. ]]; then
    echo "${BASH_REMATCH[1]}"
    return 0
  fi
  v=$(sed -n 's/^major_version *= *\([0-9][0-9]*\).*/\1/p' "$1/supabase/config.toml" 2>/dev/null | head -n 1)
  [ -n "$v" ] || export_arreter "majeure de PostgreSQL de la base introuvable."
  echo "$v"
}

# pg_dump ($1) de la majeure de la base ($2) exactement. Affiche sa version.
export_verifier_pg_dump() {
  local version
  version=$("$1" --version 2>/dev/null | head -n 1) || export_arreter "pg_dump ne répond pas ($1)."
  [[ $version =~ \(PostgreSQL\)\ ([0-9]+)\. ]] || export_arreter "version de pg_dump illisible."
  [ "${BASH_REMATCH[1]}" = "$2" ] ||
    export_arreter "pg_dump ${BASH_REMATCH[1]} alors que la base est en PostgreSQL $2 : installer le client $2 (docs/exploitation.md, section 9.2)."
  echo "$version"
}

# age ($1) en version 1.x. Affiche sa version.
export_verifier_age() {
  local version
  version=$("$1" --version 2>/dev/null | head -n 1) || export_arreter "age ne répond pas ($1)."
  [[ $version =~ ^v?1\.[0-9]+ ]] ||
    export_arreter "version d'age inattendue ($version) : 1.x attendue (docs/exploitation.md, section 9.2)."
  echo "age $version"
}

# Erreurs utiles d'un journal (entrée standard) : 10 lignes au plus, 200 caractères au plus,
# mots de passe et adresses de connexion masqués.
export_filtrer_erreurs() {
  grep -E -i 'error|erreur|fatal|could not|impossible|failed|échec|detail|détail' |
    grep -v -E 'dumping contents of table|contenu de la table' |
    sed -E -e 's/(pgpassword|password|mot de passe)( *[=:] *)[^ ]+/\1\2***/Ig' \
      -e 's#postgres(ql)?://[^ ]+#postgresql://***#Ig' |
    cut -c 1-200 | head -n 10 || true
}

# pg_dump ($1) avec les seules variables utiles : toutes les variables exportées héritées sont
# retirées (PGSERVICE, PGHOSTADDR, PGSSLMODE, PGPASSFILE...), sauf EXPORT_VARIABLES_PG_DUMP. Les
# valeurs passent par l'environnement, jamais par les arguments. Sous-shell : rien ne fuit.
export__pg_dump() (
  local nom garde
  for nom in $(compgen -e); do
    garde=non
    for g in "${EXPORT_VARIABLES_PG_DUMP[@]}"; do if [ "$nom" = "$g" ]; then garde=oui; fi; done
    if [ "$garde" = non ]; then export -n "$nom"; fi
  done
  export LC_ALL=C LC_MESSAGES=C PGHOST="$ident_hote" PGPORT="$ident_port" \
    PGUSER="$ident_utilisateur" PGPASSWORD="$ident_mot_de_passe" PGDATABASE="$ident_base" \
    PGSSLMODE="$EXPORT_SSLMODE" PGCONNECT_TIMEOUT=30 PGAPPNAME=export-ejp
  if [ -n "${EXPORT_SSLROOTCERT:-}" ]; then export PGSSLROOTCERT="$EXPORT_SSLROOTCERT"; fi
  exec "$1" --format=custom --schema=public --schema=private --no-owner --no-privileges \
    --role=postgres --verbose
)

# Vrai si le fichier $1 commence par l'en-tête d'age, suivi d'une fin de ligne.
export__entete_age() {
  [ "$(head -c $((${#EXPORT_ENTETE_AGE} + 1)) "$1" | od -An -c | tr -d ' \n')" = \
    "$(printf '%s\\n' "$EXPORT_ENTETE_AGE")" ]
}

# Export en flux des schémas public et private vers age. $1 dossier, $2 nom final, $3 clé
# publique, $4 pg_dump, $5 age. Identifiants : ident_* (export_lire_identifiants). Mode TLS :
# EXPORT_SSLMODE (obligatoire) et EXPORT_SSLROOTCERT (export_mode_ssl en production).
# Remplit EXPORT_TAILLE, EXPORT_SHA256 et EXPORT_TABLES. Écrit d'abord <nom>.partiel (déjà chiffré),
# renommé seulement si tous les contrôles passent ; sinon rien n'est gardé. Le journal de pg_dump
# (<nom>.journal, noms de tables et erreurs) reste dans le dossier des exports, jamais dans le
# dossier temporaire du système, et s'efface à la fin comme au démarrage suivant.
export_flux() {
  local dossier=$1 nom=$2 cle=$3 pg_dump=$4 age=$5
  [ ! -e "$dossier/$nom" ] || export_arreter "$nom existe déjà dans $dossier."
  case ${EXPORT_SSLMODE:-} in
    verify-full)
      [ -f "${EXPORT_SSLROOTCERT:-}" ] ||
        export_arreter "verify-full sans certificat d'autorité : rien n'est lancé."
      ;;
    require | disable)
      [ -z "${EXPORT_SSLROOTCERT:-}" ] ||
        export_arreter "certificat d'autorité présent : seul verify-full est accepté."
      ;;
    *) export_arreter "mode TLS de la connexion non fixé (EXPORT_SSLMODE)." ;;
  esac
  EXPORT_PARTIEL="$dossier/$nom.partiel"
  EXPORT_JOURNAL="$dossier/$nom.journal"
  rm -f -- "$EXPORT_PARTIEL" "$EXPORT_JOURNAL"
  trap 'rm -f -- "$EXPORT_PARTIEL" "$EXPORT_JOURNAL"' EXIT
  trap 'exit 130' INT TERM
  if ! export__pg_dump "$pg_dump" 2>"$EXPORT_JOURNAL" |
    "$age" -e -r "$cle" -o "$EXPORT_PARTIEL" 2>>"$EXPORT_JOURNAL"; then
    echo "Arrêt : export incomplet, aucun fichier gardé." >&2
    export_filtrer_erreurs <"$EXPORT_JOURNAL" >&2
    exit 1
  fi
  EXPORT_TAILLE=$(wc -c <"$EXPORT_PARTIEL" | tr -d ' ')
  [ "$EXPORT_TAILLE" -ge "$EXPORT_TAILLE_MIN" ] ||
    export_arreter "export trop petit ($EXPORT_TAILLE octets), aucun fichier gardé."
  export__entete_age "$EXPORT_PARTIEL" ||
    export_arreter "le fichier produit n'a pas l'en-tête d'age, aucun fichier gardé."
  EXPORT_TABLES=$(grep -c -E 'dumping contents of table|contenu de la table' "$EXPORT_JOURNAL" || true)
  [ "$EXPORT_TABLES" -ge 1 ] || export_arreter "aucune table au sommaire de l'export, aucun fichier gardé."
  mv -- "$EXPORT_PARTIEL" "$dossier/$nom"
  EXPORT_SHA256=$(sha256sum "$dossier/$nom" | cut -d ' ' -f 1)
  rm -f -- "$EXPORT_JOURNAL"
  trap - EXIT INT TERM
}

# Restes d'un export tué sans nettoyage, effacés au démarrage suivant : fichiers .partiel (déjà
# chiffrés) et .journal du dossier $1.
export_nettoyer_partiels() {
  local fichier
  for fichier in "$1"/ejp-*.dump.age.partiel "$1"/ejp-*.dump.age.journal; do
    if [ -f "$fichier" ]; then rm -f -- "$fichier"; fi
  done
}

# Purge, après un export réussi : exports du dossier $1 de plus de EXPORT_JOURS_GARDES jours (date
# du nom, heure de Paris) et leur fiche ; jamais le plus récent ; aucun autre fichier. $2 : instant
# ISO facultatif (tests). Remplit EXPORT_SUPPRIMES et EXPORT_GARDES.
export_purger() {
  local dossier=$1 seuil fichier nom plus_recent="" tous=()
  seuil=$(export__date seuil "${2:-}")
  for fichier in "$dossier"/ejp-*.dump.age; do
    nom=${fichier##*/}
    if [[ $nom =~ $EXPORT_MOTIF_NOM ]] && [ -f "$fichier" ]; then tous+=("$nom"); fi
  done
  if [ ${#tous[@]} -gt 0 ]; then plus_recent=$(printf '%s\n' "${tous[@]}" | sort | tail -n 1); fi
  EXPORT_SUPPRIMES=0
  EXPORT_GARDES=0
  for nom in "${tous[@]}"; do
    if [[ ${nom:4:10} < $seuil ]] && [ "$nom" != "$plus_recent" ]; then
      rm -f -- "$dossier/$nom" "$dossier/${nom%.dump.age}.json"
      EXPORT_SUPPRIMES=$((EXPORT_SUPPRIMES + 1))
    else
      EXPORT_GARDES=$((EXPORT_GARDES + 1))
    fi
  done
}

# Vrai si un export complet (non vide) daté d'aujourd'hui, heure de Paris, est dans le dossier $1.
# $2 : instant ISO facultatif (tests).
export_existe_aujourdhui() {
  local jour fichier
  jour=$(export__date jour "${2:-}") || return 1
  [ -n "$jour" ] || return 1
  for fichier in "$1"/ejp-"$jour"-[0-9][0-9][0-9][0-9].dump.age; do
    if export__export_complet "$fichier"; then return 0; fi
  done
  return 1
}

# Vrai si l'export $1 est complet : fichier ordinaire, au moins EXPORT_TAILLE_MIN octets, en-tête
# d'age, fiche .json à côté dont le nom, la taille et l'empreinte SHA-256 sont ceux du fichier.
export__export_complet() {
  local fichier=$1 fiche taille sha
  fiche="${fichier%.dump.age}.json"
  [ -f "$fichier" ] && [ ! -L "$fichier" ] && [ -f "$fiche" ] || return 1
  taille=$(wc -c <"$fichier" | tr -d ' ')
  [ "$taille" -ge "$EXPORT_TAILLE_MIN" ] || return 1
  export__entete_age "$fichier" || return 1
  sha=$(sha256sum "$fichier" | cut -d ' ' -f 1)
  node -e '
const [chemin, sha, nom, taille] = process.argv.slice(1);
let f;
try { f = JSON.parse(require("node:fs").readFileSync(chemin, "utf8")); } catch { process.exit(1); }
process.exit(f && f.sha256 === sha && f.fichier === nom && f.taille_octets === Number(taille) ? 0 : 1);
' "$fiche" "$sha" "${fichier##*/}" "$taille" 2>/dev/null
}

# Dernière migration appliquée, lue dans la sortie de « migration list » ($1) : la plus grande
# version de 14 chiffres de la colonne Remote (colonnes séparées par | ou │, versions parfois
# entre backticks, comme dans la CLI 2.122), sinon « inconnue ».
export_derniere_migration() {
  printf '%s\n' "$1" | sed 's/│/|/g' | awk -F'|' '
    { v = $2; gsub(/[ \t\r`]/, "", v); if (v ~ /^[0-9]+$/ && length(v) == 14 && v > m) m = v }
    END { if (m == "") print "inconnue"; else print m }'
}

# Fiche en clair, sans aucune donnée, à côté de l'export : $1 dossier, $2 nom, $3 clé publique,
# $4 commit de main, $5 dernière migration, $6 version de pg_dump, $7 version d'age, $8 version de
# la CLI. Utilise EXPORT_TAILLE, EXPORT_SHA256, EXPORT_TABLES.
export_ecrire_fiche() {
  node -e '
const [fichier, horodatage, taille, sha256, tables, cle, commit, migration, pgDump, age, cli] =
  process.argv.slice(1);
const fiche = {
  fichier, horodatage_paris: horodatage, taille_octets: Number(taille), sha256,
  tables: Number(tables), cle_publique: cle, commit_main: commit, derniere_migration: migration,
  pg_dump: pgDump, age, cli_supabase: cli,
  contenu: "public et private, structure et donnees, sans droits ni proprietaires (pg_dump --format=custom)",
};
process.stdout.write(JSON.stringify(fiche, null, 2) + "\n");
' "$2" "${2:4:15}" "$EXPORT_TAILLE" "$EXPORT_SHA256" "$EXPORT_TABLES" "$3" "$4" "$5" "$6" "$7" "$8" \
    >"$1/${2%.dump.age}.json"
}

# Les sept lignes que Claude voit après un export : $1 nom, $2 clé publique (affichée entière,
# elle n'est pas secrète), $3 dernière migration.
export_resume() {
  echo "Export chiffré : $1"
  echo "Taille : $EXPORT_TAILLE octets ($(((EXPORT_TAILLE + 1023) / 1024)) Kio)"
  echo "Empreinte SHA-256 : $EXPORT_SHA256"
  echo "Sommaire : $EXPORT_TABLES tables exportées"
  echo "Clé : $2"
  echo "Dernière migration en production : $3"
  echo "Exports gardés : $EXPORT_GARDES ($EXPORT_SUPPRIMES supprimé(s), plus vieux que $EXPORT_JOURS_GARDES jours)"
}

# Vérifie qu'un résumé (entrée standard) n'a que les sept lignes autorisées, dans l'ordre.
export_verifier_resume() {
  local motifs=(
    '^Export chiffré : ejp-[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{4}\.dump\.age$'
    '^Taille : [0-9]+ octets \([0-9]+ Kio\)$'
    '^Empreinte SHA-256 : [0-9a-f]{64}$'
    '^Sommaire : [0-9]+ tables exportées$'
    '^Clé : age1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58}$'
    '^Dernière migration en production : ([0-9]{14}|inconnue)$'
    '^Exports gardés : [0-9]+ \([0-9]+ supprimé\(s\), plus vieux que [0-9]+ jours\)$'
  )
  local lignes=() ligne i
  while IFS= read -r ligne; do lignes+=("$ligne"); done
  [ ${#lignes[@]} -eq ${#motifs[@]} ] ||
    export_arreter "le résumé a ${#lignes[@]} lignes, ${#motifs[@]} attendues."
  for i in "${!motifs[@]}"; do
    [[ ${lignes[$i]} =~ ${motifs[$i]} ]] || export_arreter "ligne $((i + 1)) du résumé non autorisée."
  done
}

# Base Supabase locale (Docker) : nom du seul conteneur supabase_db_* qui tourne.
export_conteneur_base() {
  local noms
  command -v docker >/dev/null 2>&1 ||
    export_arreter "docker introuvable : la restauration se fait dans la pile Supabase locale."
  noms=$(docker ps --filter 'name=^supabase_db_' --format '{{.Names}}')
  [ -n "$noms" ] || export_arreter "base locale arrêtée : lancer npx supabase start (ou db start)."
  [ "$(printf '%s\n' "$noms" | wc -l)" -eq 1 ] ||
    export_arreter "plusieurs bases Supabase locales tournent : n'en garder qu'une."
  echo "$noms"
}

# psql dans le conteneur de la base locale ($1), mot de passe local par défaut de la CLI (pas un
# secret). Sans -i : l'entrée standard n'est pas transmise.
export_psql_local() {
  local base=$1
  shift
  docker exec -e PGPASSWORD=postgres "$base" psql -X -h 127.0.0.1 -p 5432 -U postgres -d postgres "$@"
}
