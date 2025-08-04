# Analyse détaillée de la fonction loadProgramData

## 1. Objectif et fonctionnalité

La fonction [`loadProgramData`](components/Dashboard.tsx:235) est le cœur du traitement des données dans le composant Dashboard. Elle est exécutée dans un hook [`useEffect`](components/Dashboard.tsx:234) qui se déclenche lorsque [`selectedRobotData`](components/Dashboard.tsx:429) ou [`selectedMonth`](components/Dashboard.tsx:429) changent.

### Objectifs principaux :
- Charger et traiter les données de programmes (robots) en fonction des sélections de l'utilisateur
- Gérer deux modes d'affichage distincts : mode "TOUT" (tous les robots) et mode robot individuel
- Préparer les données pour les composants graphiques (Chart.tsx et Chart4All.tsx)
- Calculer les totaux mensuels pour les widgets d'information

### Fonctionnement global :
1. Vérifie si un robot est sélectionné ([`selectedRobotData`](components/Dashboard.tsx:236))
2. Détermine le mode d'affichage en fonction de la sélection ("TOUT" ou robot spécifique)
3. Traite les données selon le mode approprié
4. Met à jour les états du composant avec les données traitées

## 2. Composants clés et leurs interactions

### Mode "TOUT" (lignes 238-364)

Ce mode est activé quand [`selectedRobotData.robot === "TOUT"`](components/Dashboard.tsx:238) et permet d'afficher des données agrégées pour tous les robots.

#### Initialisation des structures de données (lignes 240-248) :
```typescript
const allRobotsEvolution: any[] = [];
let oneRobotEvolution: any[] = [];
const arrJoursDuMois: string[] = new Array(31).fill("0");
const arrJoursDuMois_Type1: string[] = [...arrJoursDuMois];
const arrJoursDuMois_Type2: string[] = [...arrJoursDuMois];
let rawData: DataEntry[] = [];

let totalUnitesMoisCourant_Type1 = 0;
let totalUnitesMoisCourant_Type2 = 0;
```

- [`arrJoursDuMois`](components/Dashboard.tsx:242) : Tableau de 31 éléments initialisés à "0" pour stocker les données quotidiennes
- [`arrJoursDuMois_Type1`](components/Dashboard.tsx:243) et [`arrJoursDuMois_Type2`](components/Dashboard.tsx:244) : Copies pour séparer les données par type (temps vs unités)
- [`totalUnitesMoisCourant_Type1`](components/Dashboard.tsx:247) et [`totalUnitesMoisCourant_Type2`](components/Dashboard.tsx:248) : Accumulateurs pour les totaux mensuels par type

#### Calcul de la période d'affichage (lignes 250-281) :
```typescript
const currentDate = new Date();
let displayMonth = currentDate.getMonth() + 1;
let displayYear = currentDate.getFullYear();

if (selectedMonth !== 'N') {
  const monthOffset = parseInt(selectedMonth.split('-')[1]);
  displayMonth -= monthOffset;
  if (displayMonth < 1) {
    displayMonth += 12;
    displayYear -= 1;
  }
}

const currentMonth = displayMonth.toString().padStart(2, '0');
const currentYear = displayYear;
```

- Détermine le mois et l'année à afficher en fonction de [`selectedMonth`](components/Dashboard.tsx:257)
- Gère les décalages de mois (N, N-1, N-2, N-3) avec ajustement de l'année si nécessaire
- Formate le mois avec [`padStart`](components/Dashboard.tsx:279) pour garantir un format à deux chiffres

#### Traitement des données par robot (lignes 283-326) :
```typescript
for (const robot of programs) {
  if (robot.robot === "TOUT" || robot.robot === null) 
    continue;
  
  rawData = getReportingData(selectedMonth)
    .filter((entry: ReportingEntry) => entry['AGENCE'] + "_" + entry['NOM PROGRAMME'] === robot.id_robot)
    .map((entry: any) => ({
      ...entry,
      'NB UNITES DEPUIS DEBUT DU MOIS': String(entry['NB UNITES DEPUIS DEBUT DU MOIS']),
    }));

  if (robot.agence === selectedAgency?.codeAgence || selectedAgency?.codeAgence === "TOUT") {
    const currentProgram = programs.find(p => p.robot === robot.robot);
    const robotType = currentProgram?.type_gain;

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
  }
}
```

- Parcourt tous les programmes/robots via la boucle [`for (const robot of programs)`](components/Dashboard.tsx:283)
- Filtre les données avec [`getReportingData(selectedMonth)`](components/Dashboard.tsx:287) pour ne garder que celles correspondant au robot courant
- Vérifie si le robot appartient à l'agence sélectionnée ou si "TOUT" est sélectionné
- Calcule les totaux en fonction du type de robot ([`robotType === 'temps'`](components/Dashboard.tsx:302))
- Agrège les données quotidiennes dans les tableaux appropriés en fonction du type

