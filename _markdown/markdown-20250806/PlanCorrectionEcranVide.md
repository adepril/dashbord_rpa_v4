# Plan de correction : Écran vide après sélection d'une agence

## Problème identifié
Lorsqu'on sélectionne une agence dans le dropdown AgencySelector, l'écran reste vide. Les agences sont correctement sélectionnables (plus grisées), mais aucune donnée ne s'affiche après la sélection.

## Analyse du problème

### Cause racine
La variable `cachedRobots4Agencies` n'est jamais initialisée avec les données des robots. Elle reste vide, ce qui fait que la fonction `getRobotsByAgency()` retourne un tableau vide.

### Flux de données problématique
1. `AgencySelector.handleAgencyChange()` appelle `getRobotsByAgency(agencyId)`
2. `getRobotsByAgency()` filtre les robots à partir de `cachedRobots4Agencies`
3. `cachedRobots4Agencies` est vide (déclarée mais jamais initialisée)
4. `updateRobots([])` est appelé avec un tableau vide
5. Le dashboard n'affiche aucune donnée

## Solution proposée

### Étape 1 : Créer une fonction pour initialiser cachedRobots4Agencies
- Créer une fonction `initializeRobots4Agencies()` dans `utils/dataStore.ts`
- Cette fonction va :
  - Récupérer toutes les agences présentes dans `cachedReportingData`
  - Pour chaque agence, récupérer les robots correspondants depuis `cachedRobots`
  - Peupler `cachedRobots4Agencies` avec ces robots

### Étape 2 : Appeler cette fonction au bon moment
- Appeler `initializeRobots4Agencies()` après le chargement des données de reporting
- Dans `Dashboard.tsx`, après l'appel à `initializeReportingData()`

### Étape 3 : Vérifier la cohérence des données
- S'assurer que les robots dans `cachedRobots4Agencies` correspondent bien aux agences du reporting
- Vérifier que l'option "TOUT" fonctionne toujours correctement

## Implémentation détaillée

### 1. Fonction initializeRobots4Agencies()
```typescript
export function initializeRobots4Agencies(): void {
  // Récupérer les agences uniques présentes dans le reporting
  const agenciesInReporting = new Set<string>();
  
  // Parcourir toutes les entrées de reporting pour extraire les agences
  const allReportingEntries = [
    ...cachedReportingData.currentMonth,
    ...cachedReportingData.prevMonth1,
    ...cachedReportingData.prevMonth2,
    ...cachedReportingData.prevMonth3
  ];
  
  allReportingEntries.forEach(entry => {
    if (entry.AGENCE) {
      agenciesInReporting.add(entry.AGENCE);
    }
  });
  
  // Ajouter "TOUT" pour l'option toutes agences
  agenciesInReporting.add('TOUT');
  
  // Filtrer les robots pour ne garder que ceux des agences présentes dans le reporting
  cachedRobots4Agencies = cachedRobots.filter(robot => 
    agenciesInReporting.has(robot.agence)
  );
  
  console.log('cachedRobots4Agencies initialisé avec', cachedRobots4Agencies.length, 'robots');
}
```

### 2. Modification de Dashboard.tsx
Dans la fonction `loadInitialData()`, après l'appel à `initializeReportingData()` :
```typescript
// Étape 4: Charger les données de reporting pour 4 mois
await initializeReportingData();

// Étape 4.1: Initialiser cachedRobots4Agencies avec les robots du reporting
initializeRobots4Agencies();
```

### 3. Vérification de la cohérence
- S'assurer que `getRobotsByAgency()` retourne bien les robots attendus
- Vérifier que la sélection d'agence met à jour correctement l'affichage
- Tester avec différentes agences et l'option "TOUT"

## Tests à effectuer
1. Sélectionner une agence présente dans le reporting → doit afficher les robots de cette agence
2. Sélectionner "TOUT" → doit afficher tous les robots
3. Sélectionner une agence non présente dans le reporting → doit être grisée (déjà fonctionnel)
4. Vérifier que les données s'affichent correctement dans les graphiques

## Risques et mitigations
- **Risque** : Performance si le volume de données est élevé
  - **Mitigation** : Optimiser la fonction `initializeRobots4Agencies` si nécessaire
- **Risque** : Incohérence entre `cachedRobots` et `cachedRobots4Agencies`
  - **Mitigation** : Documenter clairement le rôle de chaque variable