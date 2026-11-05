# Règles de gestion — Team Roquette

> **Statut :** brouillon de cadrage  
> **Application :** gestion d’équipe Team Roquette  
> **Dernière mise à jour :** 2026-10-20

## 1. Objectif du document

Ce document centralise les règles de gestion de l’application web de gestion de l’équipe **Team Roquette**.

Chaque règle doit être validée avec les parties prenantes avant son implémentation. Une règle validée doit posséder :

- un identifiant unique ;
- une description non ambiguë ;
- les acteurs concernés ;
- les exceptions éventuelles ;
- un ou plusieurs critères d’acceptation vérifiables.

## 2. Périmètre fonctionnel à confirmer

| Domaine | Inclus ? | Notes / décision attendue |
| --- | :---: | --- |
| Gestion des membres | À confirmer | Création, consultation, modification, archivage |
| Gestion des rôles et droits | À confirmer | Administrateur, manager, membre, lecteur… |
| Gestion des équipes ou sous-équipes | À confirmer | Composition et responsables |
| Disponibilités et absences | À confirmer | Saisie, validation, visibilité |
| Planning et affectations | À confirmer | Affectation des membres aux activités |
| Compétences | À confirmer | Référentiel et niveau de maîtrise |
| Notifications | À confirmer | Événements et canaux de notification |
| Historique et traçabilité | À confirmer | Actions à historiser et durée de conservation |

## 3. Glossaire

| Terme | Définition |
| --- | --- |
| Membre | Personne référencée dans l’application et rattachée à Team Roquette. |
| Joueur | Membre de l’équipe pour lequel une fiche joueur et des statistiques sont gérées. |
| Administrateur | Utilisateur disposant des droits d’administration. À préciser. |
| Manager | Utilisateur responsable d’une équipe ou d’un périmètre. À préciser. |
| Archivage | Conservation d’une donnée sans la supprimer définitivement. À préciser. |

## 4. Catalogue des règles

### 4.1 Utilisateurs, rôles et accès

| ID | Règle | Acteurs concernés | Statut | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| RG-ACC-001 | Les fonctions de gestion de l’application sont accessibles au seul administrateur, après authentification par identifiant et mot de passe. L’administrateur peut saisir et gérer les données de l’application, notamment les matchs, les scores et les informations associées. | Administrateur | Validée | Les pages de gestion exigent un identifiant et un mot de passe ; l’administrateur authentifié peut créer ou modifier les données de match et les scores. |
| RG-ACC-002 | L’application ne gère qu’un seul profil authentifié : l’administrateur. Aucun autre compte utilisateur ni rôle de gestion n’est prévu. | Administrateur | Validée | L’application ne propose aucune création de compte ni rôle de gestion autre que celui de l’administrateur. |
| RG-ACC-003 | Seul l’administrateur peut créer ou modifier une fiche joueur. | Administrateur | Validée | La création et la modification d’une fiche joueur sont accessibles uniquement à l’administrateur. |
| RG-ACC-004 | L’application ne gère ni la création, ni la désactivation, ni le remplacement de comptes utilisateurs : seul le compte administrateur existe. | Administrateur | Validée | L’application ne propose aucune fonctionnalité de gestion de comptes utilisateurs. |
| RG-ACC-005 | Les résultats, les classements et les statistiques sont consultables publiquement sans connexion, en lecture seule. Sur ces pages publiques, les joueurs sont identifiés par leur prénom complet et l’initiale de leur nom. | Visiteur public | Validée | Un visiteur non authentifié peut consulter les pages publiques sans modifier de donnée ; aucun nom de famille complet ni fiche joueur n’y est affiché. |
| RG-ACC-006 | Les API publiques ne renvoient que les données nécessaires aux résultats, classements et statistiques publics. Elles renvoient l’identité publique formatée (prénom complet et initiale du nom), jamais le nom de famille complet ni une fiche joueur. | API publique | Validée | La réponse d’une API publique ne contient aucun nom de famille complet de joueur ni aucune information réservée à l’administration. |

### 4.2 Gestion des membres

| ID | Règle à définir | Acteurs concernés | Statut | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| RG-MEM-001 | Définir les informations obligatoires pour créer une fiche membre. | À préciser | À définir | À compléter |
| RG-MEM-002 | Définir les contrôles d’unicité à appliquer à un membre. | À préciser | À définir | À compléter |
| RG-MEM-003 | Définir les champs modifiables et les personnes autorisées à les modifier. | À préciser | À définir | À compléter |
| RG-MEM-004 | Les fiches joueurs ne sont pas archivées. Un joueur retraité reste accessible dans les statistiques de Team Roquette. | À préciser | Validée | L’application ne propose aucune action d’archivage d’un joueur et les statistiques d’un joueur retraité restent consultables. |
| RG-MEM-005 | Un joueur retraité ne fait pas partie de l’effectif de la saison en cours et ne peut pas être sélectionné pour un match. | À préciser | Validée | Un joueur ayant le statut retraité n’apparaît pas parmi les joueurs sélectionnables pour les matchs de la saison en cours. |

#### 4.2.1 Fiche joueur et statistiques

| ID | Règle | Acteurs concernés | Statut | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| RG-JOU-001 | Chaque joueur de Team Roquette possède une fiche contenant son nom, son prénom, son numéro de maillot pour la saison consultée, son nombre de passes décisives, son nombre de buts, son nombre de titres « Man of the Match » (MOM) et son nombre de paiements de l’arbitre. | À préciser | Validée | La fiche d’un joueur affiche et permet d’enregistrer chacun des sept champs définis. |
| RG-JOU-002 | Le numéro de maillot est unique parmi les joueurs de Team Roquette pour une même saison. | À préciser | Validée | L’application refuse l’enregistrement de deux joueurs de Team Roquette ayant le même numéro de maillot dans la même saison. |
| RG-JOU-003 | Le statut global d’un joueur reflète son appartenance à l’effectif actif de la saison la plus récente : `actif` s’il en fait partie et `retraité` s’il en a été retiré ou en est absent. Un nouveau joueur ajouté à la saison la plus récente est actif. | Administrateur | Validée | Le statut actif/retraité correspond à l’appartenance du joueur à l’effectif de la saison la plus récente. |
| RG-JOU-005 | Un joueur retraité n’est pas repris dans l’effectif lors de la création d’une nouvelle saison. Il peut revenir dans l’effectif de la saison la plus récente ; son statut redevient alors actif automatiquement. | Administrateur | Validée | Un joueur retraité de la saison précédente n’est pas copié dans la nouvelle saison. Son ajout à l’effectif de la saison la plus récente le réactive automatiquement. |
| RG-JOU-006 | Pour les données de saisons déjà enregistrées, un joueur actif qui est absent de l’effectif de la saison suivante déjà existante est marqué retraité. Cette régularisation ne modifie pas le comportement actuel de création des nouvelles saisons. | Administrateur | Validée | Un joueur actif présent dans une saison enregistrée mais absent de l’effectif de la saison suivante existante passe au statut retraité. Les joueurs présents dans la saison la plus récente restent actifs tant qu’aucune saison suivante n’est enregistrée. |
| RG-JOU-007 | La liste « Ajouter un joueur existant » de l’administration inclut tous les joueurs retraités. L’ajout d’un joueur retraité à l’effectif de la saison la plus récente le réactive automatiquement. L’ajout ou le retrait d’un joueur dans une saison historique modifie uniquement l’effectif de cette saison, sans changer son statut global. | Administrateur | Validée | Tous les joueurs retraités apparaissent dans la liste des joueurs existants. Un ajout à la saison la plus récente active le joueur ; une modification d’effectif historique ne change pas son statut global. |

