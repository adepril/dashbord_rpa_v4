# Plan de Modification - Logique de date dans initializeReportingData

## Contexte
Modifier la logique de calcul de la date dans `initializeReportingData` pour que si la date du jour est le 1er jour du mois, alors `currentDate` soit positionnée au mois précédent.

## Modification Requise

### Actuellement dans `utils/dataStore.ts` (lignes 321-324) :
```typescript
// Calculer les 4 derniers mois basés sur la date actuelle
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1; // getMonth() retourne 0-11
```

### À modifier :
```typescript
// Calculer les 4 derniers mois basés sur la date actuelle
let currentDate = new Date();

// Si on est le 1er jour du mois, utiliser le mois précédent
if (currentDate.getDate() === 1) {
  // Créer une nouvelle date pour le dernier jour du mois précédent
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
}

const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1; // getMonth() retourne 0-11
```

## Explication de la logique

1. On vérifie si la date actuelle est le 1er jour du mois avec `currentDate.getDate() === 1`
2. Si c'est le cas, on crée une nouvelle date en utilisant le constructeur `Date(année, mois, 0)`
   - Le jour 0 dans ce constructeur correspond au dernier jour du mois précédent
   - Par exemple : `new Date(2025, 7, 0)` donne le 31 juillet 2025
3. On utilise ensuite cette nouvelle date pour calculer l'année et le mois de référence

## Exemples de fonctionnement

### Cas 1 : Date actuelle = 01/08/2025
- `currentDate.getDate() === 1` → vrai
- On crée `new Date(2025, 7, 0)` → 31/07/2025
- `currentYear` = 2025
- `currentMonth` = 7 (juillet)
- Les mois calculés seront : juillet 2025, juin 2025, mai 2025, avril 2025

### Cas 2 : Date actuelle = 15/08/2025
- `currentDate.getDate() === 1` → faux
- On garde la date actuelle : 15/08/2025
- `currentYear` = 2025
- `currentMonth` = 8 (août)
- Les mois calculés seront : août 2025, juillet 2025, juin 2025, mai 2025

## Code complet modifié

```typescript
export async function initializeReportingData(): Promise<void> {
  try {
    // Calculer les 4 derniers mois basés sur la date actuelle
    let currentDate = new Date();

    // Si on est le 1er jour du mois, utiliser le mois précédent
    if (currentDate.getDate() === 1) {
      // Créer une nouvelle date pour le dernier jour du mois précédent
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    }

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

## Points de vérification

1. **Logique de date** : Vérifier que le 1er du mois déclenche bien le changement vers le mois précédent
2. **Calcul des mois** : S'assurer que les 4 mois sont correctement calculés dans les deux cas
3. **Compatibilité** : Vérifier que le reste du code fonctionne toujours avec cette modification

## Prochaines étapes

1. Approuver ce plan
2. Passer en mode code pour implémenter la modification
3. Tester avec différentes dates