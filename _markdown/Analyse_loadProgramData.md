# Analyse détaillée de la fonction loadProgramData 

Note de version: Aligné avec l’état du code au 2025-08-06. Les références de champs et les flux reflètent le fonctionnement réel des composants et du data store.

1. Objectif et fonctionnalité

La fonction [`loadProgramData`](components/Dashboard.tsx:238) est au cœur du traitement des données dans le composant Dashboard. Elle est exécutée dans un hook [`useEffect`](components/Dashboard.tsx:158) et construit les jeux de données destinés aux composants graphiques selon deux modes:
- Mode TOUT: agrégation multi-robots (par agence éventuelle) pour [`Chart4All`](components/Chart4All.tsx:60);
- Mode Robot individuel: préparation des données d’un robot unique pour [`Chart`](components/Chart.tsx:51).

Objectifs principaux:
- Charger et préparer les données en fonction des sélections utilisateur (agence, robot, mois);
- Calculer des totaux mensuels pour N, N-1, N-2, N-3;
- Générer un format de données adapté à chaque composant graphique.

2. Schéma des données et conventions — important

2.1 Clé d’identification des entrées
Les entrées de reporting sont identifiées via une clé composite au format:
- AGENCE + "_" + 'NOM_ROBOT'

Exemple d’usage dans le code lorsque l’on filtre des entrées:
- `${entry.AGENCE}_${entry['NOM_ROBOT']}` est comparé à `${selectedRobotData?.agence}_${selectedRobotData?.robot}` dans le cas robot individuel
  Voir les filtres selon le mois dans [`Dashboard.tsx`](components/Dashboard.tsx:356-395).

2.2 Champs utilisés
- Total mensuel: 'NB_UNITES_DEPUIS_DEBUT_DU_MOIS'
- Jours du mois: 'JOUR1' à 'JOUR31'

Remarque:
- Ces champs proviennent du backend SQL et sont mis à disposition dans cachedReportingData via `initializeReportingData` (voir section 4).

2.3 Formats attendus par les composants graphiques
- Chart.tsx (robot individuel): les valeurs journalières lues proviennent des colonnes JOURx du record choisi; l’axe X affiche des dates JJ/MM/AAAA calculées à partir de l’état (mois/année à afficher), mais la donnée source pour la valeur vient bien de JOURx. Voir la construction `chartData` dans [`Chart.tsx`](components/Chart.tsx:93).
- Chart4All.tsx (mode TOUT): le Dashboard agrège des séries journalières sur 31 jours, puis produit un objet fusionné où les clés JJ/MM/AAAA portent les valeurs agrégées (pour l’affichage) et un champ 'NB UNITES DEPUIS DEBUT DU MOIS' totalisé. Voir la logique d’agrégation dans [`Dashboard.tsx`](components/Dashboard.tsx:256-346) puis l’utilisation dans [`Chart4All.tsx`](components/Chart4All.tsx:153-172).

3. Fonctionnement global — étapes clés

3.1 Déclenchement
- Le hook [`useEffect`](components/Dashboard.tsx:158) surveille `selectedRobotData`, `selectedMonth`, `robots`, `selectedAgency`. À chaque changement pertinent, `loadRobotData` reconstruit les données pour l’affichage.

3.2 Sélection du mode
- Mode "TOUT" si `selectedRobotData.robot === 'TOUT'`:
  - Agrégation multi-robots contextualisée par l’agence active (si ≠ TOUT).
  - Calcul d’un tableau 31 jours (somme des JOURx sur l’ensemble des robots retenus).
  - Calcul du total 'NB_UNITES_DEPUIS_DEBUT_DU_MOIS' pour le périmètre.
  - Construction d’un objet merged avec clés JJ/MM/AAAA et injection dans `robotDataForBarChart`, activation `useChart4All=true`. Voir [`Dashboard.tsx`](components/Dashboard.tsx:256-346).

- Mode "Robot individuel" sinon:
  - Sélection d’une entrée unique pour le robot-agence au mois affiché (N, N-1, N-2, N-3).
  - Construction de `processedData` en combinant l’entrée reporting avec le robot sélectionné; lecture de 'NB_UNITES_DEPUIS_DEBUT_DU_MOIS' et des JOURx réels. Voir [`Dashboard.tsx`](components/Dashboard.tsx:349-401).

3.3 Totaux mensuels
- Mode TOUT: totaux calculés par réduction sur les datasets `getReportingData('N'|'N-1'|'N-2'|'N-3')` filtrés par l’ensemble des id_robot des robots affichés (Set pour efficacité). Voir [`Dashboard.tsx`](components/Dashboard.tsx:326-346).
- Mode Robot individuel: totaux extraits directement des entrées correspondantes dans `cachedReportingData.currentMonth`, `prevMonth1`, `prevMonth2`, `prevMonth3`. Voir [`Dashboard.tsx`](components/Dashboard.tsx:388-401).

4. Initialisation des données (dataStore)

4.1 initializeReportingData
- Réalise 4 appels API distincts filtrés par `anneeMois=YYYYMM` (N, N-1, N-2, N-3);
- Gère le cas du 1er jour du mois (bascule sur le mois précédent pour considérer la période comme close);
- Alimente `cachedReportingData` avec:
  - currentMonth, prevMonth1, prevMonth2, prevMonth3: tableaux d’entrées contenant 'AGENCE', 'NOM_ROBOT', 'NB_UNITES_DEPUIS_DEBUT_DU_MOIS', 'JOUR1'..'JOUR31', 'ANNEE_MOIS', etc.;
  - monthLabels: labels FR pour N, N-1, N-2, N-3.