| Champ | Libellé affiché | Description |
| --- | --- | --- |
| `nom` | Nom | Nom du joueur. |
| `prenom` | Prénom | Prénom du joueur. |
| `numeroMaillot` | Numéro de maillot | Numéro de maillot porté par le joueur pour la saison concernée. |
| `statut` | Statut | Statut global du joueur : `actif` s’il appartient à l’effectif actif de la saison la plus récente ; `retraité` s’il en a été retiré ou en est absent. |
| `nombrePassesDecisives` | Nombre de passes décisives | Total des passes décisives du joueur. |
| `nombreButs` | Nombre de buts | Total des buts du joueur. |
| `nombreMom` | Nombre de Man of the Match (MOM) | Total de distinctions « Man of the Match » obtenues par le joueur. |
| `nombrePaiementsArbitre` | Nombre de paiements de l’arbitre | Total des paiements de l’arbitre pris en charge par le joueur au cours de la saison, en saison régulière et en coupe. |

### 4.3 Équipes et organisation

#### 4.3.1 Fiche équipe

| ID | Règle | Acteurs concernés | Statut | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| RG-EQP-001 | Une équipe possède un nom d’équipe. | À préciser | Validée | Lors de la création ou de la consultation d’une équipe, son nom d’équipe est enregistré et affiché. |

| Champ | Libellé affiché | Description |
| --- | --- | --- |
| `nomEquipe` | Nom d’équipe | Nom permettant d’identifier l’équipe. |
| `forfaitGeneral` | Forfait général | Indique si l’équipe est déclarée en forfait général. |

| ID | Règle à définir | Acteurs concernés | Statut | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| RG-EQP-002 | L’application gère uniquement les joueurs de Team Roquette. Aucun rattachement, transfert ou changement d’équipe de joueur n’est géré. | À préciser | Validée | Les fiches joueur concernent uniquement Team Roquette et l’application ne propose aucune action de transfert ou de rattachement d’un joueur à une autre équipe. |
| RG-EQP-003 | Définir la désignation et le remplacement d’un responsable d’équipe. | À préciser | À définir | À compléter |
| RG-EQP-004 | Définir les contraintes avant la suppression ou l’archivage d’une équipe. | À préciser | À définir | À compléter |
| RG-EQP-005 | Une équipe peut être déclarée en forfait général. | Administrateur | Validée | L’administrateur peut indiquer qu’une équipe est en forfait général. |
| RG-EQP-006 | Lorsqu’une équipe est déclarée en forfait général en cours de saison, les matchs déjà joués contre Team Roquette sont enregistrés avec un score de 3–0 en faveur de Team Roquette. Ils sont comptés comme des victoires pour Team Roquette. Les statistiques de Team Roquette conservent toutefois les nombres de buts marqués et encaissés réellement enregistrés avant la déclaration du forfait général. Les statistiques de buts déjà attribuées aux joueurs de Team Roquette sont également conservées. Pour les matchs déjà joués contre les autres équipes, le score devient 3–0 en faveur de l’équipe non forfaitaire. | Administrateur | Validée | Après déclaration du forfait général, un match déjà joué contre Team Roquette affiche le score 3–0 et compte comme une victoire, tout en conservant dans les statistiques de Team Roquette ses buts marqués et encaissés initialement saisis, ainsi que les buts individuels des joueurs. |
| RG-EQP-007 | Lorsqu’une équipe est déclarée en forfait général, les matchs à venir contre Team Roquette sont enregistrés avec un score de 3–0 en faveur de Team Roquette. Les trois buts sont attribués au joueur fictif CSC et aucun autre joueur ne possède de but pour ce match. Les matchs à venir contre les autres équipes sont enregistrés avec un score de 3–0 en faveur de l’équipe non forfaitaire. | Administrateur | Validée | Après déclaration du forfait général, chaque match à venir reçoit le score 3–0 prévu ; pour Team Roquette, CSC possède exactement trois buts et aucun autre joueur ne possède de but. |
| RG-EQP-008 | Dans le classement, une équipe déclarée en forfait général obtient automatiquement 0 point, 26 journées effectuées, 0 victoire, 0 match nul, 26 défaites, 26 forfaits, 0 but marqué, 78 buts encaissés et une différence de buts de −78. | À préciser | Validée | Le classement affiche automatiquement les valeurs définies pour l’équipe en forfait général. |

### 4.4 Disponibilités, absences et planning

| ID | Règle à définir | Acteurs concernés | Statut | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| RG-PLN-001 | Définir les types de disponibilité ou d’absence à gérer. | À préciser | À définir | À compléter |
| RG-PLN-002 | Définir les personnes habilitées à saisir et modifier une absence. | À préciser | À définir | À compléter |
| RG-PLN-003 | Définir les règles de validation d’une absence ou d’une indisponibilité. | À préciser | À définir | À compléter |
| RG-PLN-004 | Définir les contrôles en cas de chevauchement d’absence ou d’affectation. | À préciser | À définir | À compléter |
| RG-PLN-005 | Définir la visibilité du planning selon le rôle de l’utilisateur. | À préciser | À définir | À compléter |

### 4.5 Compétences et affectations

