# Team Roquette

Application web de gestion sportive, en développement.

## Socle technique provisoire

Le choix Next.js/React/SQLite ci-dessous est un choix de démarrage de l’implémentation, pas une validation explicite de la pile technologique par l’utilisateur.

- **Next.js + React** pour une application serveur unique.
- **SQLite intégré à Node.js 24** pour limiter les frais d’hébergement et éviter un service de base de données distinct. À déployer sur un VPS unique avec un volume persistant et des sauvegardes régulières.
- Pages publiques en lecture seule ; aucun nom/prénom complet n’est fourni aux pages ou API publiques.
- Un seul compte administrateur, configuré par variables d’environnement. Aucun compte par défaut n’est fourni.
- L’administration journalise les opérations métier. Les secrets et mots de passe ne sont jamais journalisés.
- Les tentatives de connexion sont limitées temporairement en mémoire par IP ; en production, le serveur Node doit rester derrière un reverse proxy qui fixe les en-têtes client et ne doit pas être exposé directement.

SQLite utilise ici l’API intégrée `node:sqlite` de Node 24. L’avertissement de disponibilité expérimentale peut s’afficher. Si le déploiement cible un runtime incompatible, il faudra basculer vers PostgreSQL plutôt que désactiver les vérifications de sécurité.

## Prérequis

- Node.js 24+
- npm

## Installation locale

```powershell
Copy-Item .env.example .env.local
npm install
npm run admin:hash-password
```

Copier la ligne `ADMIN_PASSWORD_HASH=...` produite par la commande dans `.env.local`, puis remplir `ADMIN_USERNAME`. Ne pas committer `.env.local`. Les sessions sont des jetons aléatoires opaques, stockés uniquement sous forme de hash dans SQLite, et expirent après huit heures.

Démarrer en développement :

```powershell
npm run dev
```

Ouvrir `http://localhost:3000`. L’administration est sous `/admin`.

## Contrôles

```powershell
npm test
npm run build
```

## État du développement

Les fonctionnalités V1 définies dans `docs/regles-gestion-team-roquette.md` sont implémentées : gestion des saisons et des effectifs ; saisie des matchs réguliers ; gestion séparée de la coupe ; saisie des participations, buts, passes, MOM et paiements d’arbitre ; classement des équipes ; classement saisonnier des joueurs ; déclaration des forfaits généraux par saison. Les créations/modifications administratives sont historisées.

L’administration est sous `/admin` : `/admin/joueurs` gère les effectifs, `/admin/matchs` les journées régulières, `/admin/coupes` les matchs de coupe et `/admin/forfaits` les déclarations de forfait général. Depuis un match de Team Roquette, « Saisir les joueurs » ouvre la fiche de participation. La priorité pour le paiement de l’arbitre est calculée sur la saison entière, en combinant saison régulière et coupe.

Les résultats et classements publics sont consultables sans connexion : `/resultats`, `/classement-equipes` et `/classement-joueurs`. Les API correspondantes sont sous `/api/public`. Les joueurs sont affichés par initiales uniquement ; les fiches et identités complètes restent dans l’administration. Les matchs annulés sont exclus des calculs de statistiques. Les scores automatiques et les règles CSC des forfaits généraux sont appliqués lors de la déclaration.

Les statistiques multi-saisons des joueurs (`RG-STA`) et les statistiques multi-saisons de Team Roquette (`RG-STE`) sont hors V1 selon la décision `DO-002`. La déclaration d’un forfait général n’a pas de procédure d’annulation, ce cas n’étant pas défini par les règles actuelles.

Les contrôles locaux incluent `npm test`, `npm run build` et `scripts/smoke-test.ps1` (test d’intégration HTTP avec une base SQLite temporaire).

## Déploiement public prévu

Un petit VPS Linux, une instance Node unique, HTTPS via reverse proxy (Caddy/Nginx) et un répertoire de données persistant pour SQLite. L’administrateur se connecte pour saisir les données ; les résultats, classements et statistiques saisonniers sont consultables sans connexion, avec les joueurs affichés par initiales.