#### Préparation des données finales (lignes 328-345) :
```typescript
const mergedDataType1: DataEntry = {
  ...rawData[0],
  'NB UNITES DEPUIS DEBUT DU MOIS': formatNumber(totalUnitesMoisCourant_Type1),
};

for (let i = 1; i <= 31; i++) {
  const dateKey = i.toString().padStart(2, '0') + '/' + currentMonth + '/' + currentYear;
  mergedDataType1[dateKey] = arrJoursDuMois_Type1[i - 1];
}

setRobotData1(mergedDataType1);
setUseChart4All(true);
```

- Crée un objet [`mergedDataType1`](components/Dashboard.tsx:328) avec les données agrégées
- Remplit les données quotidiennes pour chaque jour du mois
- Met à jour l'état avec [`setRobotData1(mergedDataType1)`](components/Dashboard.tsx:343)
- Active le mode Chart4All avec [`setUseChart4All(true)`](components/Dashboard.tsx:345)

#### Calcul des totaux pour les widgets (lignes 347-363) :
```typescript
const programIds = new Set(programs.map(p => p.id_robot));
const calculateFilteredTotal = (monthKey: 'N' | 'N-1' | 'N-2' | 'N-3') => {
  const reportingData = getReportingData(monthKey);
  return reportingData.reduce((acc, entry) => {
    const entryId = `${entry.AGENCE}_${entry['NOM PROGRAMME']}`;
    if (programIds.has(entryId)) {
      return acc + (Number(entry['NB UNITES DEPUIS DEBUT DU MOIS']) || 0);
    }
    return acc;
  }, 0);
};

setTotalCurrentMonth(calculateFilteredTotal('N'));
setTotalPrevMonth1(calculateFilteredTotal('N-1'));
setTotalPrevMonth2(calculateFilteredTotal('N-2'));
setTotalPrevMonth3(calculateFilteredTotal('N-3'));
```

- Définit une fonction [`calculateFilteredTotal`](components/Dashboard.tsx:349) pour calculer les totaux par mois
- Crée un Set des IDs de programmes pour un filtrage efficace
- Utilise [`reduce`](components/Dashboard.tsx:351) pour accumuler les totaux
- Met à jour les états des totaux mensuels pour chaque période

### Mode robot individuel (lignes 366-424)

Ce mode est activé quand un robot spécifique est sélectionné et permet d'afficher des données détaillées pour ce robot.

#### Initialisation du mode (lignes 366-370) :
```typescript
setUseChart4All(false);
const tpsParUnit = selectedRobotData.temps_par_unite === '0' ? '0' : selectedRobotData.temps_par_unite;
```

- Désactive le mode Chart4All avec [`setUseChart4All(false)`](components/Dashboard.tsx:369)
- Détermine le temps par unité pour le robot sélectionné

#### Récupération des données par mois (lignes 372-383) :
```typescript
const currentMonthData = cachedReportingData.currentMonth.filter((entry: ReportingEntry) => {
  return entry['AGENCE'] + "_" + entry['NOM PROGRAMME'] === selectedRobotData.agence + "_" + selectedRobotData.robot;
});
const prevMonth1Data = cachedReportingData.prevMonth1.filter((entry: ReportingEntry) => {
  return entry['AGENCE'] + "_" + entry['NOM PROGRAMME'] === selectedRobotData.agence + "_" + selectedRobotData.robot;
});
const prevMonth2Data = cachedReportingData.prevMonth2.filter((entry: ReportingEntry) => {
  return entry['AGENCE'] + "_" + entry['NOM PROGRAMME'] === selectedRobotData.agence + "_" + selectedRobotData.robot;
});
const prevMonth3Data = cachedReportingData.prevMonth3.filter((entry: ReportingEntry) => {
  return entry['AGENCE'] + "_" + entry['NOM PROGRAMME'] === selectedRobotData.agence + "_" + selectedRobotData.robot;
});
```

- Filtre les données du robot sélectionné pour chaque mois à partir de [`cachedReportingData`](components/Dashboard.tsx:372)
- Crée des tableaux de données pour le mois courant et les trois mois précédents
- Utilise une clé composite "AGENCE_NOM PROGRAMME" pour identifier les entrées correspondantes

#### Sélection des données du mois choisi (lignes 386-399) :
```typescript
const robotEntry = (() => {
  switch(selectedMonth) {
    case 'N':
      return currentMonthData[0];
    case 'N-1':
      return prevMonth1Data[0];
    case 'N-2':
      return prevMonth2Data[0];
    case 'N-3':
      return prevMonth3Data[0];
    default:
      return currentMonthData[0];
  }
})();
```

- Utilise un switch sur [`selectedMonth`](components/Dashboard.tsx:387) pour retourner les données appropriées
- Retourne la première entrée du tableau de données correspondant au mois sélectionné
- Fournit une valeur par défaut (mois courant) si aucune correspondance n'est trouvée