| ID | Règle à définir | Acteurs concernés | Statut | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| RG-CMP-001 | Définir le référentiel des compétences et son responsable. | À préciser | À définir | À compléter |
| RG-CMP-002 | Définir qui peut ajouter ou modifier les compétences d’un membre. | À préciser | À définir | À compléter |
| RG-AFF-001 | Définir les conditions nécessaires pour affecter un membre à une activité. | À préciser | À définir | À compléter |
| RG-AFF-002 | Définir les contrôles de capacité ou de disponibilité à l’affectation. | À préciser | À définir | À compléter |

### 4.6 Notifications et traçabilité

| ID | Règle | Acteurs concernés | Statut | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| RG-NOT-001 | Définir les événements qui déclenchent une notification. | À préciser | À définir | À compléter |
| RG-NOT-002 | Définir les destinataires et les canaux de notification. | À préciser | À définir | À compléter |
| RG-TRC-001 | L’application historise les actions de l’administrateur, notamment la gestion des saisons, des joueurs et de leur statut, des équipes et forfaits généraux, ainsi que des matchs, scores et statistiques. | Administrateur | Validée | Chaque action d’administration concernée est consultable dans un historique. |
| RG-TRC-002 | Définir la durée de conservation de l’historique. | À préciser | À définir | À compléter |

### 4.7 Résultats et points

| ID | Règle | Acteurs concernés | Statut | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| RG-RES-001 | Pour un match de saison régulière, les points attribués à l’équipe dépendent du résultat : victoire = 4 points ; match nul = 2 points ; défaite = 1 point ; forfait = 0 point. | À préciser | Validée | Pour chaque résultat de saison régulière enregistré, le total de points attribué correspond exactement au barème défini. |

| Résultat | Points attribués |
| --- | ---: |
| Victoire | 4 |
| Match nul | 2 |
| Défaite | 1 |
| Forfait | 0 |

### 4.8 Calendrier, journées et matchs

| ID | Règle | Acteurs concernés | Statut | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| RG-CAL-001 | Le calendrier d’une saison comprend 26 journées. | À préciser | Validée | Le calendrier de chaque saison comporte exactement 26 journées. |
| RG-CAL-002 | Chaque journée est composée de 7 matchs. | À préciser | Validée | Chaque journée du calendrier comporte exactement 7 matchs. |
| RG-CAL-003 | Lors de la création d’une saison, l’application crée les 26 journées et leurs 7 matchs vides. L’administrateur renseigne ultérieurement les équipes et les scores de ces matchs. | Administrateur | Validée | La création d’une saison génère 26 journées contenant chacune 7 matchs sans équipes ni scores renseignés. |
| RG-MAT-001 | Un match oppose deux équipes et possède un score. | À préciser | Validée | La fiche d’un match identifie deux équipes et permet d’enregistrer un score pour chacune. |
| RG-MAT-002 | Un match possède l’un des statuts suivants : `à venir`, `terminé`, `forfait` ou `annulé`. | Administrateur | Validée | L’administrateur peut définir le statut d’un match parmi les quatre valeurs autorisées. |
| RG-MAT-003 | Un forfait ponctuel est signalé à la fois par le statut `forfait` et par l’attribution automatique du score `0–3` : l’équipe forfaitaire reçoit 0 but et l’équipe adverse reçoit 3 buts. Ce forfait ponctuel est indépendant d’une éventuelle déclaration de forfait général de l’équipe. | Administrateur | Validée | Lorsqu’un administrateur renseigne le statut forfait, l’application enregistre automatiquement le score 0–3 en faveur de l’équipe non forfaitaire, sans nécessiter que l’équipe soit en forfait général. |
| RG-MAT-004 | L’administrateur peut modifier un score déjà renseigné. Les classements concernés sont recalculés à partir du score modifié. | Administrateur | Validée | Après modification d’un score, les statistiques et classements dépendants reflètent le nouveau résultat. |
| RG-MAT-005 | Chaque match possède une date. | Administrateur | Validée | La fiche d’un match permet d’enregistrer et d’afficher sa date. |
| RG-MAT-006 | Dans les listes de matchs, les matchs impliquant Team Roquette sont mis en avant visuellement. | À préciser | Validée | Un utilisateur identifie immédiatement les matchs de Team Roquette dans une liste de matchs grâce à une mise en avant visuelle. |
| RG-MAT-007 | Dans les listes de matchs, la date est affichée en vert si elle correspond à la date du jour, en bleu si elle est future, en jaune si elle est passée, et en rouge si elle est passée et qu’aucun score n’est saisi. La règle rouge est prioritaire sur la règle jaune. | À préciser | Validée | La couleur de chaque date de match respecte la comparaison avec la date du jour et le statut de saisie du score. |
| RG-MAT-008 | Dans la gestion administrative des matchs, la saison est sélectionnée indépendamment de la carte des journées. Un bouton est proposé pour chaque journée et affiche tous ses matchs. Une journée est verte lorsque tous ses matchs ont un score, grise lorsque tous ses matchs sont `à venir`, jaune lorsqu’elle n’est pas complète mais comporte au moins un match `terminé` ou `forfait`, et neutre pour les autres situations. Une légende explicite ces couleurs. | Administrateur | Validée | Le changement de saison et la sélection d’une journée sont séparés. Chaque bouton de journée ouvre les matchs correspondants et sa couleur respecte les critères ; une légende est affichée sous les boutons. |
| RG-MAT-009 | Toutes les dates affichées dans l’interface utilisent le format français `dd/mm/yyyy`. Lorsqu’une heure est également affichée, elle apparaît après la date. | Visiteur public | Validée | Les dates des matchs, les dates des fiches administratives et celles de l’historique des actions affichent jour/mois/année sur deux chiffres pour le jour et le mois. |

| Entité | Champ | Description |
| --- | --- | --- |
| Journée | `numeroJournee` | Numéro de la journée, de 1 à 26. |
| Match | `equipe1` | Première équipe opposée lors du match. |
| Match | `equipe2` | Seconde équipe opposée lors du match. |
| Match | `scoreEquipe1` | Score de la première équipe. |
| Match | `scoreEquipe2` | Score de la seconde équipe. |
| Match | `dateMatch` | Date à laquelle le match se déroule. |

#### 4.8.1 Gestion des joueurs par match

