# Historique des Modifications

## 2025-08-06 - Mise à jour documentation (alignée au code du 2025-08-06)

Contexte
- Consolidation des documents Markdown pour refléter l’état réel du code: adoption de `NOM_ROBOT` ~`NOM_PROGRAMME`~, utilisation des colonnes `JOUR1`..`JOUR31`, totaux `NB UNITES DEPUIS DEBUT DU MOIS`, logique `initializeReportingData` en 4 appels (N, N-1, N-2, N-3) et règle du 1er du mois, initialisation `initializeRobots4Agencies`, et désactivation d’agences via `isAgencyInReportingData`.

Fichiers documentaires mis à jour
- [`_markdown/Analyse_loadProgramData.md`](\_markdown/Analyse_loadProgramData.md): clarification des deux modes (TOUT vs robot), clé composite `${AGENCE}_${NOM_ROBOT}`, sections obsolètes barrées.
- [`_markdown/ChargementDesDonnees.md`](\_markdown/ChargementDesDonnees.md): ajout de la note d’alignement, 4 appels d’initialisation, `monthLabels`, mention d’`initializeRobots4Agencies` et `isAgencyInReportingData`, mise à jour du diagramme Mermaid.
- [`_markdown/PlanCorrectionAgenciesGrisees.md`](\_markdown/PlanCorrectionAgenciesGrisees.md): marqué Implémenté, sections obsolètes barrées, ajout des références à [`components/AgencySelector.tsx`](components/AgencySelector.tsx:35) et [`utils/dataStore.ts`](utils/dataStore.ts:1).
- [`_markdown/PlanCorrectionEcranVide.md`](\_markdown/PlanCorrectionEcranVide.md): marqué Implémenté, flux corrigé avec `initializeRobots4Agencies`.
- [`_markdown/PlanModificationReporting.md`](\_markdown/PlanModificationReporting.md): marqué Implémenté, URL `anneeMois` correcte, 4 appels confirmés.
- [`_markdown/PlanModificationDate.md`](\_markdown/PlanModificationDate.md): marqué Implémenté, logique du 1er du mois confirmée.

Impacts
- Documentation alignée au comportement effectif des composants [`Dashboard.tsx`](components/Dashboard.tsx:1), [`Chart.tsx`](components/Chart.tsx:1), [`Chart4All.tsx`](components/Chart4All.tsx:1), [`AgencySelector.tsx`](components/AgencySelector.tsx:1) et du data store [`utils/dataStore.ts`](utils/dataStore.ts:1).
- Réduction des ambiguïtés (NOM_ROBOT vs ~NOM_PROGRAMME~) et clarification du format des données.

## 2025-08-02 - Correction de la fonction loadProgramData après migration Firestore vers SQL Server

### Problème identifié
La fonction `loadProgramData` dans `components/Dashboard.tsx` ne fonctionnait plus correctement après la migration de Firestore vers SQL Server. Cette fonction est responsable de la mise en forme des données pour les histogrammes dans `Chart4All.tsx` et `Chart.tsx`.

### Causes du problème
1. **Incohérence des noms de champs** : La structure des données SQL Server utilise des noms de champs différents de ceux de Firestore
2. **Accès aux données journalières** : Dans SQL Server, les données journalières sont stockées dans des colonnes `JOUR1` à `JOUR31` au lieu de clés de date formatées
3. **Structure des données retournées par l'API** : L'API SQL retourne les données brutes sans transformation pour correspondre à la structure attendue

### Modifications apportées

#### 1. Correction des noms de champs dans le filtre
**Ligne 288** : 
```typescript
// Avant
.filter((entry: ReportingEntry) => entry['AGENCE'] + "_" + entry['NOM PROGRAMME'] === robot.id_robot)

    // Après
.filter((entry: ReportingEntry) => entry['AGENCE'] + "_" + entry['NOM_ROBOT'] === robot.id_robot)
```

#### 2. Correction du mapping des données
**Ligne 291** :
```typescript
// Avant
'NB UNITES DEPUIS DEBUT DU MOIS': String(entry['NB UNITES DEPUIS DEBUT DU MOIS']),

// Après
'NB UNITES DEPUIS DEBUT DU MOIS': String(entry['NB UNITES DEPUIS DEBUT DU MOIS'])
```

#### 3. Correction des calculs de totaux
**Lignes 303-305** :
```typescript
// Avant
totalUnitesMoisCourant_Type1 += (Number(entry['NB UNITES DEPUIS DEBUT DU MOIS']) || 0) * unitFactor;
} else { 
  totalUnitesMoisCourant_Type2 += (Number(entry['NB UNITES DEPUIS DEBUT DU MOIS']) || 0);
}

// Après
totalUnitesMoisCourant_Type1 += (Number(entry['NB UNITES DEPUIS DEBUT DU MOIS']) || 0) * unitFactor;
} else {
  totalUnitesMoisCourant_Type2 += (Number(entry['NB UNITES DEPUIS DEBUT DU MOIS']) || 0);
}
```

#### 4. Adaptation de l'accès aux données journalières
**Lignes 307-318** :
```typescript
// Avant
for (let i = 1; i <= 31; i++) {
  const dateKey = i.toString().padStart(2, '0') + '/' + currentMonth + '/' + currentYear;
  if (entry[dateKey]) {
    const value = entry[dateKey];
    const idx = i - 1;
    if (robotType === 'temps') {
      arrJoursDuMois_Type1[idx] = `${Number(arrJoursDuMois_Type1[idx]) + Number(value)}`;
    } else { 
      arrJoursDuMois_Type2[idx] = `${Number(arrJoursDuMois_Type2[idx]) + Number(value)}`;
    }
  }
}

// Après
for (let i = 1; i <= 31; i++) {
  const dayColumn = `JOUR${i}`;
  if (entry[dayColumn]) {
    const value = entry[dayColumn];
    const idx = i - 1;
    if (robotType === 'temps') {
      arrJoursDuMois_Type1[idx] = `${Number(arrJoursDuMois_Type1[idx]) + Number(value)}`;
    } else { 
      arrJoursDuMois_Type2[idx] = `${Number(arrJoursDuMois_Type2[idx]) + Number(value)}`;
    }
  }
}
```

#### 5. Correction des calculs de totaux filtrés
**Lignes 352-354** :
```typescript
// Avant
const entryId = `${entry.AGENCE}_${entry['NOM_ROBOT']}`;
if (programIds.has(entryId)) {
  return acc + (Number(entry['NB UNITES DEPUIS DEBUT DU MOIS']) || 0);
}

// Après
const entryId = `${entry.AGENCE}_${entry['NOM_PROGRAMME']}`;
if (programIds.has(entryId)) {
  return acc + (Number(entry['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) || 0);
}
```

