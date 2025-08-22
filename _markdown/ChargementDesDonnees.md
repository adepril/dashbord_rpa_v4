# Analyse Détaillée du Chargement des Données dans 'loadInitialData' — Alignée au code actuel

## Introduction

Ce document présente une analyse détaillée du processus de chargement des données initial dans l'application Dashboard RPA BBL. La fonction `loadInitialData` est un élément central qui orchestre le chargement de toutes les données nécessaires au fonctionnement du tableau de bord. Note d'alignement: ce document a été mis à jour pour refléter l'état actuel du code.

## 1. La fonction loadInitialData dans Dashboard.tsx

### Localisation et contexte
La fonction `loadInitialData` est définie dans le fichier [`components/Dashboard.tsx`](components/Dashboard.tsx:159) à partir de la ligne 159. Elle est appelée dans un `useEffect` qui se déclenche lorsque le composant est monté et qu'un `userId` est disponible.

### Structure et déroulement
```typescript
const loadInitialData = async () => {
  try {
    setIsLoading(true);
    
    // Étape 1: Charger les données de reporting (4 derniers mois)
    await initializeReportingData();
    
    // Étape 2: Charger toutes les agences
    await loadAllAgencies();
    
    // Étape 3: Charger tous les robots
    await loadAllRobots();
    setPrograms(cachedRobotsFromTableBaremeReport);
    
    // Étape 4: Charger les services
    await loadAllServices();
    setAvailableServices(new Set(cachedServices));
    
    // Étape 5: Récupérer et définir les données dans l'état du composant
    const AllAgencies = getCachedAllAgencies();
    setAllAgencies(AllAgencies);
    updateAgencySelectability(userAgenceIds);

    // Définir l'agence par défaut
    const defaultAgency = AllAgencies.find(a => a.isSelectable) ||
                          AllAgencies.find(a => a.codeAgence === 'TOUT') ||
                          AllAgencies[0] ||
                          { codeAgence: 'TOUT', libelleAgence: 'TOUT' };
    setSelectedAgency(defaultAgency);
    setSelectedMonth('N');
    
    // Définir le service par défaut
    setSelectedService('TOUT');
    
  } catch (error) {
    console.error('Erreur lors du chargement des données initiales:', error);
    setError('Erreur lors du chargement des données');
  } finally {
    setIsLoading(false);
  }
};
```

### Variables d'état modifiées
- `setIsLoading(true/false)`: Indicateur de chargement
- `setPrograms(cachedRobots)`: Liste des programmes/robots
- `setAvailableServices(new Set(cachedServices))`: Services disponibles
- `setAgencies(userAgencies)`: Liste des agences
- `setSelectedAgency(defaultAgency)`: Agence sélectionnée par défaut
- `setSelectedService('TOUT')`: Service sélectionné par défaut
- `setError(...)`: Gestion des erreurs

## 2. Fonctions de chargement des données dans dataStore.ts

### loadAllAgencies()
**Fichier**: [`utils/dataStore.ts`](utils/dataStore.ts:105)

**Description**: Charge toutes les agences depuis la table "Agences" dans SQL Server.

**Processus**:
1. Effectue un appel API à `/api/sql?table=Agences`
2. Transforme les données reçues en objets `Agency` avec `codeAgence` et `libelleAgence`
3. Stocke le résultat dans `cachedAllAgencies`
4. Trie les agences par ordre alphabétique

**Variables utilisées**:
- `cachedAllAgencies`: Variable globale qui stocke toutes les agences

### loadAllRobots()
**Fichier**: [`utils/dataStore.ts`](utils/dataStore.ts:185)

**Description**: Charge tous les robots depuis la table "Barem_Reporting" dans SQL Server.

