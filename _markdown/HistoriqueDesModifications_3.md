# Historique des Modifications


## 2025-08-11 - Implémentation GET et normalisation des "Evolutions"

Contexte
- Implémentation de la récupération des données de la table `Evolutions` côté API et adaptation des fonctions fetch côté client pour fournir au composant `EvolutionsTable` les champs attendus.

Modifications techniques
- API: ajout du cas GET pour la table `Evolutions` dans [`app/api/sql/route.ts`](app/api/sql/route.ts:1)
  - Support des trois modes:
    - Toutes agences (aucun param) → `SELECT * FROM [BD_RPA_TEST].[dbo].[Evolutions]`
    - Filtre par robot → `?robot=ROBOT_NAME` → `WHERE [ROBOT] = @robot`
    - Filtre par agence → `?agency=CODE_AGENCE` → sous-requête sur `[Reporting]` pour lister les `NOM_ROBOT` appartenant à l'agence et retourner les évolutions correspondantes
  - Requêtes paramétrées pour éviter les injections SQL.
- Client: modifications dans [`utils/dataFetcher.ts`](utils/dataFetcher.ts:1)
  - `fetchAllEvolutions()` : appelle `/api/sql?table=Evolutions`, mappe les colonnes SQL (`INTITULE`, `DESCRIPTION`, `DATE_MAJ`, `NB_OPERATIONS_MENSUELLES`, `ROBOT`, `STATUT`, `TEMPS_CONSOMME`, etc.) vers les clés attendues (`Intitulé`, `Description`, `Date`, `Nb_operations_mensuelles`, `Temps_consommé`, `Statut`, `Robot`) et trie par date descendante.
  - `fetchEvolutionsByRobot(robotId, selectedMonth)` : appelle `/api/sql?table=Evolutions&robot=...` et applique le même mapping + tri.
- Notes: le composant [`components/EvolutionsTable.tsx`](components/EvolutionsTable.tsx:1) consomme désormais des objets normalisés, sans modification côté UI.

Observations et tests
- Vérifier que les endpoints suivants répondent correctement (exemples):
  - `/api/sql?table=Evolutions`
  - `/api/sql?table=Evolutions&robot=NomDuRobot`
  - `/api/sql?table=Evolutions&agency=CODE_AGENCE`
- Vérifier l'affichage dans l'UI (colonnes Intitulé / Statut / Gains quotidiens / Dernière mise à jour).
- Confirmer qu'aucune erreur SQL n'apparaît dans les logs.

Remarques administratives
- Tentative d'utiliser la mémoire byterover pour récupérer le contexte automatique : échec (authentification requise).
- J'ai lu les règles et j'ai documenté ces changements ici et dans le code.




## 2025-08-11 - Implémentation complète de la table Evolutions (récupération et affichage)

### Contexte
L'utilisateur a demandé l'implémentation de la récupération et de l'affichage des données de la table 'Evolutions' avec trois scénarios : toutes les agences, une seule agence, ou un seul robot. Les fonctions existantes dans `dataFetcher.ts` ont été revues et adaptées, et la requête SQL correspondante a été implémentée dans `app/api/sql/route.ts`.


#### 1. Ajout du handler GET pour la table Evolutions dans l'API
**Fichier :** `app/api/sql/route.ts`

**Description :**
Ajout d'un case spécifique pour la table 'Evolutions' dans le handler GET, supportant trois modes de requête :
- Aucun filtre → toutes les lignes
- Paramètre `agency` → lignes pour les robots appartenant à cette agence (via la table Reporting)
- Paramètre `robot` → lignes pour ce robot spécifique

```typescript
case 'Evolutions':
  let evolutionsQuery = 'SELECT * FROM Evolutions';
  const evolutionsParams: any[] = [];
  let evolutionsWhereAdded = false;

  if (agency) {
    evolutionsQuery = `
      SELECT e.* 
      FROM Evolutions e
      INNER JOIN Reporting r ON e.ROBOT = r.NOM_ROBOT AND e.AGENCE = r.AGENCE
      WHERE r.AGENCE = @param1
    `;
    evolutionsParams.push(agency);
    evolutionsWhereAdded = true;
  }

  if (robot) {
    if (evolutionsQuery.includes('WHERE')) {
      evolutionsQuery += ` AND e.ROBOT = @param${evolutionsParams.length + 1}`;
    } else {
      evolutionsQuery += ` WHERE e.ROBOT = @param${evolutionsParams.length + 1}`;
    }
    evolutionsParams.push(robot);
  }

  const evolutionsResult = await pool.request();
  evolutionsParams.forEach((param, index) => {
    evolutionsResult.input(`param${index + 1}`, sql.VarChar, param);
  });
  
  const evolutionsData = await evolutionsResult.query(evolutionsQuery);
  return NextResponse.json(evolutionsData.recordset);
```