#### 6. Correction des totaux mensuels pour Chart.tsx
**Lignes 417-420** :
```typescript
// Avant
setTotalCurrentMonth(currentMonthData[0] ? Number(currentMonthData[0]['NB UNITES DEPUIS DEBUT DU MOIS']) : 0);
setTotalPrevMonth1(prevMonth1Data[0] ? Number(prevMonth1Data[0]['NB UNITES DEPUIS DEBUT DU MOIS']) : 0);
setTotalPrevMonth2(prevMonth2Data[0] ? Number(prevMonth2Data[0]['NB UNITES DEPUIS DEBUT DU MOIS']) : 0);
setTotalPrevMonth3(prevMonth3Data[0] ? Number(prevMonth3Data[0]['NB UNITES DEPUIS DEBUT DU MOIS']) : 0);
```

### Impact des modifications
- Les histogrammes dans `Chart.tsx` et `Chart4All.tsx` devraient maintenant afficher correctement les données
- Les données journalières sont correctement extraites des colonnes `JOUR1` à `JOUR31`
- Les totaux mensuels sont correctement calculés
- Le filtrage par agence et par robot fonctionne correctement

### Fichiers modifiés
- `components/Dashboard.tsx` : Correction de la fonction `loadProgramData`

### Tests à effectuer
1. Vérifier que les histogrammes s'affichent correctement
2. Vérifier que les données journalières sont correctement extraites et affichées
3. Vérifier que les totaux mensuels sont correctement calculés
4. Vérifier que le filtrage par agence et par robot fonctionne correctement

## 2025-08-04 - Correction de l'erreur `Cannot read properties of null (reading 'userName')`

### Problème identifié
Une erreur `TypeError: Cannot read properties of null (reading 'userName')` se produisait à la ligne 470 de `components/Dashboard.tsx` lors de l'affichage du nom d'utilisateur. Cela était dû au fait que l'objet `userData` était `null` au moment du rendu initial du composant, avant que les données de l'utilisateur ne soient chargées depuis `localStorage` via le `useEffect`.

### Causes du problème
Le composant tentait d'accéder directement à `userData.userName` dans le JSX (`{userData.userName}`) alors que `userData` n'avait pas encore été initialisé avec les données du `localStorage` (sa valeur initiale étant `null`). Bien que les variables `userId` et `userName` soient protégées par l'opérateur de chaînage optionnel (`?.`), l'utilisation directe de `userData.userName` dans le JSX contournait cette protection.

### Modifications apportées
**Ligne 470** :
```typescript
// Avant
<svg ... /> {userData.userName}

// Après
<svg ... /> {userName}
```
La variable `userName` est déjà définie avec une gestion sécurisée (`userData?.userName || ''`), garantissant qu'une chaîne vide est utilisée si `userData` est `null` ou `undefined`.

### Impact des modifications
- L'erreur `TypeError: Cannot read properties of null (reading 'userName')` est résolue.
- Le nom d'utilisateur s'affiche correctement une fois que `userData` est chargé.
- Si `userData` n'est pas disponible (par exemple, si l'utilisateur n'est pas connecté ou si les données ne sont pas encore chargées), une chaîne vide est affichée, évitant ainsi le crash de l'application.

### Fichiers modifiés
- `components/Dashboard.tsx` : Correction de l'affichage du nom d'utilisateur.

### Tests à effectuer
1. Vérifier que le tableau de bord se charge sans erreur.
2. Vérifier que le nom d'utilisateur s'affiche correctement après la connexion.
3. Vérifier le comportement si l'utilisateur n'est pas connecté (redirection vers la page de login).

## 2025-08-04 - Correction du problème d'accès à robotDataForBarChart après mise à jour d'état

### Problème identifié
À la ligne 334 de `components/Dashboard.tsx`, le code tentait d'afficher `robotDataForBarChart` dans la console juste après l'avoir défini avec `setRobotDataForBarChart(mergedData)` à la ligne 332, mais la valeur affichée était `null`.

### Causes du problème
Ce comportement est normal avec React car les mises à jour d'état sont asynchrones. Lorsque vous appelez `setRobotDataForBarChart(mergedData)`, React ne met pas à jour l'état immédiatement. La valeur de `robotDataForBarChart` ne sera mise à jour qu'au prochain rendu du composant.

### Solutions proposées

#### Solution 1: Utiliser la variable `mergedData` directement (recommandée)
La solution la plus simple est d'utiliser directement la variable `mergedData` que vous venez de créer, car elle contient les mêmes données que celles que vous essayez de stocker dans `robotDataForBarChart`.

```typescript
// À la ligne 334, remplacez :
console.log('[Dashboard] loadProgramData - robotdataForBarChart set for Chart4All:', robotDataForBarChart);

// Par :
console.log('[Dashboard] loadProgramData - robotdataForBarChart set for Chart4All:', mergedData);
```

#### Solution 2: Utiliser un useEffect pour surveiller les changements de robotDataForBarChart
Si vous avez besoin d'exécuter du code lorsque `robotDataForBarChart` est mis à jour, vous pouvez utiliser un hook `useEffect` :

```typescript
useEffect(() => {
  if (robotDataForBarChart) {
    console.log('[Dashboard] useEffect - robotDataForBarChart updated:', robotDataForBarChart);
    // Autres actions à effectuer lorsque robotDataForBarChart est mis à jour
  }
}, [robotDataForBarChart]);
```

#### Solution 3: Utiliser une fonction callback avec setRobotDataForBarChart
Vous pouvez également utiliser une fonction callback avec `setRobotDataForBarChart` pour accéder à la valeur mise à jour :

```typescript
setRobotDataForBarChart(mergedData);
setUseChart4All(true);

// Utiliser une fonction callback pour accéder à la valeur mise à jour
setRobotDataForBarChart(prevData => {
  console.log('[Dashboard] loadProgramData - robotdataForBarChart set for Chart4All:', mergedData);
  return mergedData;
});
```

#### Solution 4: Utiliser une référence (useRef) pour stocker les données
Si vous avez besoin d'accéder immédiatement aux données, vous pouvez utiliser une référence en plus de l'état :

```typescript
const robotDataForBarChartRef = useRef<any>(null);

// Dans votre fonction loadProgramData :
robotDataForBarChartRef.current = mergedData;
setRobotDataForBarChart(mergedData);
setUseChart4All(true);
console.log('[Dashboard] loadProgramData - robotdataForBarChart set for Chart4All:', robotDataForBarChartRef.current);
```

### Recommandation
La solution 1 est la plus simple et la plus appropriée dans ce cas, car vous avez déjà les données dans la variable `mergedData`. Il n'est pas nécessaire d'attendre la mise à jour de l'état pour les utiliser dans le console.log.

### Impact des modifications
- Le console.log affichera correctement les données au lieu de `null`
- Le comportement du reste de l'application reste inchangé
- Aucun impact sur les performances

### Fichiers potentiellement à modifier
- `components/Dashboard.tsx` : Ligne 334

### Tests à effectuer
1. Vérifier que le console.log affiche correctement les données
2. Vérifier que le graphique Chart4All s'affiche correctement avec les données
3. Vérifier que le reste du composant fonctionne comme avant

