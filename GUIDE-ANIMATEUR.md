# 🎤 Agent Contenders — Guide de l'animateur (jour J)

Tout pour préparer et animer la session, de la création des agents au tournoi voté en direct.

## Vue d'ensemble — deux briques

1. **Le kit Claude Code** (`kit/`) : ce que les équipes utilisent pour **créer leur agent rappeur** (une vraie personnalité publique) et ce que tu utilises pour **générer les battles** (commande `/battle`).
2. **L'app** (ce repo, déployée sur Railway) : elle **met les battles en musique** (Lyria), les **rejoue avec paroles synchronisées**, et fait **voter le public** (QR). Protégée par SSO Google Workspace.

## Avant la session
- [ ] Un **repo GitHub** contenant le kit : `.claude/agents/` (le template + tes exemples), `.claude/commands/battle.md` (voir « Installer la commande `/battle` » ci-dessous).
- [ ] L'**app déployée** sur Railway et testée (cf. `DEPLOY.md`) : SSO OK, Postgres + volume, `GEMINI_API_KEY`, ton email dans `ADMIN_EMAILS`.
- [ ] Vérifier qu'une battle d'exemple (Ada vs Babbage) s'importe, se génère et se joue.

## Installer la commande `/battle` dans Claude Code

`/battle` n'est **pas** une commande native : c'est une **commande personnalisée** que Claude Code charge depuis un simple fichier Markdown. Le kit la fournit déjà (`kit/commands/battle.md`) — il suffit de la mettre au bon endroit.

1. **Copie le fichier** dans le dossier des commandes, à la racine du repo du tournoi (celui que tu ouvriras dans Claude Code) :
   `kit/commands/battle.md` → `.claude/commands/battle.md`.
   Le **nom du fichier = nom de la commande** : `battle.md` donne `/battle`.
   *(Variante : pour l'avoir dans tous tes projets, copie-le plutôt dans `~/.claude/commands/battle.md`.)*
2. **Ouvre Claude Code à la racine de ce repo** (`claude` dans le terminal, ou « Open folder » dans l'IDE) : les commandes « projet » ne sont chargées que pour le repo courant.
3. **Vérifie** : tape `/` dans Claude Code → `battle` doit apparaître dans la liste (marqué *project*) avec sa description ; `/help` la liste aussi. Si tu as ajouté le fichier alors que Claude Code tournait déjà, **relance la session** pour qu'il le détecte.
4. **Lance-la** : `/battle <rappeur-A> <rappeur-B> [nb-rounds]` (ex. `/battle ada-lovelace charles-babbage`). Elle lit les agents dans `.claude/agents/`, fait rapper chaque subagent à tour de rôle, et écrit le transcript JSON dans `battles/`.

> Même mécanique pour les agents rappeurs : un fichier par agent dans `.claude/agents/` (cf. guide des équipes). Même repo, même dossier `.claude/`.

## Pendant la formation — les équipes créent leur agent
1. Chaque équipe (3-4 pers.) choisit une **vraie personnalité** avec une page Wikipédia fournie.
2. Elle écrit son **subagent** à partir de `kit/TEMPLATE-rappeur.md` (persona, style, sexe + âge pour la voix), dans `.claude/agents/`.
3. Elle le teste dans Claude Code : `@agent-<nom> recherche ton adversaire X et fais ton couplet`.
4. On collecte tous les agents dans le repo.

## Préparer le tournoi
1. Définir le **bracket** (5-6 agents, élimination directe ; têtes de série exemptées si nombre impair).
2. Pour **chaque battle**, dans Claude Code (ouvert sur le repo) :
   `/battle <rappeur-A> <rappeur-B>` → produit le **transcript JSON**.
3. Dans l'app, écran **Admin** de la battle (`/b/<slug>/admin`) :
   - **Importer** le transcript JSON.
   - **Générer l'audio (Lyria)** — fais-le **en amont** (ça prend un moment) ; un segment chanté par rappeur, voix distinctes.

## Le show — déroulé d'une battle
1. **Ouvrir le vote** (bouton admin).
2. Projeter le **player** (`/b/<slug>`) sur grand écran.
3. Afficher le **QR code** (écran admin) : le public le scanne, se connecte (Google Workspace) et vote **A ou B** (modifiable).
4. **Lancer la lecture** : l'audio joue, les **paroles défilent avec le couplet/la ligne en cours surlignés**, round par round.
5. À la fin, **Clôturer (+5 min)** pour laisser un dernier temps de vote.
6. **Annoncer le gagnant** (scores affichés sur le player), puis **Finaliser**.
7. Battle suivante du bracket.

## Conseils & filet de sécurité
- **Génère tous les audios avant** le show ; garde les transcripts JSON sous la main pour régénérer si besoin.
- Utilise **Chrome** pour la projection.
- Garde le ton **bon enfant** : clash factuel sur des faits publics, pas de sujets sensibles.
- Téléchargement des audios possible depuis le player (bouton **⬇ Audio**) — utile pour archiver ou rejouer.

## Liens utiles (par battle)
- Player : `/b/<slug>` · Vote : `/b/<slug>/vote` · Admin : `/b/<slug>/admin`
- Accueil (liste des battles) : `/`
