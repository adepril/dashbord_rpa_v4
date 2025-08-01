# Plan de Modification - initializeReportingData

## Contexte
Le but est de modifier la méthode `initializeReportingData` dans `utils/dataStore.ts` pour qu'elle effectue 4 appels API distincts au lieu d'un seul, en utilisant les mois N, N-1, N-2, N-3.

## Modifications Requises

### 1. Modification de `fetchAllReportingData` dans `utils/dataFetcher.ts`

**Actuellement :**
```typescript
export async function fetchAllReportingData(month: number): Promise<any[]> {
  console.log('Fetching reporting data for month:', month);
  try {
    const url = `/api/sql?table=Reporting&Clef=&ÀnneeMois=${month}`;
    console.log('Constructed URL for reporting data:', url);
    ...
}
```

**À modifier :**
- Corriger l'URL : remplacer `ÀnneeMois` par `anneeMois`
- La fonction reste compatible avec un seul mois

### 2. Modification de `initializeReportingData` dans `utils/dataStore.ts`

**Actuellement :**
```typescript
// Récupérer toutes les données de reporting en une seule requête
const allReportingData = await fetchAllReportingData(months.pop);

// Filtrer les données par mois
const currentMonthData = allReportingData.filter((entry: any) => entry.ANNEE_MOIS === months[0]);
const prevMonth1Data = allReportingData.filter((entry: any) => entry.ANNEE_MOIS === months[1]);
const prevMonth2Data = allReportingData.filter((entry: any) => entry.ANNEE_MOIS === months[2]);
const prevMonth3Data = allReportingData.filter((entry: any) => entry.ANNEE_MOIS === months[3]);
```

**À remplacer par :**
```typescript
// Faire 4 appels API distincts pour chaque mois
const ReportingDataDe_N = await fetchAllReportingData(months[0]);
const ReportingDataDe_N_1 = await fetchAllReportingData(months[1]);
const ReportingDataDe_N_2 = await fetchAllReportingData(months[2]);
const ReportingDataDe_N_3 = await fetchAllReportingData(months[3]);

// Utiliser directement les données récupérées
const currentMonthData = ReportingDataDe_N;
const prevMonth1Data = ReportingDataDe_N_1;
const prevMonth2Data = ReportingDataDe_N_2;
const prevMonth3Data = ReportingDataDe_N_3;
```

## Code Complet Modifié

### Pour `utils/dataStore.ts` - `initializeReportingData` :

```typescript
export async function initializeReportingData(): Promise<void> {
  try {
    // Calculer les 4 derniers mois basés sur la date actuelle
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() retourne 0-11
    
    // Calculer les mois N, N-1, N-2, N-3
    const months: number[] = [];
    for (let i = 0; i < 4; i++) {
      let year = currentYear;
      let month = currentMonth - i;
      
      if (month <= 0) {
        month += 12;
        year -= 1;
      }
      
      const anneeMois = year * 100 + month;
      months.push(anneeMois);
    }
    
    console.log('Mois à récupérer:', months);
    
    // Faire 4 appels API distincts
    const ReportingDataDe_N = await fetchAllReportingData(months[0]);
    const ReportingDataDe_N_1 = await fetchAllReportingData(months[1]);
    const ReportingDataDe_N_2 = await fetchAllReportingData(months[2]);
    const ReportingDataDe_N_3 = await fetchAllReportingData(months[3]);

    console.log('(dataStore / initializeReportingData) - Données récupérées:', {
      currentMonth: ReportingDataDe_N.length,
      prevMonth1: ReportingDataDe_N_1.length,
      prevMonth2: ReportingDataDe_N_2.length,
      prevMonth3: ReportingDataDe_N_3.length
    });
    
    // Générer les labels de mois en français
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    
    const currentMonthLabel = monthNames[(currentMonth - 1) % 12];
    const prevMonth1Label = monthNames[(currentMonth - 2 + 12) % 12];
    const prevMonth2Label = monthNames[(currentMonth - 3 + 12) % 12];
    const prevMonth3Label = monthNames[(currentMonth - 4 + 12) % 12];
  
    // Mettre à jour le cache
    cachedReportingData = {
      currentMonth: ReportingDataDe_N,
      prevMonth1: ReportingDataDe_N_1,
      prevMonth2: ReportingDataDe_N_2,
      prevMonth3: ReportingDataDe_N_3,
      monthLabels: {
        currentMonth: currentMonthLabel,
        prevMonth1: prevMonth1Label,
        prevMonth2: prevMonth2Label,
        prevMonth3: prevMonth3Label
      }
    };
    
  } catch (error) {
    console.log('Erreur lors de l\'initialisation des données de reporting:', error);
    throw error;
  }
}
```

### Pour `utils/dataFetcher.ts` - `fetchAllReportingData` :

```typescript
export async function fetchAllReportingData(month: number): Promise<any[]> {
  console.log('Fetching reporting data for month:', month);
  try {
    const url = `/api/sql?table=Reporting&Clef=&anneeMois=${month}`;
    console.log('Constructed URL for reporting data:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Retrieve all reporting data (dataFetcher / fetchAllReportingData)', data);
    return data;
  } catch (error) {
    console.log('Error fetching all reporting data:', error);
    return [];
  }
}
```

## Points de Vérification

1. **URLs générées** : Vérifier que les URLs contiennent bien `anneeMois=<valeur>` sans accent
2. **Nombre d'appels** : Confirmer que 4 appels sont bien effectués
3. **Paramètres des mois** : Vérifier que les mois N, N-1, N-2, N-3 sont correctement calculés
4. **Structure des données** : S'assurer que la structure du cache reste compatible avec le reste de l'application

## Prochaines Étapes

1. Approuver ce plan
2. Passer en mode code pour implémenter les modifications
3. Tester les changements