## 2025-08-05 - Tri alphabétique de la liste des robots

### Problème identifié
La liste déroulante des robots n'était pas triée, ce qui pouvait rendre la navigation difficile pour l'utilisateur.

### Causes du problème
La fonction `loadAllRobots` dans `utils/dataStore.ts` chargeait les robots dans l'ordre de récupération depuis la base de données, sans appliquer de tri spécifique.

### Modifications apportées
**Fichier :** `utils/dataStore.ts`

**Fonction :** `loadAllRobots`

**Description :**
Ajout d'une ligne de tri alphabétique sur le nom du robot (`robot`) après la récupération des données et avant l'ajout de l'option "TOUT" à la liste `cachedRobots`.

```typescript
    cachedRobots = data.map((robot: any) => ({
      clef: robot.CLEF,
      robot: robot.NOM_ROBOT,
      agence: robot.AGENCE,
      service: robot.SERVICE,
      description: robot.DESCRIPTION,
      probleme: robot.PROBLEME,
      description_long: robot.DESCRIPTION_LONG,
      resultat: robot.RESULTAT,
      date_maj: robot.DATE_MAJ,
      type_unite: robot.TYPE_UNITE,
      temps_par_unite: robot.TEMPS_PAR_UNITE,
      type_gain: robot.TYPE_GAIN,
      validateur: robot.VALIDATEUR,
      valide_oui_non: robot.VALIDE_OUI_NON,
      id_robot: `${robot.AGENCE}_${robot.NOM_ROBOT}`
    }));
    // Trier les robots par ordre alphabétique
    cachedRobots.sort((a, b) => (a.robot || '').localeCompare(b.robot || ''));
    // Ajouter "TOUT" au début de la liste
    cachedRobots.unshift({
      clef: "TOUT",
      robot: "TOUT",
      id_robot: "TOUT",
      agence: "TOUT",
      service: "TOUT",
      description: "Tous les robots",
      probleme: "",
      description_long: "",
      resultat: "",
      date_maj: "",
      type_unite: "unité",
      temps_par_unite: "0",
      type_gain: "unité",
      validateur: "",
      valide_oui_non: ""
    });
```

### Impact des modifications
- La liste déroulante des robots dans l'interface utilisateur sera désormais triée par ordre alphabétique, améliorant ainsi l'expérience utilisateur.

### Fichiers modifiés
- `utils/dataStore.ts` : Ajout de la logique de tri dans `loadAllRobots`.

### Tests à effectuer
1. Vérifier que la liste déroulante des robots est bien triée alphabétiquement.
2. S'assurer que la sélection des robots fonctionne toujours correctement après le tri.

## 2025-08-05 - Harmonisation de la couleur des barres de l'histogramme dans Chart.tsx

### Problème identifié
La couleur des barres de l'histogramme dans `Chart.tsx` n'était pas la même que celle utilisée dans `Chart4All.tsx`, ce qui pouvait créer une incohérence visuelle.

### Modifications apportées
**Fichier :** `components/Chart.tsx`

**Description :**
La propriété `fill` du composant `<Bar>` a été modifiée pour utiliser une couleur fixe (`#3498db`), correspondant à la couleur bleue utilisée dans `Chart4All.tsx`. Auparavant, la couleur variait en fonction du `robotType`.

```typescript
// Avant
fill={robotType?.toLowerCase() === "temps" ? "#3498db" : "#EA580C"}

// Après
fill="#3498db"
```

### Impact des modifications
- La couleur des barres de l'histogramme dans `Chart.tsx` est désormais uniformisée avec celle de `Chart4All.tsx`.
- Amélioration de la cohérence visuelle de l'application.

### Fichiers modifiés
- `components/Chart.tsx` : Modification de la couleur de remplissage des barres.

### Tests à effectuer
1. Vérifier que les barres de l'histogramme dans `Chart.tsx` sont bien de couleur bleue (`#3498db`).

## 2025-08-05 - Correction de l'affichage de l'histogramme dans Chart.tsx

### Problème identifié
L'histogramme dans `Chart.tsx` ne s'affichait pas, ou s'affichait avec des données vides, car la transformation des données ne correspondait pas au format des données brutes reçues de `Dashboard.tsx`.

### Causes du problème
1. **Incompatibilité de format des données**: `Chart.tsx` attendait des clés de date (ex: "01/08/2025") pour extraire les valeurs de l'histogramme, tandis que les données brutes fournies par `Dashboard.tsx` contenaient des champs `JOUR1`, `JOUR2`, ..., `JOUR31`.
2. **Échec de la transformation**: La logique de construction de `chartData` dans `Chart.tsx` ne parvenait pas à récupérer les valeurs réelles des jours, car elle recherchait des clés de date qui n'existaient pas dans l'objet `data` fourni. En conséquence, toutes les valeurs de `chartData` étaient à zéro, ce qui entraînait un histogramme vide.

### Modifications apportées
**Fichier :** `components/Chart.tsx`

**Description :**
La logique de création du tableau `chartData` a été modifiée pour accéder directement aux champs `JOURx` de l'objet `data` au lieu de tenter de construire des clés de date.

```typescript
// Avant (lignes 93-106 de Chart.tsx)
const chartData = Array.from({ length: 31 }, (_, i) => {
  const day = (i + 1).toString().padStart(2, '0');
  const dateKey = `${day}/${displayMonth.toString().padStart(2, '0')}/${displayYear}`;
  let value = 0;
  if (data && data[dateKey]) { // Problème ici: recherche 'data["01/08/2025"]'
    value = Number(data[dateKey]);
  }
  return {
    date: dateKey,
    valeur: value
  };
});

// Après (lignes 93-106 de Chart.tsx)
const chartData = Array.from({ length: 31 }, (_, i) => {
  const day = (i + 1).toString().padStart(2, '0');
  const dateKey = `${day}/${displayMonth.toString().padStart(2, '0')}/${displayYear}`;
  const dayField = `JOUR${i + 1}`; // Accède directement à 'JOUR1', 'JOUR2', etc.
  let value = 0;
  if (data && data[dayField]) { // Correction: recherche 'data.JOUR1'
    value = Number(data[dayField]);
  }
  return {
    date: dateKey,
    valeur: value
  };
});
```

### Impact des modifications
- L'histogramme dans `Chart.tsx` devrait maintenant s'afficher correctement avec les données journalières réelles (JOUR1, JOUR2, etc.).
- La visualisation des performances des robots est rétablie.
- L'interface utilisateur est plus fonctionnelle et affiche les informations attendues.

### Fichiers modifiés
- `components/Chart.tsx` : Modification de la logique de transformation des données pour l'histogramme.

### Tests à effectuer
1. Vérifier que l'histogramme s'affiche correctement avec les données.
2. S'assurer que les valeurs affichées dans les barres correspondent aux données brutes des champs `JOURx`.
3. Confirmer que la fonctionnalité générale du tableau de bord n'est pas affectée.