**Processus**:
1. Effectue un appel API à `/api/sql?table=Barem_Reporting`
2. Transforme les données reçues en objets `Program` avec toutes les propriétés nécessaires
3. Filtre explicitement les entrées "TOUT" des données brutes (l'option "TOUT" est gérée côté UI)
4. Stocke le résultat dans `cachedRobotsFromTableBaremeReport`

**Variables utilisées**:
- `cachedRobots`: Variable globale qui stocke tous les robots

### loadAllServices()
**Fichier**: [`utils/dataStore.ts`](utils/dataStore.ts:129)

**Description**: Charge tous les services depuis la table "Services" dans SQL Server.

**Processus**:
1. Effectue un appel API à `/api/sql?table=Services`
2. Extrait uniquement les noms des services
3. Stocke le résultat dans `cachedServices`

**Variables utilisées**:
- `cachedServices`: Variable globale qui stocke tous les services

### initializeReportingData()
**Fichier**: [`utils/dataStore.ts`](utils/dataStore.ts:408)

**Description**: Initialise les données de reporting pour les 4 derniers mois.

**Processus (aligné 2025-08-06)**:
1. Calcule les 4 derniers mois basés sur la date actuelle
2. Gère le cas particulier du 1er jour du mois (ajuste le mois de référence pour l’affichage et les requêtes)
3. Effectue 4 appels API distincts pour récupérer les données de chaque mois (N, N-1, N-2, N-3)
4. Génère les labels de mois en français et les expose via `cachedReportingData.monthLabels`
5. Met à jour `cachedReportingData` avec:
   - `currentMonth`, `prevMonth1`, `prevMonth2`, `prevMonth3` (tableaux) contenant au minimum les champs:
     - `AGENCE`, `NOM_ROBOT` ~`NOM_PROGRAMME`~,
     - `ANNEE_MOIS`,
     - `JOUR1` à `JOUR31`,
     - `NB UNITES DEPUIS DEBUT DU MOIS` (total mensuel)
   - et les labels de mois FR

**Variables utilisées**:
- `cachedReportingData`: Objet global qui stocke les données de reporting pour 4 mois
- `monthLabels`: Labels FR pour N, N-1, N-2, N-3

### Fonctions utilitaires associées
- `getCachedAllAgencies()`: Retourne toutes les agences en cache
- `getReportingData(month)`: Retourne les données de reporting pour un mois spécifique
- `initializeRobots4Agencies()`: Construit la correspondance agences → robots présents dans le reporting (4 mois)
- `isAgencyInReportingData(codeAgence)`: Indique si une agence a des données reporting (utilisé pour désactiver des agences côté UI)

## 3. Fonctions de récupération des données dans dataFetcher.ts

### fetchAllReportingData(month)
**Fichier**: [`utils/dataFetcher.ts`](utils/dataFetcher.ts:196)

**Description**: Récupère les données de reporting pour un mois spécifique via l'API.

**Processus**:
1. Construit l'URL avec le paramètre de mois
2. Effectue un appel API à `/api/sql?table=Reporting&Clef=&AnneeMois=${month}`
3. Retourne les données brutes de la base de données

### fetchAllServices()
**Fichier**: [`utils/dataFetcher.ts`](utils/dataFetcher.ts:218)

**Description**: Récupère tous les services via l'API.

**Processus**:
1. Effectue un appel API à `/api/sql?table=services`
2. Retourne les données brutes des services

## 4. Endpoints API dans app/api/sql/route.ts

### Endpoint GET /api/sql
**Fichier**: [`app/api/sql/route.ts`](app/api/sql/route.ts:18)

**Description**: Endpoint principal pour la récupération des données depuis SQL Server.

**Tables gérées**:
- `Agences`: Récupération des agences
- `Barem_Reporting`: Récupération des robots et programmes
- `Services`: Récupération des services
- `Reporting`: Récupération des données de reporting
- `Statuts`: Gestion des statuts
- `Utilisateurs`: Gestion des utilisateurs
- `Evolutions`: Gestion des évolutions

**Sécurité**:
- Utilisation d'une liste blanche (`ALLOWED_TABLES`) pour prévenir l'injection SQL
- Paramétrisation des requêtes avec des paramètres nommés

### Processus pour chaque table

#### Agences
```sql
SELECT [CODE_AGENCE],[LIBELLE_AGENCE] FROM [BD_RPA_TEST].[dbo].[Agences] WHERE 1=1
```

#### Barem_Reporting
```sql
SELECT * FROM [BD_RPA_TEST].[dbo].[Barem_Reporting]
```

#### Services
```sql
SELECT [NOM_SERVICE] FROM [BD_RPA_TEST].[dbo].[Services]
```

#### Reporting
```sql
SELECT * FROM [BD_RPA_TEST].[dbo].[Reporting] WHERE 1=1
```
Avec filtres optionnels sur `CLEF` et `ANNEE_MOIS`.

## 5. Flux de données entre les composants

### Diagramme de flux

```mermaid
graph TD
    A[Dashboard.tsx] -->|loadInitialData| B[dataStore.ts]
    B -->|loadAllAgencies| C[API /api/sql?table=AgencesV2]
    B -->|loadAllRobots| D[API /api/sql?table=Barem_Reporting]
    B -->|loadAllServices| E[API /api/sql?table=Services]
    B -->|initializeReportingData (4 mois)| F[dataFetcher.ts]
    F -->|fetchAllReportingData (x4)| G[API /api/sql?table=Reporting]
    G -->|Requêtes paramétrées| H[SQL Server]
    C --> H
    D --> H
    E --> H
    H -->|Données| I[app/api/sql/route.ts]
    I -->|Réponse| B
    B -->|Cache & monthLabels| A
    A -->|initializeRobots4Agencies| B
    A -->|isAgencyInReportingData| A
```

### Étapes détaillées du flux

1. **Initialisation**: Le composant Dashboard appelle `loadInitialData` lors du montage
2. **Chargement séquentiel**: Les données sont chargées dans un ordre précis :
   - Agences d'abord
   - Robots ensuite
   - Services puis
   - Données de reporting en dernier
3. **Appels API**: Chaque fonction de chargement effectue des appels à l'API SQL
4. **Traitement des données**: L'API route transforme les requêtes en requêtes SQL
5. **Base de données**: SQL Server exécute les requêtes et retourne les données
6. **Mise en cache**: Les données sont stockées dans les variables globales de dataStore.ts
7. **Mise à jour de l'UI**: Le composant Dashboard met à jour son état avec les données du cache

### Variables de cache clés

- `cachedAllAgencies`: Stocke toutes les agences
- `cachedRobots`: Stocke tous les robots/programmes
- `cachedServices`: Stocke tous les services
- `cachedReportingData`: Stocke les données de reporting pour 4 mois

## 6. Gestion des erreurs et optimisations

### Gestion des erreurs
- Chaque fonction de chargement est enveloppée dans un try-catch
- Les erreurs sont remontées jusqu'à la fonction `loadInitialData`
- Un message d'erreur est affiché à l'utilisateur en cas d'échec
- L'état de chargement est correctement géré avec `setIsLoading`

### Optimisations
- Utilisation d'un cache pour éviter les appels API répétés
- Chargement séquentiel pour garantir la disponibilité des données
- Utilisation de `useRef` pour éviter les réinitialisations multiples
- Tri des agences par ordre alphabétique pour une meilleure expérience utilisateur

## 7. Tables SQL concernées

### Base de données
- **Nom**: `BD_RPA_TEST`
- **Serveur**: `myreport01.alltransports.fr`

### Tables utilisées
1. **Agences**: Contient les informations sur les agences
   - `CODE_AGENCE`: Code de l'agence
   - `LIBELLE_AGENCE`: Libellé de l'agence

2. **Barem_Reporting**: Contient les informations sur les robots ~programmes~
   - `CLEF`: Clé unique
   - `NOM_ROBOT` ~`NOM_PROGRAMME`~: Nom du robot
   - `AGENCE`: Agence associée
   - `SERVICE`: Service associé
   - `DESCRIPTION`: Description du robot
   - `TYPE_UNITE`: Type d'unité
   - `TEMPS_PAR_UNITE`: Temps par unité
   - `TYPE_GAIN`: Type de gain
   - Et autres champs...

3. **Services**: Contient la liste des services
   - `NOM_SERVICE`: Nom du service

4. **Reporting**: Contient les données de reporting mensuelles
   - `CLEF`: Clé du robot
   - `NOM_ROBOT` ~`NOM_PROGRAMME`~: Nom du robot
   - `AGENCE`: Agence
   - `ANNEE_MOIS`: Année et mois (format YYYYMM)
   - `JOUR1` à `JOUR31`: Données quotidiennes
   - `NB UNITES DEPUIS DEBUT DU MOIS`: Total mensuel

## Conclusion

La fonction `loadInitialData` est un point d'entrée crucial qui orchestre le chargement de toutes les données nécessaires au fonctionnement du dashboard. Elle utilise une approche de chargement séquentiel avec mise en cache pour garantir la disponibilité des données et optimiser les performances. Le flux de données est bien structuré, passant par des couches d'abstraction claires : composant UI → gestionnaire de cache → fetcher d'API → endpoint API → base de données.

Cette architecture permet une séparation des responsabilités claire et facilite la maintenance et l'évolution de l'application.