Implications:
- Les composants consomment toujours des sous-listes "normées" avec les champs exposés ci-dessus.
- Le mois affiché dans les graphiques respecte les labels fournis par `cachedReportingData.monthLabels`.

4.2 initializeRobots4Agencies
- Construit une liste `cachedRobots4Agencies` alignée avec les agences présentes dans les données de reporting disponibles (4 mois);
- Permet aux sélecteurs d’agences/robots d’offrir des listes cohérentes et d’éviter l’écran vide après sélection;
- Associé à l’utilisation de `isAgencyInReportingData` pour ne pas activer des agences absentes du périmètre des données. Voir [`AgencySelector.tsx`](components/AgencySelector.tsx:35-45).

5. Gestion des dates d’affichage

5.1 Détermination du mois/année affichés côté Chart/Chart4All
- La logique d’affichage ajuste `displayMonth` et `displayYear` en fonction de `selectedMonth` (N, N-1, …) et du cas "1er jour du mois" (afficher le mois précédent par défaut). Voir les ajustements dans:
  - [`Chart.tsx`](components/Chart.tsx:70-91)
  - [`Chart4All.tsx`](components/Chart4All.tsx:126-148)

5.2 Mode TOUT — format d’export pour Chart4All
- Le Dashboard convertit l’agrégation JOURx → clés JJ/MM/AAAA pour Chart4All;
- Ceci permet un affichage direct des étiquettes datées sur l’axe X.

6. Points d’attention et bonnes pratiques

- Toujours utiliser la clé composite `${AGENCE}_${NOM_ROBOT}` lors des filtres;
- Lire le total via 'NB_UNITES_DEPUIS_DEBUT_DU_MOIS' (pas de variation d’intitulé);
- Pour l’histogramme:
  - Mode robot: lire les colonnes JOURx directement à partir de l’entrée choisie;
  - Mode TOUT: agréger JOURx sur l’ensemble des robots retenus puis convertir en dates JJ/MM/AAAA.
- Les labels de mois (N, N-1, N-2, N-3) proviennent du cache `cachedReportingData.monthLabels`.
- Ne pas confondre NOM_ROBOT (utilisé par le code actuel) avec d’anciennes mentions NOM_PROGRAMME. Toute documentation antérieure citant NOM_PROGRAMME est à considérer comme obsolète.

7. Sections obsolètes (barrées)

- ~Références à 'NOM PROGRAMME' ou 'NOM_PROGRAMME' pour la clé d’identification. Le code actuel utilise 'NOM_ROBOT' pour composer la clé avec AGENCE.~
- ~Accès aux valeurs journalières via des clés de dates dans les données brutes. Pour le robot individuel, les colonnes JOUR1..JOUR31 sont utilisées; les dates JJ/MM/AAAA sont construites pour affichage.~

8. Résumé visuel (flux simplifié)

- Mode TOUT:
  1) Sélection agence/robots → liste filtrée (cachedRobots4Agencies);
  2) getReportingData(N|N-1|N-2|N-3) → filtrage par clés `${AGENCE}_${NOM_ROBOT}`;
  3) Agrégation JOURx sur 31 jours → conversion en JJ/MM/AAAA;
  4) Totaux: somme de 'NB_UNITES_DEPUIS_DEBUT_DU_MOIS' sur le périmètre;
  5) Affichage dans Chart4All avec labels de mois.

- Mode Robot:
  1) Clé unique `${selectedRobotData.agence}_${selectedRobotData.robot}`;
  2) Sélection du record selon `selectedMonth`;
  3) Lecture de JOURx et 'NB_UNITES_DEPUIS_DEBUT_DU_MOIS';
  4) Totaux par mois pris directement des sous-listes;
  5) Affichage dans Chart.

9. Références fichier/ligne (principales)

- Dashboard — Agrégation et sélection du mode:
  - Mode TOUT: [`Dashboard.tsx`](components/Dashboard.tsx:256-346)
  - Mode Robot: [`Dashboard.tsx`](components/Dashboard.tsx:349-401)

- Chart (robot individuel):
  - Construction chartData via JOURx: [`Chart.tsx`](components/Chart.tsx:93)
  - Formatage axe Y (temps): [`Chart.tsx`](components/Chart.tsx:151-156)

- Chart4All (agrégé):
  - Construction chartData via dates JJ/MM/AAAA: [`Chart4All.tsx`](components/Chart4All.tsx:153-172)

- AgencySelector:
  - Désactivation basée sur `isAgencyInReportingData`: [`AgencySelector.tsx`](components/AgencySelector.tsx:35-45)

- Data store:
  - initializeReportingData (4 appels, gestion 1er du mois) et labels: [`utils/dataStore.ts`](utils/dataStore.ts:1)

10. Historique documentaire

- Ce document remplace les anciennes mentions liées à 'NOM PROGRAMME'/'NOM_PROGRAMME' et précise l’usage des colonnes 'JOUR1'..'JOUR31' et de 'NB_UNITES_DEPUIS_DEBUT_DU_MOIS'.
- Il est cohérent avec les modifications confirmées au 2025-08-06 dans l’application.