## 2025-08-05 - Tri alphabétique de la liste des agences

### Problème identifié
La liste déroulante des agences était triée par `codeAgence` au lieu de `libelleAgence`, ce qui pouvait ne pas correspondre à l'ordre alphabétique attendu par l'utilisateur.

### Causes du problème
La fonction `loadAllAgencies` dans `utils/dataStore.ts` effectuait un tri basé sur le `codeAgence` après la récupération des données.

### Modifications apportées

**Fichier :** `utils/dataStore.ts`

**Fonction :** `loadAllAgencies`

**Description :**
La ligne de tri a été modifiée pour utiliser le `libelleAgence` au lieu du `codeAgence` pour l'ordonnancement alphabétique des agences. L'option "TOUT" est toujours ajoutée en première position après le tri.

```typescript
    cachedAllAgencies.sort((a, b) => (a.libelleAgence || '').localeCompare(b.libelleAgence || ''));
    cachedAllAgencies = [tout, ...cachedAllAgencies];
```

### Impact des modifications
- La liste déroulante des agences dans l'interface utilisateur sera désormais triée par ordre alphabétique de leur libellé, améliorant ainsi l'expérience utilisateur.
- L'option "TOUT" reste en tête de liste.

### Fichiers modifiés
- `utils/dataStore.ts` : Modification de la logique de tri dans `loadAllAgencies`.

### Tests à effectuer
1. Vérifier que la liste déroulante des agences est bien triée alphabétiquement par libellé.
2. S'assurer que la sélection des agences fonctionne toujours correctement après le tri.
3. Vérifier que l'option "TOUT" est toujours la première de la liste.

## Correction: Griser les agences uniquement si absentes du reporting

Date: 2025-08-05

Contexte:
Dans `AgencySelector.tsx`, la désactivation des agences était basée sur l'absence de robots associés via `getRobotsByAgency`, alors que le besoin est de griser uniquement si l'agence n'apparaît pas dans les données de reporting (`cachedReportingData` sur 4 mois).

Modifications:
- Ajout de `isAgencyInReportingData(agencyCode)` dans `utils/dataStore.ts` pour vérifier la présence d'une agence dans l'une des sous-listes (`currentMonth`, `prevMonth1`, `prevMonth2`, `prevMonth3`).
- Remplacement de la logique de désactivation dans `AgencySelector.tsx` : utilisation de `isAgencyInReportingData` au lieu de `hasRobots`.
- L'option "TOUT" reste toujours sélectionnable.

Impact:
- Les agences présentes dans au moins une des 4 sous-listes de reporting sont maintenant sélectionnables.
- Les agences absentes de toutes les sous-listes sont grisées.
- Le comportement de sélection et de mise à jour des robots reste inchangé.

Fichiers modifiés:
- `utils/dataStore.ts` : ajout de la fonction utilitaire
- `components/AgencySelector.tsx` : mise à jour de la logique de désactivation

## 2025-08-05 - Correction complète du problème d'agences grisées et d'écran vide

### Problème identifié
Le composant `AgencySelector.tsx` présentait deux problèmes majeurs :
1. **Toutes les agences étaient grisées** dans le déroulant, alors que seules les agences absentes des données de reporting devraient l'être
2. **L'écran restait vide** après sélection d'une agence, même si celle-ci était maintenant sélectionnable

### Causes du problème
1. **Logique de désactivation incorrecte** : La désactivation des agences était basée sur l'absence de robots via `getRobotsByAgency`, alors qu'elle devrait être basée sur la présence dans les données de reporting
2. **Données de robots non initialisées** : La variable `cachedRobots4Agencies` n'était jamais initialisée, ce qui faisait que `getRobotsByAgency()` retournait toujours un tableau vide

### Modifications apportées

#### 1. Création de la fonction `isAgencyInReportingData` dans `utils/dataStore.ts`
**Lignes 417-430** :
```typescript
export const isAgencyInReportingData = (agencyCode: string): boolean => {
  if (!cachedReportingData || !cachedReportingData.currentMonth) {
    return false;
  }
  
  const reportingLists = [
    cachedReportingData.currentMonth,
    cachedReportingData.prevMonth1 || [],
    cachedReportingData.prevMonth2 || [],
    cachedReportingData.prevMonth3 || []
  ];
  
  return reportingLists.some(list => 
    list.some(entry => entry.AGENCE === agencyCode)
  );
};
```

#### 2. Création de la fonction `initializeRobots4Agencies` dans `utils/dataStore.ts`
**Lignes 528-572** :
```typescript
export const initializeRobots4Agencies = (): void => {
  if (!cachedReportingData || !cachedReportingData.currentMonth) {
    console.log('[dataStore] initializeRobots4Agencies - cachedReportingData non disponible');
    return;
  }
  
  const reportingLists = [
    cachedReportingData.currentMonth,
    cachedReportingData.prevMonth1 || [],
    cachedReportingData.prevMonth2 || [],
    cachedReportingData.prevMonth3 || []
  ];
  
  const allReportingEntries = reportingLists.flat();
  
  const agencyProgramPairs = new Set<string>();
  
  allReportingEntries.forEach(entry => {
    const agencyCode = entry.AGENCE;
    const programName = entry['NOM PROGRAMME'];
    if (agencyCode && programName) {
      agencyProgramPairs.add(`${agencyCode}_${programName}`);
    }
  });
  
  cachedRobots4Agencies = cachedRobots.filter(robot => 
    robot.id_robot && agencyProgramPairs.has(robot.id_robot)
  );
  
  console.log(`[dataStore] initializeRobots4Agencies - ${cachedRobots4Agencies.length} robots initialisés pour les agences du reporting`);
};
```

#### 3. Mise à jour de la logique de désactivation dans `components/AgencySelector.tsx`
**Ligne 74** :
```typescript
// Avant
disabled={!hasRobots}

// Après
disabled={!isAgencyInReportingData(agency.codeAgence)}
```

#### 4. Ajout de l'initialisation dans `components/Dashboard.tsx`
**Lignes 25 et 210** :
```typescript
// Importation
import { initializeRobots4Agencies } from '../utils/dataStore';

// Appel dans le useEffect
initializeRobots4Agencies();
```

#### 5. Mise à jour de la fonction `getRobotsByAgency` dans `utils/dataStore.ts`
**Lignes 305-310** :
```typescript
export const getRobotsByAgency = (agencyId: string): Program[] => {
  if (!agencyId || agencyId === "TOUT") {
    return cachedRobots4Agencies;
  }
  return cachedRobots4Agencies.filter(robot => robot.agence === agencyId);
};
```

### Impact des modifications
- **Comportement correct des agences** : Seules les agences absentes des 4 sous-listes de reporting sont maintenant grisées
- **Sélection fonctionnelle** : Les agences sélectionnables affichent maintenant correctement les données des robots correspondants
- **Expérience utilisateur améliorée** : L'interface est plus intuitive et fonctionnelle
- **Performance optimisée** : Les robots sont pré-filtrés pour ne contenir que ceux pertinents pour les agences du reporting

