# Plan de correction de la fonction loadProgramData

## Objectif
Corriger la fonction `loadProgramData` dans `components/Dashboard.tsx` pour qu'elle fonctionne correctement avec les données provenant de SQL Server au lieu de Firestore.

## Modifications nécessaires

### 1. Correction des noms de champs

Dans la fonction `loadProgramData`, ligne 288, remplacer :
```typescript
.filter((entry: ReportingEntry) => entry['AGENCE'] + "_" + entry['NOM PROGRAMME'] === robot.id_robot)
```

Par :
```typescript
.filter((entry: ReportingEntry) => entry['AGENCE'] + "_" + entry['NOM_PROGRAMME'] === robot.id_robot)
```

### 2. Correction du champ de comptage

Ligne 291, remplacer :
```typescript
'NB UNITES DEPUIS DEBUT DU MOIS': String(entry['NB UNITES DEPUIS DEBUT DU MOIS']),
```

Par :
```typescript
'NB UNITES DEPUIS DEBUT DU MOIS': String(entry['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']),
```

### 3. Adaptation de l'accès aux données journalières

Dans la boucle de traitement (ligne 300-319), remplacer la logique d'accès aux données journalières :

**Ancien code :**
```typescript
for (const entry of rawData) {
  const unitFactor = robot.type_unite !== 'temps' || robot.temps_par_unite === '0' ? 1 : Number(robot.temps_par_unite);
  if (robotType === 'temps') {
    totalUnitesMoisCourant_Type1 += (Number(entry['NB UNITES DEPUIS DEBUT DU MOIS']) || 0) * unitFactor;
  } else { 
    totalUnitesMoisCourant_Type2 += (Number(entry['NB UNITES DEPUIS DEBUT DU MOIS']) || 0);
  }
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
}
```

**Nouveau code :**
```typescript
for (const entry of rawData) {
  const unitFactor = robot.type_unite !== 'temps' || robot.temps_par_unite === '0' ? 1 : Number(robot.temps_par_unite);
  if (robotType === 'temps') {
    totalUnitesMoisCourant_Type1 += (Number(entry['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) || 0) * unitFactor;
  } else { 
    totalUnitesMoisCourant_Type2 += (Number(entry['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) || 0);
  }
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
}
```

### 4. Correction de la création des données fusionnées

Ligne 330, remplacer :
```typescript
'NB UNITES DEPUIS DEBUT DU MOIS': formatNumber(totalUnitesMoisCourant_Type1),
```

Par :
```typescript
'NB UNITES DEPUIS DEBUT DU MOIS': formatNumber(totalUnitesMoisCourant_Type1),
```

### 5. Correction de la boucle de création des données journalières

Lignes 333-336, remplacer :
```typescript
for (let i = 1; i <= 31; i++) {
  const dateKey = i.toString().padStart(2, '0') + '/' + currentMonth + '/' + currentYear;
  mergedDataType1[dateKey] = arrJoursDuMois_Type1[i - 1];
}
```

Par :
```typescript
for (let i = 1; i <= 31; i++) {
  const dateKey = i.toString().padStart(2, '0') + '/' + currentMonth + '/' + currentYear;
  mergedDataType1[dateKey] = arrJoursDuMois_Type1[i - 1];
}
```

### 6. Correction des calculs de totaux filtrés

Lignes 351-357, remplacer :
```typescript
return reportingData.reduce((acc, entry) => {
  const entryId = `${entry.AGENCE}_${entry['NOM PROGRAMME']}`;
  if (programIds.has(entryId)) {
    return acc + (Number(entry['NB UNITES DEPUIS DEBUT DU MOIS']) || 0);
  }
  return acc;
}, 0);
```

Par :
```typescript
return reportingData.reduce((acc, entry) => {
  const entryId = `${entry.AGENCE}_${entry['NOM_PROGRAMME']}`;
  if (programIds.has(entryId)) {
    return acc + (Number(entry['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) || 0);
  }
  return acc;
}, 0);
```

### 7. Correction de la partie Chart.tsx

Dans la section `Chart.tsx` (ligne 366-425), corriger les références aux champs :

Ligne 372-383, remplacer :
```typescript
const currentMonthData = cachedReportingData.currentMonth.filter((entry: ReportingEntry) => {
  return entry['AGENCE'] + "_" + entry['NOM_PROGRAMME'] === selectedRobotData.agence + "_" + selectedRobotData.robot;
});
```

Par :
```typescript
const currentMonthData = cachedReportingData.currentMonth.filter((entry: ReportingEntry) => {
  return entry['AGENCE'] + "_" + entry['NOM_PROGRAMME'] === selectedRobotData.agence + "_" + selectedRobotData.robot;
});
```

Et corriger les accès aux champs dans les lignes 417-420 :
```typescript
setTotalCurrentMonth(currentMonthData[0] ? Number(currentMonthData[0]['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) : 0);
setTotalPrevMonth1(prevMonth1Data[0] ? Number(prevMonth1Data[0]['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) : 0);
setTotalPrevMonth2(prevMonth2Data[0] ? Number(prevMonth2Data[0]['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) : 0);
setTotalPrevMonth3(prevMonth3Data[0] ? Number(prevMonth3Data[0]['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) : 0);
```

## Validation

Après avoir appliqué ces modifications, vérifier que :
1. Les histogrammes s'affichent correctement dans Chart.tsx et Chart4All.tsx
2. Les données journalières sont correctement extraites et affichées
3. Les totaux mensuels sont correctement calculés
4. Le filtrage par agence et par robot fonctionne correctement

## Implémentation

Ces modifications doivent être implémentées dans le fichier `components/Dashboard.tsx`.