| ID | Règle | Acteurs concernés | Statut | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| RG-JMA-001 | Pour chaque match, l’application permet de gérer la participation de chaque joueur de Team Roquette : présence, nombre de buts marqués, nombre de passes décisives, paiement de l’arbitre et statut Homme du Match (MOM). | À préciser | Validée | Pour un joueur et un match donnés, les cinq informations définies peuvent être enregistrées et consultées. Dans la liste de saisie, les joueurs présents sont affichés avant les joueurs absents et CSC reste en dernière position. |
| RG-JMA-002 | Le total des buts individuels renseignés pour les joueurs de Team Roquette n’a pas à correspondre au score de Team Roquette dans le match. | Administrateur | Validée | L’application autorise l’enregistrement de statistiques individuelles de buts, même si leur total diffère du score de Team Roquette. |
| RG-JMA-003 | Une passe décisive ne peut être renseignée que pour un joueur déclaré présent au match. | Administrateur | Validée | L’application refuse l’enregistrement d’une passe décisive pour un joueur non présent. |
| RG-JMA-004 | Plusieurs joueurs peuvent être désignés Homme du Match (MOM) pour un même match. | Administrateur | Validée | L’application autorise l’attribution du statut MOM à plusieurs joueurs d’un même match. |
| RG-JMA-005 | Les statistiques de joueur peuvent être renseignées pour un match déclaré forfait, mais elles ne peuvent pas être renseignées pour un match annulé. | Administrateur | Validée | La saisie des statistiques de joueur reste possible pour un forfait et est indisponible pour un match annulé. |
| RG-JMA-006 | L’application contient un joueur fictif nommé `CSC`. Lorsqu’un but contre son camp est marqué par l’équipe adverse en faveur de Team Roquette, ce but est attribué au joueur fictif CSC afin d’être comptabilisé dans les buts. CSC est disponible dans la saisie des buts de tous les matchs de Team Roquette, en saison régulière comme en coupe. CSC n’apparaît ni dans le classement des joueurs ni dans les vues de statistiques des joueurs. | Administrateur | Validée | Lors de la saisie des buts d’un match, l’administrateur peut sélectionner CSC. Le but est comptabilisé dans les statistiques de buts sans afficher CSC dans les classements ou statistiques de joueurs. |
| RG-JMA-007 | Les statistiques calculées des joueurs utilisent uniquement les matchs dont le statut est différent de `à venir` et `annulé`. Les matchs terminés et forfaits sont inclus. | Visiteur public | Validée | Les présences, buts, passes, MOM, paiements d’arbitre et indicateurs calculés excluent tous les matchs à venir ou annulés. |
| RG-ARB-001 | Pour un match de saison régulière ou de coupe, le paiement de l’arbitre est attribué parmi les joueurs de Team Roquette déclarés présents. Les joueurs qui n’ont encore pris en charge aucun paiement de l’arbitre au cours de la saison, en saison régulière comme en coupe, sont prioritaires. La prise en charge reste répartie entre les joueurs, avec l’objectif que chacun paie une à deux fois pendant la saison lorsque cela est possible. | À préciser | Validée | Le joueur associé au paiement de l’arbitre est déclaré présent au match. Les joueurs présents sans paiement pris en charge durant la saison, en saison régulière ou en coupe, sont identifiés comme prioritaires. |
| RG-ARB-002 | L’application met en avant les joueurs prioritaires pour le paiement de l’arbitre, en tenant compte des paiements déjà pris en charge en saison régulière et en coupe. L’utilisateur sélectionne ensuite le joueur présent qui prendra en charge ce paiement. | À préciser | Validée | Lors de la gestion d’un match, les joueurs prioritaires sont visuellement identifiables à partir de l’ensemble de leurs paiements de la saison, et l’utilisateur peut sélectionner le joueur payeur parmi les joueurs présents. |

| Entité | Champ | Libellé affiché | Description |
| --- | --- | --- | --- |
| Participation joueur-match | `presence` | Présence | Indique si le joueur est présent pour le match. |
| Participation joueur-match | `nombreButsMarques` | Nombre de buts marqués | Nombre de buts marqués par le joueur lors du match. |
| Participation joueur-match | `nombrePassesDecisives` | Nombre de passes décisives | Nombre de passes décisives réalisées par le joueur lors du match. |
| Participation joueur-match | `paiementArbitre` | Paiement de l’arbitre | Paiement de l’arbitre attribué à un joueur déclaré présent pour le match. |
| Participation joueur-match | `mom` | Homme du Match (MOM) | Indique si le joueur est désigné Homme du Match pour le match. |

### 4.9 Classement des équipes

| ID | Règle | Acteurs concernés | Statut | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| RG-CLS-001 | Le classement présente, pour chaque équipe et pour la saison sélectionnée, son nom, son nombre de points, son nombre de journées effectuées, ses nombres de victoires, de matchs nuls, de défaites et de forfaits, ses buts marqués et encaissés, ainsi que sa différence de buts. | À préciser | Validée | Chaque ligne du classement affiche l’ensemble des indicateurs définis pour une équipe dans la saison sélectionnée. |
| RG-CLS-002 | Le classement est trié par nombre de points décroissant, puis par différence de buts décroissante, puis par nombre de buts marqués décroissant. En cas d’égalité sur ces trois critères, les équipes sont triées par ordre alphabétique de leur nom. | À préciser | Validée | L’ordre des équipes respecte successivement les quatre critères de tri définis. |
| RG-CLS-003 | Un match annulé est totalement exclu du calcul du classement. | À préciser | Validée | Un match au statut annulé ne modifie aucun indicateur du classement des équipes. |

| Champ | Libellé affiché | Description |
| --- | --- | --- |
| `nomEquipe` | Nom d’équipe | Nom de l’équipe classée. |
| `nombrePoints` | Nombre de points | Total des points de l’équipe en saison régulière. |
| `nombreJourneesEffectuees` | Nombre de journées effectuées | Nombre de journées prises en compte pour l’équipe. |
| `nombreVictoires` | Nombre de victoires | Total des victoires de l’équipe. |
| `nombreNuls` | Nombre de matchs nuls | Total des matchs nuls de l’équipe. |
| `nombreDefaites` | Nombre de défaites | Total des défaites de l’équipe. |
| `nombreForfaits` | Nombre de forfaits | Total des forfaits de l’équipe. |
| `nombreButsMarques` | Nombre de buts marqués | Total des buts marqués par l’équipe. |
| `nombreButsEncaisses` | Nombre de buts encaissés | Total des buts encaissés par l’équipe. |
| `differenceButs` | Différence de buts | Différence entre les buts marqués et les buts encaissés. |