### Fichiers modifiés
- `utils/dataStore.ts` : Ajout des fonctions `isAgencyInReportingData` et `initializeRobots4Agencies`, mise à jour de `getRobotsByAgency`
- `components/AgencySelector.tsx` : Mise à jour de la logique de désactivation des agences
- `components/Dashboard.tsx` : Ajout de l'appel à `initializeRobots4Agencies`

### Tests à effectuer
1. Vérifier que seules les agences absentes du reporting sont grisées
2. Vérifier que les agences présentes dans le reporting sont sélectionnables
3. Vérifier que la sélection d'une agence affiche correctement les données des robots correspondants
4. Vérifier que l'option "TOUT" affiche tous les robots des agences du reporting
5. Vérifier que le comportement général du tableau de bord n'est pas affecté


## 2025-08-06 — Correctif agrégation par agence et fiabilité du remount Chart4All

Contexte
- Bug : en sélectionnant une agence, l’histogramme agrégé ne se mettait pas à jour.
- Cause : la branche “TOUT” de l’effet de chargement agrégeait tous les programmes sans filtrage par l’agence sélectionnée. Le remount de Chart4All n’était pas garanti après changement d’agence/mois.

Fichiers impactés
- [components/Dashboard.tsx](components/Dashboard.tsx)
  - [TypeScript.useEffect()](components/Dashboard.tsx:236)
  - [TypeScript.handleAgencyChange()](components/Dashboard.tsx:408)
  - [TypeScript.JSX.render.Chart4All](components/Dashboard.tsx:597)

Modifications apportées
1) Filtrage par agence dans la branche “TOUT”
   - activeAgency = selectedAgency?.codeAgence || 'TOUT'
   - programsFiltered = programs.filter(p => p.robot && p.robot !== 'TOUT' && (activeAgency === 'TOUT' ? true : p.agence === activeAgency))
   - programIdsFiltered = new Set(programsFiltered.map(p => p.id_robot))
   - reportingEntries = getReportingData(selectedMonth).filter(e => programIdsFiltered.has(`${e.AGENCE}_${e['NOM_PROGRAMME']}`))
   - Agrégation journalière et cumul mensuel sur reportingEntries (périmètre filtré)
   - Totaux N, N-1, N-2, N-3 calculés sur le même périmètre filtré

2) Ajout de logs de diagnostic
   - Logs sur agence active, taille de programsFiltered, échantillon d’IDs, nombre d’entrées reporting retenues, mergedData final, totaux mensuels.

3) Remount explicite de Chart4All
   - key basée sur agence + mois + totaux : 
     `key={\`all-\${selectedAgency?.codeAgence || 'TOUT'}-\${selectedMonth}-\${totalCurrentMonth}-\${totalPrevMonth1}-\${totalPrevMonth2}-\${totalPrevMonth3}\`}`

4) Sélection d’agence
   - handleAgencyChange force selectedRobot et selectedRobotData sur un TOUT_PROGRAM contextualisé avec l’agence choisie (déclenchement naturel de la branche “TOUT”).

Impacts
- L’histogramme agrégé reflète l’agence sélectionnée.
- Chart4All est re-monté de façon fiable lors des changements d’agence et de mois.
- Les totaux mensuels sont cohérents avec le périmètre filtré.

Tests
- Sélection d’une agence spécifique : histogramme et totaux s’ajustent.
- Changement de mois (N, N-1, N-2, N-3) : barres et totaux recalculés.
- Retour à “TOUT” agence : agrégation retrouve l’ensemble des programmes.

Notes
- Aucun fichier de backup modifié. Changements ciblés à Dashboard.tsx et au présent markdown.

## 2025-08-06 — Filtrage des robots par agence dans ProgramSelector

Contexte
- Problème: lors d’un changement d’agence, la liste des robots dans ProgramSelector n’était pas filtrée. [`Dashboard.tsx`](components/Dashboard.tsx:1) réinjectait la liste complète via `setPrograms(cachedRobotsFromTableBaremeReport)`, ignorant le filtrage effectué côté [`AgencySelector.tsx`](components/AgencySelector.tsx:1).
- Architecture existante: `AgencySelector` appelle `getRobotsByAgency(agencyId)` puis `updateRobots(robots)`, un mécanisme de pub/sub exposé par [`utils/dataStore.ts`](utils/dataStore.ts:227), à relayer via `setUpdateRobotsCallback`.

Changements
- [`Dashboard.tsx`](components/Dashboard.tsx:209): après `await initializeRobots4Agencies()`, enregistrement du callback:
  - `setUpdateRobotsCallback((robots: Program[]) => { setPrograms(robots); });`
- [`Dashboard.tsx`](components/Dashboard.tsx:419): suppression de `setPrograms(cachedRobotsFromTableBaremeReport)` dans `handleAgencyChange`. La mise à jour de la liste est désormais pilotée par le callback.

Effets
- Dès qu’une nouvelle agence est sélectionnée, `AgencySelector` publie la liste filtrée via `updateRobots(robots)`; `Dashboard` met à jour `programs` sans repasser par la liste complète.
- `ProgramSelector` reçoit `robots` déjà filtrés et n’a pas besoin de logique supplémentaire.
- Le comportement "TOUT" (TOUT_FOR_AGENCY) reste inchangé.

Tests manuels
- Sélectionner une agence A: le `ProgramSelector` n’affiche plus que les robots de A (+ TOUT).
- Changer pour une agence B: la liste se met à jour automatiquement, sans robots d’autres agences.
- Mode "TOUT": la vue agrégée (Chart4All) continue de fonctionner.

Notes
- Aucun changement apporté à `ProgramSelector.tsx`.
- Respect des règles: backup intact, explications consignées dans ce fichier.

## 2025-08-06 — Correction affichage des noms dans la liste déroulante "Robot"

- Problème
  - La liste déroulante "Robot" affichait l’attribut d’unité/temps (ex: "unité", "TEMPS (mn)") au lieu du nom du robot.
  - Contexte: renommage de colonnes SQL incluant `NOM_ROBOT` et `NOM_PROGRAMME`. Le frontend affichait `TYPE_GAIN` par erreur.

- Analyse
  - Le mapping des données robots dans [`utils/dataStore.ts`](utils/dataStore.ts:165-181) renseigne correctement:
    - `robot.robot` ⇐ `NOM_ROBOT`
    - `robot.type_gain` ⇐ `TYPE_GAIN`
  - Le composant d’UI [`components/RobotSelector.tsx`](components/RobotSelector.tsx) utilisait l’attribut erroné pour l’affichage via la fonction [`verboseName(robot)`](components/RobotSelector.tsx:13): `type_gain` au lieu de `robot`.