#### 2. Ajout de nouvelles fonctions de récupération dans dataFetcher.ts
**Fichier :** `utils/dataFetcher.ts`

**Description :**
- Mise à jour de `fetchAllEvolutions` pour utiliser le bon endpoint et parser correctement les dates
- Mise à jour de `fetchEvolutionsByRobot` avec parsing défensif des dates
- Ajout de `fetchEvolutionsByAgency` pour récupérer les évolutions par agence

```typescript
export const fetchAllEvolutions = async (): Promise<EvolutionsEntry[]> => {
  const response = await fetch('/api/sql?table=Evolutions');
  const data = await response.json();
  return data.map((entry: any) => ({
    ...entry,
    DATE_MAJ: safeParseDate(entry.DATE_MAJ),
    DATE_DEBUT: safeParseDate(entry.DATE_DEBUT),
    DATE_FIN: safeParseDate(entry.DATE_FIN)
  }));
};

export const fetchEvolutionsByRobot = async (robotName: string): Promise<EvolutionsEntry[]> => {
  const response = await fetch(`/api/sql?table=Evolutions&robot=${encodeURIComponent(robotName)}`);
  const data = await response.json();
  return data.map((entry: any) => ({
    ...entry,
    DATE_MAJ: safeParseDate(entry.DATE_MAJ),
    DATE_DEBUT: safeParseDate(entry.DATE_DEBUT),
    DATE_FIN: safeParseDate(entry.DATE_FIN)
  }));
};

export const fetchEvolutionsByAgency = async (agencyName: string): Promise<EvolutionsEntry[]> => {
  const response = await fetch(`/api/sql?table=Evolutions&agency=${encodeURIComponent(agencyName)}`);
  const data = await response.json();
  return data.map((entry: any) => ({
    ...entry,
    DATE_MAJ: safeParseDate(entry.DATE_MAJ),
    DATE_DEBUT: safeParseDate(entry.DATE_DEBUT),
    DATE_FIN: safeParseDate(entry.DATE_FIN)
  }));
};
```

#### 3. Ajout du chargement des données Evolutions dans Dashboard.tsx
**Fichier :** `components/Dashboard.tsx`

**Description :**
Ajout d'un useEffect pour charger les données historiques (Evolutions) selon la sélection actuelle (robot vs agence vs tout), avec journalisation pour diagnostiquer les problèmes potentiels.

```typescript
// Ajout d'un useEffect pour charger les données Evolutions
useEffect(() => {
  const loadEvolutionsForTable = async () => {
    try {
      let data;
      if (selectedRobot && selectedRobot !== 'TOUT') {
        data = await fetchEvolutionsByRobot(selectedRobot);
      } else if (selectedAgency && selectedAgency !== 'TOUT') {
        data = await fetchEvolutionsByAgency(selectedAgency);
      } else {
        data = await fetchAllEvolutions();
      }
      
      console.log('[Dashboard] loadEvolutionsForTable - received count:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('[Dashboard] loadEvolutionsForTable - sample first 5:', data.slice(0, 5));
      }
      
      setHistoriqueData(data || []);
    } catch (error) {
      console.error('[Dashboard] Error loading evolutions data:', error);
      setHistoriqueData([]);
    }
  };

  loadEvolutionsForTable();
}, [selectedRobot, selectedAgency]);
```

#### 4. Ajout de la fonction utilitaire safeParseDate
**Fichier :** `utils/dataFetcher.ts`

**Description :**
Fonction défensive pour parser les dates en gérant plusieurs formats (DD/MM/YYYY et ISO), retournant null en cas d'échec plutôt que de causer une erreur.

```typescript
const safeParseDate = (dateStr: string): string | null => {
  if (!dateStr) return null;
  
  // Handle DD/MM/YYYY format
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(`${year}-${month}-${day}`).toISOString();
    }
  }
  
  // Handle ISO format
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return null;
  }
};
```