### 4.10 Classement des joueurs

| ID | Règle | Acteurs concernés | Statut | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| RG-CLJ-001 | Une page de classement dédiée exclusivement aux joueurs de Team Roquette affiche, pour la saison sélectionnée et pour chaque joueur, son identité, son nombre de présences, son nombre de buts marqués, sa moyenne de buts par match, son nombre de passes décisives, sa moyenne de passes décisives par match, son nombre de titres Homme du Match (MOM), son pourcentage de victoires par présence et son pourcentage de présence sur l’ensemble des matchs de Team Roquette. Les statistiques du classement agrègent les matchs de saison régulière et les matchs de coupe, dont le statut est différent de `à venir` et `annulé`. | À préciser | Validée | La page ne présente que les joueurs de Team Roquette, pour la saison sélectionnée. Chaque indicateur est calculé à partir des matchs de saison régulière et de coupe dont le statut n’est ni `à venir` ni `annulé`. |
| RG-CLJ-002 | Le classement des joueurs est trié par nombre de buts marqués décroissant, puis par nombre de passes décisives décroissant, puis par nombre de MOM décroissant, puis par nombre de présences décroissant. | À préciser | Validée | L’ordre des joueurs respecte successivement les quatre critères de tri définis. |
| RG-CLJ-003 | Le classement des joueurs affiche uniquement les joueurs dont le statut actuel est actif et qui font partie de l’effectif actif de la saison sélectionnée. Tout joueur retraité ou retiré de l’effectif de cette saison est exclu, y compris pour sa dernière saison d’appartenance à l’effectif. | Visiteur public | Validée | Le classement d’une saison ne contient aucun joueur retraité ni aucun joueur inactif dans l’effectif de cette saison ; seuls les joueurs actifs dans les deux contextes sont affichés. |
| RG-CLJ-004 | Le numéro de maillot n’est pas affiché dans le classement des joueurs. | À préciser | Validée | Aucune colonne ni information de numéro de maillot n’est affichée dans le classement des joueurs. |

| Champ | Libellé affiché | Description |
| --- | --- | --- |
| `joueur` | Joueur | Prénom complet et initiale du nom sur les pages publiques ; nom et prénom complets dans les pages de gestion réservées à l’administrateur. |
| `nombrePresences` | Nombre de présences | Total des matchs de saison régulière et de coupe pour lesquels le joueur est indiqué présent. |
| `nombreButsMarques` | Nombre de buts marqués | Total des buts marqués par le joueur en saison régulière et en coupe. |
| `moyenneButsParMatch` | Moyenne de buts par match | Nombre total de buts marqués en saison régulière et en coupe, divisé par le nombre de présences du joueur. |
| `nombrePassesDecisives` | Nombre de passes décisives | Total des passes décisives réalisées par le joueur en saison régulière et en coupe. |
| `moyennePassesDecisivesParMatch` | Moyenne de passes décisives par match | Nombre total de passes décisives en saison régulière et en coupe, divisé par le nombre de présences du joueur. |
| `nombreMom` | Nombre de MOM | Total des titres Homme du Match obtenus par le joueur en saison régulière et en coupe. |
| `pourcentageVictoiresParPresence` | Pourcentage de victoires par présence | Nombre de victoires en saison régulière et en coupe lors des matchs où le joueur est présent, divisé par le nombre de présences du joueur, puis multiplié par 100 et arrondi à l’entier le plus proche. |
| `pourcentagePresence` | Pourcentage de présence | Nombre de présences du joueur en saison régulière et en coupe, divisé par le nombre total de matchs de Team Roquette dont le statut est différent de `à venir` et `annulé`, puis multiplié par 100 et arrondi à l’entier le plus proche. |

### 4.11 Gestion par saison

| ID | Règle | Acteurs concernés | Statut | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| RG-SAI-001 | L’application gère les données par saison. Une saison regroupe son calendrier, ses journées, ses matchs, les participations des joueurs, les statistiques, les classements et le suivi des paiements de l’arbitre. | À préciser | Validée | Chaque donnée de calendrier, de match, de participation, de classement ou de paiement de l’arbitre est associée à une saison. |
| RG-SAI-002 | L’utilisateur sélectionne la saison à consulter ou à gérer. Les données affichées et calculées sont limitées à la saison sélectionnée. | À préciser | Validée | Après sélection d’une saison, les calendriers, statistiques et classements affichés ne contiennent que les données de cette saison. |
| RG-SAI-003 | Une saison est identifiée par un libellé au format `AAAA-AAAA` (par exemple `2025-2026`) et possède une seule division, saisie sous la forme d’un nom libre. | Administrateur | Validée | La fiche saison contient un libellé au format `AAAA-AAAA` et un unique champ de division en texte libre. |
| RG-SAI-004 | Seul l’administrateur peut créer ou modifier une saison, y compris après son démarrage. Aucune clôture ni aucun archivage de saison n’est géré. | Administrateur | Validée | L’administrateur peut modifier une saison démarrée ; l’application ne propose aucune action de clôture ou d’archivage de saison. |
| RG-SAI-005 | Lors de la création d’une nouvelle saison, la liste des joueurs actifs de Team Roquette de la saison précédente est recopiée. Les joueurs retraités ne sont pas repris, mais peuvent être réintégrés en cours de saison lorsqu’ils redeviennent actifs. Le numéro de maillot peut être modifié pour la nouvelle saison. | Administrateur | Validée | Une nouvelle saison créée à partir d’une saison précédente contient les mêmes joueurs actifs ; les joueurs retraités ne sont pas copiés et peuvent être ajoutés ultérieurement après réactivation. Les numéros de maillot peuvent être modifiés sans modifier ceux de la saison précédente. |

| Entité | Champ | Description |
| --- | --- | --- |
| Donnée métier | `saison` | Saison à laquelle la donnée est rattachée. |
| Saison | `libelleSaison` | Libellé de la saison, au format `AAAA-AAAA`. |
| Saison | `division` | Nom libre de l’unique division de la saison. |

### 4.12 Gestion de la coupe

