# Analyse de la fonction loadProgramData après migration Firestore vers SQL Server

## Problème identifié

La fonction `loadProgramData` dans `components/Dashboard.tsx` ne fonctionne plus correctement depuis la migration de Firestore vers SQL Server. Cette fonction est responsable de la mise en forme des données pour les histogrammes dans `Chart4All.tsx` et `Chart.tsx`.

## Analyse des différences de structure de données

### Ancienne structure (Firestore)

Dans l'ancienne version avec Firestore, les données étaient structurées de la manière suivante :
- Les données de reporting étaient stockées dans des documents Firestore
- La structure des données incluait des champs comme `AGENCE`, `NOM PROGRAMME`, `NB UNITES DEPUIS DEBUT DU MOIS`
- Les données journalières étaient accessibles via des clés de date formatées comme "DD/MM/YYYY"

### Nouvelle structure (SQL Server)

Avec SQL Server, les données proviennent de la table `Reporting` qui a une structure différente :
- Les données sont récupérées via l'API `/api/sql?table=Reporting`
- La structure SQL utilise des colonnes comme `AGENCE`, `NOM_PROGRAMME`, `NB_UNITES_DEPUIS_DEBUT_DU_MOIS`
- Les données journalières sont stockées dans des colonnes `JOUR1` à `JOUR31`

## Problèmes spécifiques identifiés

### 1. Incohérence des noms de champs

Dans la fonction `loadProgramData` (ligne 288), on trouve :
```typescript
rawData = getReportingData(selectedMonth)
  .filter((entry: ReportingEntry) => entry['AGENCE'] + "_" + entry['NOM PROGRAMME'] === robot.id_robot)
```

Problème : Le code utilise `entry['NOM PROGRAMME']` mais dans la structure SQL Server, le champ s'appelle probablement `NOM_PROGRAMME` (sans espace).

### 2. Accès aux données journalières

Dans la boucle de traitement (ligne 308), le code essaie d'accéder aux données journalières avec :
```typescript
const dateKey = i.toString().padStart(2, '0') + '/' + currentMonth + '/' + currentYear;
if (entry[dateKey]) {
  const value = entry[dateKey];
  // ...
}
```

Problème : Dans SQL Server, les données journalières sont stockées dans des colonnes `JOUR1` à `JOUR31`, pas dans des champs avec des clés de date.

### 3. Structure des données retournées par l'API

L'API SQL (`app/api/sql/route.ts`) retourne les données brutes de la table SQL sans transformation :
```typescript
case 'Reporting':
  // ...
  result = await executeQuery(query, params);
  return NextResponse.json(result.recordset);
```

Problème : Les données ne sont pas transformées pour correspondre à la structure attendue par le composant Dashboard.

## Solutions proposées

### 1. Harmoniser les noms de champs

Modifier la fonction `loadProgramData` pour utiliser les noms de champs corrects selon la structure SQL Server :
- `NOM PROGRAMME` → `NOM_PROGRAMME`
- `NB UNITES DEPUIS DEBUT DU MOIS` → `NB_UNITES_DEPUIS_DEBUT_DU_MOIS`

### 2. Adapter l'accès aux données journalières

Modifier la logique d'accès aux données journalières pour utiliser les colonnes `JOUR1` à `JOUR31` au lieu des clés de date.

### 3. Transformer les données au niveau de l'API ou du dataStore

Ajouter une transformation des données dans `dataStore.ts` ou `dataFetcher.ts` pour convertir la structure SQL en une structure compatible avec le code existant.

## Impact sur les composants

### Chart.tsx
- Utilise les données formatées par `loadProgramData`
- Attend une structure spécifique pour les données journalières
- Devrait fonctionner correctement une fois les données transformées

### Chart4All.tsx
- Utilise également les données formatées par `loadProgramData`
- Attend une structure similaire pour les données journalières
- Devrait également fonctionner correctement une fois les données transformées

## Prochaines étapes

1. Corriger la fonction `loadProgramData` dans `components/Dashboard.tsx`
2. Adapter éventuellement `dataStore.ts` ou `dataFetcher.ts` pour transformer les données
3. Tester que les histogrammes s'affichent correctement dans les deux composants
4. Documenter les modifications apportées