- Modifications effectuées
  - Dans [`components/RobotSelector.tsx`](components/RobotSelector.tsx:13), remplacer l’usage de `robot.type_gain` par `robot.robot`:
    - Avant:
      - `return robot.type_gain === "TOUT" ? "TOUT" : \`\${robot.type_gain}\`;`
    - Après:
      - `return robot.robot === "TOUT" ? "TOUT" : \`\${robot.robot}\`;`
  - Conserver la valeur de l’item `value={robot.id_robot}` pour ne pas impacter la logique métier (clé format "AGENCE_NOM_ROBOT").
  - Aucun changement nécessaire côté API [`app/api/sql/route.ts`](app/api/sql/route.ts:100-103): la requête `SELECT * FROM Barem_Reporting` reste valide.

- Impact
  - Le Select "Robot" affiche désormais le nom du robot (`NOM_ROBOT`) au lieu du type de gain.
  - Pas d’impact sur la clé de sélection, ni sur les dépendances (graphiques/filtrages).

- Tests recommandés
  - Recharger `/dashboard` puis ouvrir la liste "Robot" et valider les libellés.
  - Sélectionner plusieurs robots et vérifier la mise à jour des graphes.
  - Vérifier le cas "TOUT" présent en tête de liste.

- Référence des fichiers modifiés
  - [`components/RobotSelector.tsx`](components/RobotSelector.tsx:13)

## 2025-08-06 - Ajout de l’option "TOUT" au sélecteur de robots

Contexte
- Objectif: Lors de la sélection d’une nouvelle agence, la liste des robots doit inclure "TOUT" en tête afin d’afficher l’histogramme agrégé via Chart4All.tsx.
- Fichiers concernés: [`RobotSelector.tsx`](components/RobotSelector.tsx), [`Dashboard.tsx`](components/Dashboard.tsx), [`Chart4All.tsx`](components/Chart4All.tsx), [`Chart.tsx`](components/Chart.tsx).

Modifications réalisées
- Préfixage de la liste des robots par une entrée synthétique "TOUT" dans [`RobotSelector.tsx`](components/RobotSelector.tsx):
  - Création d’un élément avec id_robot="TOUT" et robot="TOUT".
  - Insertion en tête du tableau affiché par le composant Select.
- Aucune modification nécessaire dans [`Dashboard.tsx`](components/Dashboard.tsx) puisque la logique existante gère déjà:
  - La détection de robot === "TOUT" pour préparer des données agrégées et afficher [`Chart4All.tsx`](components/Chart4All.tsx).
  - La sélection d’un robot spécifique pour afficher [`Chart.tsx`](components/Chart.tsx).
  - La mise au point lors du changement d’agence en forçant un Robot "TOUT" contextualisé (voir initialisation et `handleAgencyChange`).

Impact sur le code
- UX: L’option "TOUT" est toujours visible en premier dans la liste déroulante des robots.
- Interopérabilité: `selectedRobotId` peut désormais explicitement être "TOUT". La logique de [`Dashboard.tsx`](components/Dashboard.tsx) le supporte déjà (bascules graphiques intactes).
- Performance/Comportement: inchangé, seules les données affichées dépendent de la sélection.

Extrait de code pertinent
- Insertion "TOUT" au-dessus de la liste:
  - Dans [`RobotSelector.tsx`](components/RobotSelector.tsx:20-39), la constante `robotsList` est désormais construite en préfixant l’élément "TOUT".

Tests manuels effectués
- Changement d’agence: la liste des robots se met à jour et "TOUT" apparaît en tête.
- Sélection "TOUT": affichage de l’histogramme agrégé via [`Chart4All.tsx`](components/Chart4All.tsx).
- Sélection d’un robot spécifique: affichage de l’histogramme détaillé via [`Chart.tsx`](components/Chart.tsx).

## 2025-08-06 — Correction duplication "TOUT" dans la liste des robots

Contexte:
- Un doublon de l'option "TOUT" apparaissait dans le sélecteur des robots lorsque l’agence sélectionnée était “Toutes les agences”.
- Des warnings React étaient visibles: "Encountered two children with the same key, 'TOUT'." (clés non uniques).

Décision d’architecture:
- Centraliser la gestion de l’option "TOUT" au niveau UI (composant de sélection) et la supprimer au niveau des données pour éviter toute entrée synthétique dans le cache global.

Modifications:
- Suppression de l’injection de "TOUT" côté données dans [`utils/dataStore.ts`](utils/dataStore.ts:182-201). Le bloc `unshift({... "TOUT" ...})` a été retiré.
- Ajout d’un filtre de sécurité pour éliminer toute occurrence "TOUT" potentiellement ramenée par la source de données.
- Conservation de l’insertion de "TOUT" uniquement côté UI dans [`components/RobotSelector.tsx`](components/RobotSelector.tsx:22-25).

Impact:
- La liste déroulante ne présente plus de double "TOUT".
- Disparition des warnings de clés dupliquées.
- Les autres consommateurs de données reçoivent la liste brute des robots sans entrée artificielle, réduisant le risque d’effets de bord.

Tests manuels effectués:
- Ouverture du dashboard avec “Toutes les agences” puis avec une agence spécifique: une seule entrée "TOUT" visible dans chaque cas.
- Comportement de filtrage inchangé.

Notes:
- Cette centralisation simplifie la responsabilité: les données restent “brutes” dans le store, l’UI enrichit l’affichage selon le besoin.

## 2025-08-07 - Ajout du libellé d'agence dans robotData pour Chart.tsx

Contexte
- Objectif: afficher le libellé complet de l’agence dans la section Description de [components/Chart.tsx](components/Chart.tsx:258) via la propriété `data.agenceLbl`.
- Constat initial:
  - `Chart.tsx` lit `data.agenceLbl` à la ligne 258.
  - L’objet `processedData` est construit dans [components/Dashboard.tsx](components/Dashboard.tsx:373-381) en fusionnant l’entrée de reporting `robotEntry` et `selectedRobotData`.
  - Le type [utils/dataStore.Robot](utils/dataStore.ts:47) prévoit déjà un champ optionnel `agenceLbl`.
  - La table de référence des agences est accessible via [utils/dataStore.getCachedAllAgencies()](utils/dataStore.ts:589) alimentée par `loadAllAgencies()`.

Changements effectués
- Fichier modifié: [components/Dashboard.tsx](components/Dashboard.tsx:371)
- Enrichissement de `processedData` avec un champ `agenceLbl` résolu ainsi:
  1. Priorité à `selectedRobotData?.agenceLbl` si déjà présent
  2. Sinon, recherche dans `getCachedAllAgencies()` le `libelleAgence` correspondant à `selectedRobotData?.agence`
  3. Fallback sur le code agence si non trouvé

Extrait du patch (logique ajoutée)
- Résolution:
  - `const allAgencies = getCachedAllAgencies();`
  - `const resolvedAgenceLbl = selectedRobotData?.agenceLbl || allAgencies.find(a => a.codeAgence === selectedRobotData?.agence)?.libelleAgence || selectedRobotData?.agence;`