| ID | Règle | Acteurs concernés | Statut | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| RG-CPE-001 | L’application propose une vue dédiée à la gestion des matchs de coupe de la saison sélectionnée. L’administrateur peut y ajouter des matchs de coupe. | Administrateur | Validée | L’utilisateur peut consulter les matchs de coupe séparément des matchs de saison régulière, et l’administrateur peut y ajouter un match. |
| RG-CPE-002 | Un match de coupe est géré de la même manière qu’un match de saison régulière : équipes, scores, statuts de match et participation des joueurs de Team Roquette (présence, nombre de buts marqués, nombre de passes décisives, paiement de l’arbitre et statut Homme du Match (MOM)). | À préciser | Validée | La fiche d’un match de coupe permet d’enregistrer et de consulter les informations de match et de participation prévues pour un match de saison régulière, selon les règles RG-JMA-001, RG-ARB-001 et RG-ARB-002. |
| RG-CPE-003 | Lors de l’ajout d’un match de coupe, l’administrateur saisit le nom de l’équipe adverse et la phase du match sous forme de texte libre. | Administrateur | Validée | La fiche d’un match de coupe contient un nom d’équipe adverse et une phase de coupe renseignables librement. |

| Entité | Champ | Description |
| --- | --- | --- |
| Match | `typeMatch` | Type du match : saison régulière ou coupe. |
| Match | `statutMatch` | Statut du match : `à venir`, `terminé`, `forfait` ou `annulé`. |
| Match de coupe | `nomEquipeAdverse` | Nom libre de l’équipe adverse. |
| Match de coupe | `phaseCoupe` | Phase du match de coupe, saisie sous forme de texte libre. |

### 4.13 Statistiques des joueurs sur plusieurs saisons

| ID | Règle | Acteurs concernés | Statut | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| RG-STA-001 | L’application propose une vue de statistiques dédiée exclusivement aux joueurs de Team Roquette sur plusieurs saisons. | À préciser | Validée | La vue ne présente que les données des joueurs de Team Roquette. |
| RG-STA-002 | La vue de statistiques agrège automatiquement les données de toutes les saisons disponibles pour les joueurs de Team Roquette, sans sélection de saison. Les données de saison régulière et de coupe sont cumulées uniquement pour les matchs dont le statut est différent de `à venir` et `annulé`. | À préciser | Validée | Les statistiques affichées cumulent les données de saison régulière et de coupe de toutes les saisons, sans sélection de saison nécessaire, en excluant les matchs à venir et annulés. |
| RG-STA-003 | La vue de statistiques comporte un graphique en histogramme. L’axe des abscisses affiche le prénom complet et l’initiale du nom des joueurs sur la page publique. L’axe des ordonnées de gauche affiche le nombre de buts, de passes décisives et de titres Homme du Match (MOM). L’axe des ordonnées de droite affiche le nombre de présences. Les séries sont colorées ainsi : buts en bleu, passes en rouge, MOM en vert et présences en jaune. La valeur numérique est affichée au-dessus de chaque colonne. | À préciser | Validée | Chaque graphique public affiche le prénom et l’initiale de chaque joueur, ses valeurs cumulées de buts, de passes et de MOM sur l’axe gauche, ses présences sur l’axe droit, avec les couleurs prescrites : bleu, rouge, vert et jaune respectivement. Chaque colonne affiche sa valeur numérique au-dessus de la barre. |
| RG-STA-004 | La vue affiche un tableau détaillé des statistiques cumulées sur toutes les saisons : présences, buts, moyenne de buts, passes décisives, moyenne de passes, MOM, pourcentage de victoires par présence et pourcentage de présence. | À préciser | Validée | Le tableau présente tous les indicateurs définis pour chaque joueur de Team Roquette. |
| RG-STA-005 | Le tableau et l’histogramme sont triés comme le classement saisonnier des joueurs : buts décroissants, passes décisives décroissantes, MOM décroissants, puis présences décroissantes. | À préciser | Validée | L’ordre des joueurs respecte les quatre critères de tri définis. |
| RG-STA-006 | La vue de statistiques multi-saisons sépare les joueurs selon leur statut actuel (`actif` ou `retraité`). Pour chacune des deux catégories, elle présente un tableau détaillé et un histogramme dédiés. | Visiteur public | Validée | La vue présente un tableau et un histogramme pour les joueurs actifs, ainsi qu’un tableau et un histogramme distincts pour les joueurs retraités ; chaque joueur apparaît uniquement dans la catégorie correspondant à son statut. |

| Champ | Libellé affiché | Description |
| --- | --- | --- |
| `joueur` | Joueur | Prénom complet et initiale du nom sur les pages publiques ; nom et prénom complets dans les pages de gestion réservées à l’administrateur. |
| `nombrePresences` | Nombre de présences | Total des présences en saison régulière et en coupe sur toutes les saisons. |
| `nombreButsMarques` | Nombre de buts marqués | Total des buts marqués en saison régulière et en coupe sur toutes les saisons. |
| `moyenneButsParMatch` | Moyenne de buts par match | Total des buts marqués sur toutes les saisons, divisé par le nombre de présences du joueur. |
| `nombrePassesDecisives` | Nombre de passes décisives | Total des passes décisives en saison régulière et en coupe sur toutes les saisons. |
| `moyennePassesDecisivesParMatch` | Moyenne de passes décisives par match | Total des passes décisives sur toutes les saisons, divisé par le nombre de présences du joueur. |
| `nombreMom` | Nombre de MOM | Total des titres Homme du Match sur toutes les saisons. |
| `pourcentageVictoiresParPresence` | Pourcentage de victoires par présence | Nombre de victoires en saison régulière et en coupe lors des présences, divisé par le nombre de présences, multiplié par 100 et arrondi à l’entier le plus proche. |
| `pourcentagePresence` | Pourcentage de présence | Nombre de présences divisé par le nombre total de matchs de Team Roquette au statut différent de `à venir` et `annulé`, en saison régulière et en coupe sur toutes les saisons, multiplié par 100 et arrondi à l’entier le plus proche. |

### 4.14 Statistiques de Team Roquette