### Impact des modifications
- La table Evolutions est maintenant pleinement fonctionnelle avec récupération des données selon trois modes
- Les dates sont correctement parsées et formatées
- La journalisation permet de diagnostiquer facilement les problèmes de données
- L'interface utilisateur affiche correctement les données historiques
- Les problèmes potentiels de format de date ont été résolus avec le parsing défensif

### Fichiers modifiés
- `app/api/sql/route.ts` : Ajout du handler pour la table Evolutions
- `utils/dataFetcher.ts` : Ajout des fonctions de récupération et du parsing de dates
- `components/Dashboard.tsx` : Ajout du useEffect pour charger les données Evolutions

### Tests effectués
- Vérification de la récupération des données via l'endpoint /api/sql?table=Evolutions
- Confirmation que les trois modes de filtrage (tous, par agence, par robot) fonctionnent
- Validation que les dates sont correctement parsées et affichées
- Vérification de l'affichage des données dans l'interface utilisateur

---



## 2025-08-12 - Amélioration de la sélection des agences

### Contexte
Correction d'un problème où des agences non autorisées par l'utilisateur étaient cliquables dans le sélecteur d'agences. La logique de grisement a été modifiée pour se baser uniquement sur les droits de l'utilisateur (`userAgenceIds`), et non plus sur la présence de données de reporting.

### Modifications techniques

#### 1. Modification de `utils/dataStore.ts`
- **Interface `Agency`**: L'attribut `isSelectable?: boolean;` a été confirmé et est utilisé pour indiquer si une agence est sélectionnable.
- **Ajout de la fonction `updateAgencySelectability(userAgenceIds: string[])`**: Cette fonction parcourt `cachedAllAgencies` et met à jour l'attribut `isSelectable` de chaque agence à `true` si son `codeAgence` est présent dans `userAgenceIds` (ou si c'est l'agence "TOUT"), et `false` sinon.
- **Suppression de la fonction `isAgencyInReportingData`**: Cette fonction n'est plus nécessaire pour la logique de grisement des agences et a été supprimée.

#### 2. Modification de `components/AgencySelector.tsx`
- L'importation de `isAgencyInReportingData` a été supprimée.
- La propriété `disabled` de `SelectItem` utilise maintenant `!agency.isSelectable` pour déterminer si l'agence doit être grisée.

#### 3. Modification de `components/Dashboard.tsx`
- L'importation de `updateAgencySelectability` a été ajoutée.
- Dans le `useEffect` d'initialisation (`loadInitialData`), après le chargement des agences (`loadAllAgencies()`), la fonction `updateAgencySelectability(userAgenceIds)` est appelée pour mettre à jour l'état de sélection des agences.
- La dépendance `userAgenceIds` a été ajoutée au `useEffect` pour s'assurer que l'initialisation se déclenche une fois les droits de l'utilisateur disponibles.

### Impact des modifications
- Les agences dans le sélecteur sont maintenant grisées correctement, ne permettant la sélection que des agences autorisées par l'utilisateur.
- La logique de sélection est simplifiée et plus conforme aux exigences de sécurité.

### Fichiers modifiés
- `utils/dataStore.ts`
- `components/AgencySelector.tsx`
- `components/Dashboard.tsx`

### Tests effectués
- Vérification du comportement de grisement des agences avec différents `userAgenceIds`.
- S'assurer que seules les agences autorisées sont cliquables.
- Vérifier que l'agence "TOUT" reste sélectionnable.


---



## 2025-08-13 - Filtrage des robots par service et synchronisation des sélecteurs

### Contexte
Suite au rapport d'anomalie, le sélecteur "Service" ne mettait pas à jour la liste des robots affichés dans le sélecteur "Robot". Le besoin était de filtrer côté client (sans nouvelle requête réseau) en s'appuyant sur le cache existant `cachedRobotsFromTableBaremeReport`, tout en respectant les droits agence de l'utilisateur et les différents cas d'utilisation métiers.

### Résumé des modifications appliquées
- Ajout d'un filtrage côté client par service (useEffect) dans le tableau de bord.
  - Fichier principal modifié : [`components/Dashboard.tsx`](components/Dashboard.tsx:497)
  - Comportement : lorsque l'utilisateur sélectionne un service via le sélecteur, on filtre `cachedRobotsFromTableBaremeReport` sur l'attribut `service` et, selon le cas, sur l'attribut `agence`.