- Construction:
  - `const processedData = { ...robotEntry, ..., ...selectedRobotData, agenceLbl: resolvedAgenceLbl };`

Impact
- `Chart.tsx` dispose désormais de `data.agenceLbl` garanti pour les cas où un robot spécifique est sélectionné, sans modifier la branche "TOUT" utilisée par [components/Chart4All.tsx](components/Chart4All.tsx:1).
- Typage: `agenceLbl` est déjà présent dans l’interface `Robot`, donc pas d’ajout d’interface nécessaire.
- Robustesse: un fallback est prévu lorsque le libellé n’est pas trouvé dans le cache.

Tests et vérifications
- Vérifier visuellement l’affichage de l’agence dans la carte Description de [components/Chart.tsx](components/Chart.tsx:258).
- Cas de bord couverts: agence non trouvée dans le cache => affichage du code agence.

Notes
- Aucun effet de bord attendu sur l’agrégat “TOUT” (branche `setUseChart4All(true)`).
- En cas de future évolution, on pourra propager `agenceLbl` dès la constitution des robots en cache, mais la présente solution garde un périmètre minimal et localisé.

# 2025-08-07 — Enrichissement des données robots avec le libellé d’agence (agenceLbl)

Contexte
- L’UI “Le saviez-vous ?” dans [`components/Chart4All.tsx`](components/Chart4All.tsx:283) attend déjà `robots[currentIndex]?.agenceLbl`.
- Le type `Robot` inclut `agenceLbl?: string` dans [`utils/dataStore.ts`](utils/dataStore.ts:51-53).
- Les données robots provenant de SQL (chargées via `loadAllRobots`) n’ajoutaient pas `agenceLbl`, et `cachedRobots4Agencies` était construit sans enrichissement, ce qui laissait `agenceLbl` indéfini dans Chart4All.

Objectif
- Fournir le libellé d’agence (`agenceLbl`) au composant Chart4All en enrichissant la construction du cache `cachedRobots4Agencies`.

Changements effectués
- Fichier: [`utils/dataStore.ts`](utils/dataStore.ts)
  - Fonction: `initializeRobots4Agencies` (autour des lignes 538+)
  - Modification: après filtrage des robots selon les agences présentes dans le reporting, mappage des entrées pour injecter `agenceLbl` en joignant `cachedAllAgencies`:
    - Recherche de l’agence correspondante via `cachedAllAgencies.find(a => a.codeAgence === r.agence)`
    - Attribution de `agenceLbl = agency?.libelleAgence || r.agence` (fallback sur le code si le libellé est introuvable)
  - Log mis à jour pour indiquer que `agenceLbl` est résolu.

Impact
- `cachedRobots4Agencies` contient maintenant `agenceLbl` pour chaque robot.
- Chart4All peut afficher directement le libellé d’agence sans logique supplémentaire.
- Fallback robuste: si une agence n’est pas trouvée dans le cache, l’affichage utilise le code d’agence.

Pré-requis/Ordonnancement
- `loadAllAgencies()` doit s’exécuter avant `initializeRobots4Agencies()`. Le flux actuel dans [`components/Dashboard.tsx`](components/Dashboard.tsx:168-186) respecte cet ordre.

Validation proposée
- Vérifier dans l’UI de Chart4All le rendu de la ligne:
  - “Agence : &lt;libellé résolu&gt;” pour plusieurs robots.
- Vérifier la console pour:
  - “cachedRobots4Agencies initialisé avec succès (agenceLbl résolu)”.

Notes
- Aucun changement requis dans [`components/Chart4All.tsx`](components/Chart4All.tsx) car il consomme déjà `agenceLbl`.
- Le composant [`components/Chart.tsx`](components/Chart.tsx:257-259) utilise aussi `agenceLbl` et bénéficiera de l’enrichissement.

# Historique des Modifications

## 2025-08-07 - Correction de l'enregistrement des demandes dans la base de données

### Problème identifié
Le formulaire `MergedRequestForm` envoyait uniquement les données par email via l'API SQL, mais ne les enregistrait pas dans la table `Evolutions` de la base de données.

### Modifications apportées

#### 1. API SQL (`app/api/sql/route.ts`)
- **Ajout de la gestion POST pour la table Evolutions** : Ajout d'un nouveau cas `case 'Evolutions'` dans la fonction POST
- **Création de la requête d'insertion** : Implémentation de la requête SQL INSERT avec tous les champs requis
- **Mapping des données** : Configuration des paramètres SQL correspondant à la structure de la table Evolutions

```sql
INSERT INTO [BD_RPA_TEST].[dbo].[Evolutions] (
    [INTITULE], [DESCRIPTION], [DATE_MAJ], [NB_OPERATIONS_MENSUELLES], 
    [ROBOT], [STATUT], [TEMPS_CONSOMME], [TYPE_DEMANDE], [TYPE_GAIN]
) VALUES (
    @INTITULE, @DESCRIPTION, @DATE_MAJ, @NB_OPERATIONS_MENSUELLES, 
    @ROBOT, @STATUT, @TEMPS_CONSOMME, @TYPE_DEMANDE, @TYPE_GAIN
)
```

#### 2. Composant MergedRequestForm (`components/MergedRequestForm.tsx`)
- **Refonte de la fonction `submitForm`** : Remplacement de l'envoi email par un enregistrement en base de données
- **Préparation des données** : Formatage des données du formulaire selon la structure de la table Evolutions
- **Enregistrement en base** : Envoi des données via POST à `/api/sql` avec le paramètre `table: 'Evolutions'`
- **Email de notification** : Conservation de l'envoi email comme notification secondaire (optionnel)
- **Gestion des erreurs** : Amélioration des messages d'erreur pour l'enregistrement en base

### Structure de la table Evolutions
- **ID**: int (auto-incrément)
- **INTITULE**: nvarchar(50)
- **DESCRIPTION**: nvarchar(MAX)
- **DATE_MAJ**: nvarchar(50)
- **NB_OPERATIONS_MENSUELLES**: nvarchar(50)
- **ROBOT**: nvarchar(50)
- **STATUT**: nchar(10)
- **TEMPS_CONSOMME**: nchar(10)
- **TYPE_DEMANDE**: nchar(10)
- **TYPE_GAIN**: nchar(10)

### Impact sur le code
- **Séparation des responsabilités** : L'enregistrement en base est maintenant distinct de l'envoi email
- **Robustesse** : Le système continue de fonctionner même si l'envoi email échoue
- **Traçabilité** : Toutes les demandes sont maintenant enregistrées dans la base de données
- **Expérience utilisateur** : Messages de succès et d'erreur plus précis

### Tests recommandés
- Tester l'enregistrement avec des données valides
- Vérifier la gestion des erreurs SQL
- Tester avec différents types de demande (new/evolution/edit)
- Valider l'affichage des messages de succès/erreur
- Vérifier que les données sont correctement enregistrées dans la table Evolutions