| ID | Règle | Acteurs concernés | Statut | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| RG-STE-001 | L’application propose une page de statistiques dédiée à Team Roquette, présentant son évolution au fil des saisons dans les divisions. | À préciser | Validée | La page affiche les saisons disponibles de Team Roquette et la division associée à chacune. |
| RG-STE-002 | Pour chaque saison, la page de statistiques de Team Roquette affiche le nombre de matchs, le nombre de buts marqués, le nombre de buts encaissés et le nombre de points. Les nombres de matchs, de buts marqués et de buts encaissés cumulent les matchs de saison régulière et les matchs de coupe. Les matchs au statut `à venir` et les matchs annulés sont considérés comme inexistants et exclus de tous les calculs de cette page. Lorsque les données de saison régulière permettent de déterminer le classement, la page indique également le rang de Team Roquette pour la saison. La mention technique « bilan agrégé » n’est pas affichée à côté du nom de la saison. | À préciser | Validée | Chaque saison affichée présente les quatre indicateurs définis. Les matchs et les buts de saison régulière et de coupe sont inclus dans les statistiques ; les matchs au statut `à venir` et les matchs annulés sont exclus. Le nombre de points applique le barème de la règle RG-RES-001. Le rang de Team Roquette est affiché lorsqu’il peut être calculé à partir des résultats disponibles de la saison régulière ; sinon, aucune position n’est indiquée. Le libellé technique « bilan agrégé » n’apparaît pas dans le bilan. |
| RG-STE-003 | La page affiche des graphiques par saison pour le nombre de points, ainsi que pour les buts marqués et les buts encaissés. La valeur numérique est affichée au-dessus de chaque colonne. | À préciser | Validée | Les graphiques permettent de consulter, pour chaque saison, les points, les buts marqués et les buts encaissés de Team Roquette ; la valeur de chaque colonne est affichée au-dessus de celle-ci. |
| RG-STE-004 | La page affiche un total cumulé sur toutes les saisons, ainsi qu’un rappel du top 3 des buteurs et du top 3 des passeurs de tous les temps parmi les joueurs de Team Roquette, hors joueur fictif CSC. Sur la page publique, chaque joueur est identifié par son prénom complet et l’initiale de son nom. | À préciser | Validée | La page présente le total cumulé et deux listes distinctes comportant jusqu’à trois joueurs chacune : les buteurs sont triés par nombre total de buts décroissant et les passeurs par nombre total de passes décisives décroissant. CSC est exclu et les identités publiques sont limitées au prénom complet et à l’initiale du nom. |
| RG-STE-005 | La page affiche un graphique en histogramme des victoires, matchs nuls, défaites et forfaits par saison : victoires en vert, matchs nuls en jaune, défaites en rouge et forfaits en noir. La valeur numérique est affichée au-dessus de chaque colonne. | À préciser | Validée | L’histogramme affiche, pour chaque saison, les valeurs V, N, D et F avec les couleurs définies et la valeur numérique au-dessus de chaque colonne. |
| RG-STE-006 | Les matchs liés à un forfait général sont traités spécifiquement dans les statistiques de Team Roquette. Un match déjà joué avant la déclaration du forfait général est inclus avec ses buts marqués et encaissés initialement saisis, mais compte comme une victoire de Team Roquette. Un match enregistré au statut `forfait` à la suite d’un forfait général, automatiquement fixé à 3–0, est inclus uniquement lorsque CSC est crédité d’exactement trois buts et qu’aucun autre joueur n’a de but dans le match. | À préciser | Validée | La page conserve les buts initiaux et compte une victoire pour un match déjà joué avant le forfait général ; elle inclut un match au statut `forfait` lié à un forfait général seulement si CSC possède trois buts et tous les autres joueurs zéro but. |
| RG-STE-007 | Un match au statut `forfait` qui n’est pas lié à un forfait général est pris en compte normalement dans les statistiques de Team Roquette, selon son score 0–3 et les statistiques de joueurs saisies. | À préciser | Validée | Un forfait ponctuel est inclus dans les statistiques de Team Roquette sans exiger l’attribution de trois buts à CSC. |
| RG-STE-008 | La page affiche une carte listant, toutes saisons confondues, les joueurs actifs et retraités de Team Roquette (hors CSC) dont le total de présences en saison régulière et en coupe est strictement supérieur à 100. Pour chaque joueur, elle présente son prénom complet, l’initiale du nom et son nombre de présences. La liste est triée par présences décroissantes, puis par nom et prénom. | Visiteur public | Validée | La carte affiche tous les joueurs ayant plus de 100 présences, quel que soit leur statut actuel, avec leur identité publique et leur total. |
| RG-STE-009 | Dans la ligne des totaux du bilan par saison, les points affichés correspondent à la moyenne arithmétique des points de toutes les saisons présentées ; les autres indicateurs restent cumulés. | Visiteur public | Validée | La valeur de la colonne « Points rég. » de la ligne des totaux est la somme des points par saison divisée par le nombre de saisons affichées ; les autres colonnes de cette ligne conservent leur total cumulé. |

| Champ | Libellé affiché | Description |
| --- | --- | --- |
| `saison` | Saison | Saison concernée par les statistiques. |
| `division` | Division | Division dans laquelle Team Roquette évolue pendant la saison. |
| `classement` | Classement | Rang de Team Roquette dans le classement de la saison régulière lorsque les résultats disponibles permettent de le calculer. |
| `nombreMatchs` | Nombre de matchs | Total des matchs de saison régulière et de coupe dont le statut n’est ni `à venir` ni `annulé`, pris en compte pour la saison. |
| `nombreButsMarques` | Nombre de buts marqués | Total des buts marqués par Team Roquette en saison régulière et en coupe pendant la saison, hors matchs au statut `à venir` ou `annulé`. |
| `nombreButsEncaisses` | Nombre de buts encaissés | Total des buts encaissés par Team Roquette en saison régulière et en coupe pendant la saison, hors matchs au statut `à venir` ou `annulé`. |
| `nombrePoints` | Nombre de points | Total des points de Team Roquette en saison régulière pendant la saison, selon le barème défini. Les points de coupe ne sont pas inclus en V1. |
| `moyennePoints` | Moyenne de points | Moyenne arithmétique des points par saison, affichée dans la ligne des totaux à la place de leur somme. |
| `nombreVictoires` | Victoires (V) | Total des victoires de Team Roquette pendant la saison. |
| `nombreNuls` | Matchs nuls (N) | Total des matchs nuls de Team Roquette pendant la saison. |
| `nombreDefaites` | Défaites (D) | Total des défaites de Team Roquette pendant la saison. |
| `nombreForfaits` | Forfaits (F) | Total des forfaits de Team Roquette pendant la saison. |

## 5. Contraintes transverses à confirmer

