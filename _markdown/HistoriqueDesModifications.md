# Historique des Modifications

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
.filter((entry: ReportingEntry) => entry['AGENCE'] + "_" + entry['NOM_PROGRAMME'] === robot.id_robot)
```

#### 2. Correction du mapping des données
**Ligne 291** :
```typescript
// Avant
'NB UNITES DEPUIS DEBUT DU MOIS': String(entry['NB UNITES DEPUIS DEBUT DU MOIS']),

// Après
'NB UNITES DEPUIS DEBUT DU MOIS': String(entry['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']),
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
totalUnitesMoisCourant_Type1 += (Number(entry['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) || 0) * unitFactor;
} else { 
  totalUnitesMoisCourant_Type2 += (Number(entry['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) || 0);
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
const entryId = `${entry.AGENCE}_${entry['NOM PROGRAMME']}`;
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

// Après
setTotalCurrentMonth(currentMonthData[0] ? Number(currentMonthData[0]['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) : 0);
setTotalPrevMonth1(prevMonth1Data[0] ? Number(prevMonth1Data[0]['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) : 0);
setTotalPrevMonth2(prevMonth2Data[0] ? Number(prevMonth2Data[0]['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) : 0);
setTotalPrevMonth3(prevMonth3Data[0] ? Number(prevMonth3Data[0]['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) : 0);
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
      robot: robot.NOM_PROGRAMME,
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
      id_robot: `${robot.AGENCE}_${robot.NOM_PROGRAMME}`
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