#### Préparation des données pour l'affichage (lignes 401-415) :
```typescript
if (robotEntry) {
  const unitFactor = selectedRobotData.temps_par_unite === '0' ? 1 : Number(selectedRobotData.temps_par_unite);

  // Préparer les données pour l'histogramme
  const processedData = {
    ...robotEntry,
    'NB UNITES DEPUIS DEBUT DU MOIS': tpsParUnit !== '0'
      ? String(Number(robotEntry['NB UNITES DEPUIS DEBUT DU MOIS']))
      : String(robotEntry['NB UNITES DEPUIS DEBUT DU MOIS']),
    ...selectedRobotData
  };
  setRobotData(processedData);
} else {
  setRobotData(null); // Réinitialiser robotData si aucune entrée n'est trouvée
}
```

- Calcule un [`unitFactor`](components/Dashboard.tsx:402) en fonction du temps par unité
- Crée un objet [`processedData`](components/Dashboard.tsx:405) avec les données formatées
- Combine les données de l'entrée avec les données du robot sélectionné
- Met à jour l'état avec [`setRobotData(processedData)`](components/Dashboard.tsx:412) ou [`setRobotData(null)`](components/Dashboard.tsx:414) si aucune donnée n'est trouvée

#### Mise à jour des totaux mensuels (lignes 417-420) :
```typescript
setTotalCurrentMonth(currentMonthData[0] ? Number(currentMonthData[0]['NB UNITES DEPUIS DEBUT DU MOIS']) : 0);
setTotalPrevMonth1(prevMonth1Data[0] ? Number(prevMonth1Data[0]['NB UNITES DEPUIS DEBUT DU MOIS']) : 0);
setTotalPrevMonth2(prevMonth2Data[0] ? Number(prevMonth2Data[0]['NB UNITES DEPUIS DEBUT DU MOIS']) : 0);
setTotalPrevMonth3(prevMonth3Data[0] ? Number(prevMonth3Data[0]['NB UNITES DEPUIS DEBUT DU MOIS']) : 0);
```

- Extrait et met à jour les totaux pour chaque mois à partir des données filtrées
- Utilise l'opérateur ternaire pour gérer les cas où les données pourraient être undefined
- Convertit les valeurs en nombres pour les calculs ultérieurs

## 3. Techniques et patterns importants

### Séparation des responsabilités
- Le code est clairement divisé en deux modes de fonctionnement distincts (TOUT vs robot individuel)
- Chaque mode a sa propre logique de traitement des données
- Les états sont utilisés pour contrôler l'affichage des différents composants (Chart vs Chart4All)

### Gestion des états
- Utilisation intensive des setters pour mettre à jour l'état du composant
- Les états sont utilisés pour contrôler l'affichage des différents composants
- Les données sont préparées spécifiquement pour chaque composant destinataire

### Traitement de données
- Utilisation de filtres et de maps pour transformer les données brutes
- Agrégation de données provenant de plusieurs sources
- Gestion des types de données différents (temps vs unités)
- Utilisation de l'opérateur spread (...) pour copier et étendre des objets

### Gestion des dates
- Calcul dynamique des périodes d'affichage
- Gestion des décalages de mois et d'année
- Formatage des clés de date avec [`padStart`](components/Dashboard.tsx:279)
- Création de clés de date au format "JJ/MM/AAAA" pour l'accès aux données

### Optimisation
- Utilisation de données cachées ([`cachedReportingData`](components/Dashboard.tsx:372)) pour éviter des appels inutiles
- Calculs conditionnels en fonction du type de robot
- Utilisation de Set pour un filtrage efficace des IDs de programmes
- Traitement par lots des données pour minimiser les mises à jour d'état

### Gestion des erreurs et cas limites
- Vérification de l'existence des données avant traitement ([`if (robotEntry)`](components/Dashboard.tsx:401))
- Gestion des valeurs nulles ou indéfinies avec l'opérateur || (ex: `Number(entry['NB UNITES DEPUIS DEBUT DU MOIS']) || 0`)
- Fourniture de valeurs par défaut pour les cas où aucune donnée n'est trouvée

### Patterns de conception
- **Pattern Strategy** : Deux stratégies distinctes pour le traitement des données selon le mode sélectionné
- **Pattern Observer** : Le hook useEffect observe les changements de selectedRobotData et selectedMonth
- **Pattern Data Mapper** : Transformation des données brutes en format adapté à l'affichage
- **Pattern Cache** : Utilisation de données en cache pour optimiser les performances

Cette fonction représente le cœur de la logique de traitement des données pour le tableau de bord, permettant d'afficher des statistiques et graphiques soit pour un robot spécifique, soit pour l'ensemble des robots selon la sélection de l'utilisateur.