| Sujet | Question à trancher | Décision |
| --- | --- | --- |
| Données personnelles | Les pages publiques affichent les joueurs par leur prénom complet et l’initiale de leur nom ; les noms de famille complets et les fiches joueurs sont réservés à l’administrateur. | Affichage public limité au prénom et à l’initiale du nom |
| Sécurité | L’accès de gestion est réservé au compte administrateur via identifiant et mot de passe. Les règles de robustesse du mot de passe restent à définir. | Authentification par identifiant et mot de passe |
| Suppression des données | La suppression définitive est-elle autorisée, et sous quelles conditions ? | À compléter |
| Export | Quels rôles peuvent exporter les données, sous quel format ? | À compléter |
| Audit | Les actions de l’administrateur sont historisées ; la durée de conservation reste à définir. | Historisation validée |

## 6. Décisions ouvertes

| ID | Question | Responsable de décision | Échéance | Décision |
| --- | --- | --- | --- | --- |
| DO-001 | Définir les rôles utilisateurs et leurs permissions. | À préciser | 2026-03-10 | Décision prise : seul l’administrateur authentifié gère les données ; les visiteurs publics consultent sans connexion les résultats, classements et statistiques avec les joueurs affichés par leur prénom complet et l’initiale du nom. |
| DO-002 | Confirmer les domaines fonctionnels inclus dans la première version. | À préciser | 2026-03-10 | Décision prise : la V1 inclut les fonctionnalités 1 à 6 et 9. Les statistiques multi-saisons des joueurs et les statistiques de Team Roquette sont hors V1 et constituent le périmètre V2. |
| DO-007 | Définir si les matchs de coupe sont inclus dans les nombres de matchs, de buts marqués et de buts encaissés de la page de statistiques de Team Roquette. | À préciser | 2026-03-10 | Décision prise : les matchs de coupe sont inclus. |
| DO-008 | Définir le score automatique attribué à chaque équipe lorsqu’un match est déclaré forfait. | À préciser | 2026-03-10 | Décision prise : score 0–3, en faveur de l’équipe non forfaitaire. |
| DO-009 | Définir si le joueur fictif CSC est affiché dans le classement et les statistiques des joueurs. | À préciser | 2026-03-10 | Décision prise : CSC n’est pas affiché dans les classements ni les statistiques de joueurs. |
| DO-010 | Définir les conséquences d’un forfait général sur les matchs passés et à venir, ainsi que sur le classement. | À préciser | 2026-03-10 | Décision prise : score 3–0 en faveur de l’équipe non forfaitaire ; conservation des buts déjà saisis pour Team Roquette ; 3 buts attribués à CSC pour les matchs à venir de Team Roquette ; classement de l’équipe forfaitaire fixé à 0 point, 0 but marqué, 78 buts encaissés et −78 de différence. |
| DO-006 | Définir les indicateurs et les formules de calcul à afficher dans la vue de statistiques multi-saisons des joueurs. | À préciser | 2026-03-10 | Décision prise : tableau détaillé, histogramme, cumul de toutes les saisons et des matchs de saison régulière/coupe ; indicateurs et tri identiques au classement saisonnier des joueurs. |

## 7. Validation

| Version | Date | Validé par | Commentaire |
| --- | --- | --- | --- |
| 5.2 | 2026-10-20 | À préciser | Exclusion des joueurs retraités du classement saisonnier des joueurs |
| 5.3 | 2026-10-20 | À préciser | Tableaux et histogrammes distincts pour les joueurs actifs et retraités |
| 5.4 | 2026-10-20 | À préciser | Top 3 toutes saisons des buteurs et passeurs dans les statistiques équipe |
| 5.5 | 2026-10-20 | À préciser | Régularisation du statut retraité dans les données de saisons existantes |
| 5.6 | 2026-10-20 | À préciser | Couleurs des séries des graphiques de statistiques joueurs |
| 5.7 | 2026-10-20 | À préciser | Valeur numérique affichée au-dessus de chaque colonne des histogrammes |
| 5.8 | 2026-10-20 | À préciser | Exclusion des matchs au statut à venir du bilan par saison |
| 5.9 | 2026-10-20 | À préciser | Carte des joueurs dépassant 100 présences dans les statistiques équipe |
| 5.10 | 2026-10-20 | À préciser | Rang par saison et moyenne des points dans la ligne des totaux |
| 5.11 | 2026-10-20 | À préciser | Retrait du libellé « bilan agrégé » dans le bilan par saison |
| 5.12 | 2026-10-20 | À préciser | Retour des joueurs retraités dans l’effectif depuis la liste des joueurs existants |
| 5.13 | 2026-10-20 | À préciser | Classement limité aux joueurs actifs dans l’effectif de la saison sélectionnée |
| 5.14 | 2026-10-20 | À préciser | Exclusion des matchs à venir et annulés des statistiques joueurs |
| 5.15 | 2026-10-20 | À préciser | Joueurs présents affichés en tête de la saisie des statistiques de match, CSC en dernier |
| 5.16 | 2026-10-20 | À préciser | Sélecteur de journées par boutons avec couleurs de statut et légende en gestion des matchs |
| 5.17 | 2026-10-20 | À préciser | Affichage uniforme des dates au format français `dd/mm/yyyy` |

## 8. Évolutions prévues après la V1

### V2 — Historique des joueurs et statistiques pluri-saisons

> Le périmètre V2 comprend également les exigences RG-STA-001 à RG-STA-006 (statistiques des joueurs toutes saisons, avec tableaux et histogrammes séparés pour les joueurs actifs et retraités) et RG-STE-001 à RG-STE-009 (statistiques historiques de Team Roquette), décrites aux sections 4.13 et 4.14.

| ID | Règle | Statut | Critères d’acceptation |
| --- | --- | --- | --- |
| EV-V2-001 | La V2 propose une vue regroupant tous les joueurs ayant fait partie de Team Roquette, qu’ils soient actifs ou retraités. | Implémentée | La vue affiche tous les joueurs actuels et retraités de Team Roquette. |
| EV-V2-002 | Depuis cette vue, l’utilisateur peut consulter la fiche de chaque joueur. | Implémentée | La sélection d’un joueur ouvre sa fiche. |
| EV-POST-001 | Après la V1, pour une saison qui sera précisée lors de l’alimentation des données, les points des matchs de coupe pourront être calculés et affichés selon le barème défini. | Hors V1 — à préciser | La fonctionnalité est mise en œuvre uniquement pour la saison concernée, après confirmation des données à alimenter. |
