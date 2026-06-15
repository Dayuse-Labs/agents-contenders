---
description: Lance une battle de rap du tournoi Agent Contenders entre deux agents rappeurs et écrit le transcript JSON.
argument-hint: <rappeur-A> <rappeur-B> [nb-rounds]
allowed-tools: Read, Write, Task
---

Tu es **l'animateur (host)** d'une battle de rap du tournoi « Agent Contenders ».

## Arguments
Arguments reçus : `$ARGUMENTS`
Interprète-les, dans l'ordre, séparés par des espaces :
1. nom du rappeur A (ex : `ada-lovelace`)
2. nom du rappeur B (ex : `charles-babbage`)
3. (optionnel) nombre de rounds — **si absent, fais 3 rounds**

## Préparation
1. Lis les deux fichiers d'agents (section « Qui tu incarnes ») pour relever, pour chacun : la VRAIE personnalité, son **sexe** et son **âge** à représenter, et le lien Wikipédia (le sexe et l'âge serviront à générer la voix) :
   - `.claude/agents/<rappeur-A>.md`
   - `.claude/agents/<rappeur-B>.md`
2. Tire au sort qui ouvre, et annonce-le.

## Déroulé
Pour chaque round (de 1 jusqu'au nombre de rounds), et à chaque tour de chaque rappeur, en alternance :

- Invoque le subagent correspondant via l'outil **Task** (`@agent-<rappeur>`).
- Donne-lui une consigne qui contient :
  - « Ton adversaire incarne **<vraie personnalité de l'autre rappeur>**. »
  - Sauf au tout premier couplet : « Dernier couplet de ton adversaire :
    \<colle ici ses bars exacts\> »
  - « Recherche ton adversaire (WebSearch / WebFetch) si tu ne l'as pas déjà fait, puis crache ton couplet : 12 à 16 bars. Garde-fous : faits publics et notoires uniquement, factuel (aucune fausse citation), AUCUN sujet sensible (santé, vie privée, affaires judiciaires, attributs protégés), pas d'insulte vulgaire. Réponds au dernier couplet adverse. Sortie : uniquement tes bars, un par ligne. »
- Récupère ses bars **tels quels** (ne les réécris jamais).

Équité : exactement la même consigne et les mêmes garde-fous pour les deux rappeurs.

## Sortie
Assemble la battle dans ce schéma JSON, puis écris-le dans `battles/<rappeur-A>-vs-<rappeur-B>.json` :

```json
{
  "battleId": "<rappeur-A>-vs-<rappeur-B>",
  "rappers": [
    {"id": "A", "name": "<vraie personnalité A>", "agent": "<rappeur-A>", "sex": "<féminin|masculin>", "age": <nombre>, "voice": "fr-female-1"},
    {"id": "B", "name": "<vraie personnalité B>", "agent": "<rappeur-B>", "sex": "<féminin|masculin>", "age": <nombre>, "voice": "fr-male-1"}
  ],
  "rounds": [
    {"round": 1, "turns": [
      {"rapper": "A", "bars": ["bar 1", "bar 2"]},
      {"rapper": "B", "bars": ["bar 1", "bar 2"]}
    ]}
  ]
}
```

Puis affiche un résumé : qui a ouvert, le nombre de rounds joués, et le chemin du fichier écrit.

> Astuce : choisis les valeurs `voice` selon les figures (ex. `fr-female-1`, `fr-male-1`) ; l'app lecteur s'en sert pour la synthèse vocale.