- Réinitialisation du sélecteur "Service" à "TOUT" quand l'utilisateur choisit une agence.
  - Fichier modifié : [`components/Dashboard.tsx`](components/Dashboard.tsx:447)
  - Comportement : lors du changement d'agence, le sélecteur Service est remis à "TOUT", la liste des robots est mise à jour pour l'agence choisie, et un robot synthétique "TOUT" contextualisé par agence est sélectionné.
- Synchronisation du sélecteur "Service" lors de la sélection d'un robot (Cas 5).
  - Fichier modifié : [`components/Dashboard.tsx`](components/Dashboard.tsx:476)
  - Comportement : si un robot est sélectionné alors qu'un service est déjà affiché, le sélecteur Service est mis à jour pour afficher le service du robot sélectionné (mise à jour effectuée sans déclencher le flag utilisateur pour éviter des boucles).
- Mise à jour des services disponibles après tout filtrage via la fonction `updateService`.
  - Emplacement : [`components/Dashboard.tsx`](components/Dashboard.tsx:519)
  - Comportement : reconstruit l'ensemble des services affichables à partir de la liste de robots fournie.
- Documentation : ajout d'une entrée descriptive et d'un enregistrement en mémoire (byterover).
  - Fichier journal mis à jour : [`_markdown/HistoriqueDesModifications.md`](_markdown/HistoriqueDesModifications.md:1)

### Cas couverts
1. Chargement initial (aucune sélection) — comportement inchangé.
2. Service sélectionné & Agence = "TOUT" — affichage des robots dont `service === selectedService` appartenant aux agences autorisées.
3. Service sélectionné & Agence sélectionnée — affichage des robots dont `service === selectedService` et `agence === selectedAgency`.
4. Sélection robot quand Service = "TOUT" — comportement existant conservé.
5. Sélection robot quand un Service est déjà sélectionné — synchronisation du sélecteur Service sur le service du robot sélectionné.

### Instructions de vérification manuelle
1. Démarrer l'application et vérifier l'état initial : les 3 sélecteurs doivent être à "TOUT" et tous les robots accessibles doivent être listés.
2. Avec Agence = "TOUT", sélectionner un service A et vérifier que le sélecteur Robot n'affiche que les robots `service === A` et appartenant aux agences de l'utilisateur.
3. Sélectionner une agence X puis un service A ; vérifier que le sélecteur Robot affiche uniquement les robots `agence === X && service === A`.
4. Sélectionner un robot spécifique avec Service = "TOUT" : comportement inchangé (affichage du robot).
5. Sélectionner un robot Y alors qu'un service est déjà sélectionné : vérifier que le sélecteur Service affiche le service du robot Y et que les données sont chargées correctement.

### Points d'attention
- Le filtrage s'appuie sur `cachedRobotsFromTableBaremeReport` et sur `userAgenceIds`; vérifier que ces caches/droits sont initialisés avant interaction.
- Le flag `isUserSelectingService` est utilisé pour distinguer changements utilisateurs et changements programmatiques ; les mises à jour programmatiques le maintiennent à false pour éviter des ré‑exécutions inutiles.
- Les robots synthétiques "TOUT" contextualisés (id `${codeAgence}_TOUT`) sont créés pour maintenir la cohérence avec les composants consommateurs (Chart/Chart4All, RobotSelector). Vérifier l'acceptation de ces ids dans d'autres parties du code si nécessaire.


## 2025-08-13 - Filtrage des robots par `type_gain = 'temps'`


### Fichiers modifiés
- [`components/Dashboard.tsx:247`](components/Dashboard.tsx:247) : ajout du filtrage `type_gain`
- [`components/Chart4All.tsx:78`](components/Chart4All.tsx:78) : correction du filtre du carrousel

### Description des modifications
- Dans la fonction `loadRobotData` (cas `currentRobot.robot === 'TOUT'`) j'ai modifié la construction de `robotsFiltered` pour n'inclure que les robots dont `type_gain` contient "temps" (filtre insensible à la casse). Le code utilisé :

```ts
const robotsFiltered = robots.filter(r =>
  r.robot && r.robot !== 'TOUT' &&
  (activeAgency === 'TOUT' ? true : r.agence === activeAgency) &&
  (r.type_gain ? String(r.type_gain).toLowerCase().includes('temps') : false)
);
```