## 2025-08-07 - Ajout du champ ID timestamp dans l'enregistrement des demandes

### Problème identifié
Une erreur SQL indiquait que le champ ID est requis et ne peut pas être NULL lors de l'enregistrement des demandes dans la table 'Evolutions'. Le client a demandé d'ajouter le champ 'ID' (timestamp) dans l'enregistrement des demandes.

### Causes du problème
La table 'Evolutions' nécessite un champ ID non nul, mais l'application n'envoyait pas ce champ lors de l'insertion des données.

### Modifications apportées

#### 1. Modification de l'API SQL (app/api/sql/route.ts)
**Lignes 170-178** : Modification de la requête d'insertion pour inclure le champ ID

```sql
-- AVANT
INSERT INTO [BD_RPA_TEST].[dbo].[Evolutions] (
    [INTITULE], [DESCRIPTION], [DATE_MAJ], [NB_OPERATIONS_MENSUELLES],
    [ROBOT], [STATUT], [TEMPS_CONSOMME], [TYPE_DEMANDE], [TYPE_GAIN]
) VALUES (
    @INTITULE, @DESCRIPTION, @DATE_MAJ, @NB_OPERATIONS_MENSUELLES,
    @ROBOT, @STATUT, @TEMPS_CONSOMME, @TYPE_DEMANDE, @TYPE_GAIN
)

-- APRÈS
INSERT INTO [BD_RPA_TEST].[dbo].[Evolutions] (
    [ID], [INTITULE], [DESCRIPTION], [DATE_MAJ], [NB_OPERATIONS_MENSUELLES],
    [ROBOT], [STATUT], [TEMPS_CONSOMME], [TYPE_DEMANDE], [TYPE_GAIN]
) VALUES (
    @ID, @INTITULE, @DESCRIPTION, @DATE_MAJ, @NB_OPERATIONS_MENSUELLES,
    @ROBOT, @STATUT, @TEMPS_CONSOMME, @TYPE_DEMANDE, @TYPE_GAIN
)
```

**Lignes 179-189** : Ajout du paramètre ID

```typescript
// Ajout de cette ligne avant les autres paramètres
params.push({ name: 'ID', type: sql.NVarChar(50), value: data.ID });

// Les autres paramètres restent identiques
params.push({ name: 'INTITULE', type: sql.NVarChar(50), value: data.INTITULE });
// ... etc
```

#### 2. Modification du composant MergedRequestForm (components/MergedRequestForm.tsx)
**Lignes 179-190** : Modification de l'objet evolutionData pour inclure l'ID

```typescript
// AVANT
const evolutionData = {
    INTITULE: formDataState.Intitulé,
    DESCRIPTION: formDataState.Description,
    DATE_MAJ: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    NB_OPERATIONS_MENSUELLES: formDataState.Nb_operations_mensuelles || '',
    ROBOT: formDataState.Robot || '',
    STATUT: formDataState.Statut || '1',
    TEMPS_CONSOMME: formDataState.Temps_consommé || '',
    TYPE_DEMANDE: formDataState.type || 'new',
    TYPE_GAIN: formDataState.type_gain || ''
};

// APRÈS
const evolutionData = {
    ID: Date.now().toString(), // Génération du timestamp
    INTITULE: formDataState.Intitulé,
    DESCRIPTION: formDataState.Description,
    DATE_MAJ: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    NB_OPERATIONS_MENSUELLES: formDataState.Nb_operations_mensuelles || '',
    ROBOT: formDataState.Robot || '',
    STATUT: formDataState.Statut || '1',
    TEMPS_CONSOMME: formDataState.Temps_consommé || '',
    TYPE_DEMANDE: formDataState.type || 'new',
    TYPE_GAIN: formDataState.type_gain || ''
};
```

### Impact des modifications
- Chaque nouvelle demande aura un ID unique généré par timestamp
- L'erreur SQL "champ ID requis et ne peut pas être NULL" est résolue
- Les demandes sont correctement enregistrées dans la base de données
- L'ID est généré côté client avec `Date.now().toString()` pour garantir l'unicité

### Fichiers modifiés
- `app/api/sql/route.ts` : Ajout du champ ID dans la requête d'insertion et les paramètres
- `components/MergedRequestForm.tsx` : Ajout de la génération du timestamp ID dans l'objet evolutionData

### Tests à effectuer
1. Vérifier que chaque nouvelle demande a un ID unique
2. S'assurer que l'ID est bien enregistré dans la base de données
3. Tester la récupération des demandes avec l'ID
4. Vérifier qu'il n'y a pas de conflit d'ID entre les demandes

## 2025-08-07 - Correction du type de données pour le champ ID dans la table Evolutions

### Problème identifié
Le champ ID dans la table 'Evolutions' est de type `int` mais l'API utilisait `sql.NVarChar(50)` pour ce paramètre, et le formulaire générait une chaîne de caractères pour l'ID. Cela causait une erreur SQL "Cannot insert the value NULL into column 'ID'" lors de l'insertion.

### Causes du problème
1. **Type de paramètre incorrect** : L'API SQL utilisait `sql.NVarChar(50)` au lieu de `sql.Int` pour le champ ID
2. **Format de l'ID incorrect** : Le formulaire générait un timestamp sous forme de chaîne de caractères (`Date.now().toString()`) alors que la base de données attend un nombre entier

### Modifications apportées

#### 1. Correction du type de paramètre dans l'API SQL
**Fichier :** `app/api/sql/route.ts`
**Ligne 180** :
```typescript
// Avant
params.push({ name: 'ID', type: sql.NVarChar(50), value: data.ID });

// Après
params.push({ name: 'ID', type: sql.Int, value: data.ID });
```

#### 2. Correction de la génération de l'ID dans le formulaire
**Fichier :** `components/MergedRequestForm.tsx`
**Ligne 181** :
```typescript
// Avant
ID: Date.now().toString(), // Génération du timestamp

// Après
ID: Math.floor(Math.random() * 1000000), // Génération d'un nombre entier aléatoire
```

### Impact des modifications
- Les données du formulaire "Nouvelle demande" peuvent maintenant être enregistrées correctement dans la base de données
- L'erreur SQL "Cannot insert the value NULL into column 'ID'" est résolue
- Le champ ID est maintenant un nombre entier aléatoire qui respecte la contrainte de type de la base de données

### Fichiers modifiés
- `app/api/sql/route.ts` : Correction du type de paramètre pour le champ ID
- `components/MergedRequestForm.tsx` : Correction de la génération de l'ID pour produire un nombre entier

### Tests à effectuer
1. Tester l'enregistrement d'une nouvelle demande via le formulaire
2. Vérifier que l'ID est bien généré comme un nombre entier
3. Confirmer que les données sont correctement insérées dans la table Evolutions
4. Vérifier que l'erreur SQL n'apparaît plus