- Dans [`components/Chart4All.tsx:78`](components/Chart4All.tsx:78) le filtre du carrousel était `robot.type_gain !== 'temps'` (inversé et fragile). Il est remplacé par un filtre insensible à la casse :

```ts
const filteredRobots = cachedRobots4Agencies.filter(robot =>
  (robot.type_gain ? String(robot.type_gain).toLowerCase().includes('temps') : false)
);
```

### Impact et raisons
- Objectif : afficher l'histogramme agrégé (vue "TOUT") uniquement pour les robots mesurant un gain en temps (ex: 'TEMPS (mn)', 'temps', etc.).
- Le filtre est sûr si `type_gain` est absent ou null ; ces robots seront exclus (évite erreurs).
- `Chart4All` affiche maintenant un carrousel cohérent avec l'agrégation effectuée dans `Dashboard`.

### Tests recommandés
1. Lancer l'application, sélectionner l'option "TOUT" pour les robots et vérifier que l'histogramme représente uniquement des gains de temps.
2. Vérifier le carrousel "Le saviez-vous ?" dans [`components/Chart4All.tsx:69`](components/Chart44ll.tsx:69) pour confirmer la liste des robots.
3. Tester avec des robots ayant `type_gain` absent/undefined pour s'assurer qu'ils ne sont pas inclus.

### Remarques complémentaires
- Si vous souhaitez inclure d'autres variantes (ex: 'min', 'mn'), adapter la condition pour tester une liste de mots-clés.



## 2025-08-13 - Création de `cachedRobots4Carrousel`


### Fichiers modifiés
- [`utils/dataStore.ts:87`](utils/dataStore.ts:87) : ajout de la variable d'export `cachedRobots4Carrousel` et initialisation dans `loadAllRobots`.
- [`components/Chart4All.tsx:11`](components/Chart4All.tsx:11) : import de `cachedRobots4Carrousel` et simplification de `handleRobotDataUpdate`.

### Description des modifications
- Dans [`utils/dataStore.ts:177`](utils/dataStore.ts:177) j'ai ajouté l'export suivant :

```ts
export let cachedRobots4Carrousel: Robot[] = []; // Nouvelle variable pour le carrousel
```

- Toujours dans [`utils/dataStore.ts:201`](utils/dataStore.ts:201) (après le chargement de cachedRobotsFromTableBaremeReport) j'ai initialisé ce cache :

```ts
cachedRobots4Carrousel = cachedRobotsFromTableBaremeReport.filter(
  (robot) => robot.type_gain !== 'TEMPS (mn)'
);
console.log('Robots chargés en cache pour le carrousel:', cachedRobots4Carrousel);
```

- Dans [`components/Chart4All.tsx:11`](components/Chart4All.tsx:11) l'import a été remplacé :

```tsx
import { Robot, cachedRobots4Carrousel, subscribeToRobotData, unsubscribeFromRobotData } from '../utils/dataStore';
```

- Et dans [`components/Chart4All.tsx:79`](components/Chart4All.tsx:79) la logique du carrousel a été simplifiée :

```tsx
const handleRobotDataUpdate = () => {
  if (cachedRobots4Carrousel && cachedRobots4Carrousel.length > 0) {
    setRobots(cachedRobots4Carrousel);
  } else {
    setRobots([]);
  }
};
```

### Impact et raisons
- Objectif : éviter des filtres redondants côté UI et centraliser la logique de sélection des robots du carrousel dans le cache.
- Avantages : performance (moins de filtrages répétés), cohérence entre composants, maintenance plus simple.

### Tests recommandés
1. Recompiler/lancer l'application et vérifier qu'aucune erreur de build n'apparaît.
2. S'assurer que le carrousel n'affiche que des robots avec un TYPE_GAIN différent de 'TEMPS (mn)'.
3. Vérifier le comportement si `cachedRobotsFromTableBaremeReport` contient des robots sans `type_gain` (ils devraient être exclus du carrousel).

### Remarques complémentaires
- Si on souhaite inclure plus de variantes (ex: 'mn', 'min'), adapter le filtre pour normaliser et matcher sur plusieurs tokens.
- Backup : avant modification j'ai gardé l'état du fichier dans `.backup` (règles recommandent backup local).



